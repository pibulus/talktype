import { writable } from 'svelte/store';

const DEEPGRAM_LIVE_URL = 'wss://api.deepgram.com/v1/listen';
export const DEEPGRAM_TOKEN_PROTOCOL = 'bearer';
const DEFAULT_FINISH_GRACE_MS = 2200;
const MAX_BUFFERED_AUDIO_CHUNKS = 120;

export function buildDeepgramLiveUrl() {
	const params = new URLSearchParams({
		model: 'nova-3',
		language: 'en-US',
		smart_format: 'true',
		interim_results: 'true',
		punctuate: 'true',
		endpointing: '300',
		utterance_end_ms: '1000',
		vad_events: 'true'
	});

	return `${DEEPGRAM_LIVE_URL}?${params.toString()}`;
}

export function appendFinalTranscript(currentTranscript, nextTranscript) {
	const cleanNext = (nextTranscript || '').trim();
	if (!cleanNext) return currentTranscript || '';
	return [currentTranscript, cleanNext].filter(Boolean).join(' ');
}

function createTranscriptionStore() {
	const { subscribe, set, update } = writable({
		connected: false,
		connecting: false,
		error: null,
		transcript: '', // Finalized transcript
		interim: '', // Current interim result
		lastFinalAt: null,
		lastMessageAt: null
	});

	let socket = null;
	let audioBuffer = []; // Buffer chunks until connection is open
	let isConnectionOpen = false;
	let isConnecting = false;
	let keepAliveInterval = null;
	let connectionId = 0;
	let pendingFinalize = null;

	function clearKeepAlive() {
		if (keepAliveInterval) {
			clearInterval(keepAliveInterval);
			keepAliveInterval = null;
		}
	}

	function resolvePendingFinalize(reason, candidateSocket = null) {
		const pending = pendingFinalize;
		if (!pending) return false;
		if (candidateSocket && pending.socket !== candidateSocket) return false;

		clearTimeout(pending.timeout);
		pendingFinalize = null;
		pending.resolve(reason);
		return true;
	}

	function waitForFinalizeResponse(socketToFinish, currentConnectionId, timeoutMs) {
		resolvePendingFinalize('superseded');

		return new Promise((resolve) => {
			const timeout = setTimeout(() => {
				resolvePendingFinalize('timeout', socketToFinish);
			}, timeoutMs);

			pendingFinalize = {
				socket: socketToFinish,
				connectionId: currentConnectionId,
				timeout,
				resolve,
				finalizeSent: false
			};
		});
	}

	function requestFinalize(socketToFinish) {
		if (
			!pendingFinalize ||
			pendingFinalize.socket !== socketToFinish ||
			pendingFinalize.connectionId !== connectionId ||
			pendingFinalize.finalizeSent ||
			socketToFinish?.readyState !== WebSocket.OPEN
		) {
			return false;
		}

		try {
			socketToFinish.send(JSON.stringify({ type: 'Finalize' }));
			pendingFinalize.finalizeSent = true;
			return true;
		} catch (error) {
			console.warn('[Deepgram] Failed to request final live transcript:', error);
			resolvePendingFinalize('finalize-send-failed', socketToFinish);
			return false;
		}
	}

	function closeActiveSocket(reason) {
		clearKeepAlive();
		connectionId += 1;

		const socketToClose = socket;
		socket = null;

		if (!socketToClose) return;

		resolvePendingFinalize('socket-closing', socketToClose);

		socketToClose.onopen = null;
		socketToClose.onmessage = null;
		socketToClose.onerror = null;
		socketToClose.onclose = null;

		if (
			socketToClose.readyState === WebSocket.OPEN ||
			socketToClose.readyState === WebSocket.CONNECTING
		) {
			socketToClose.close(1000, reason);
		}
	}

	function getSnapshot() {
		let current;
		subscribe((state) => {
			current = state;
		})();
		return current || {};
	}

	function buildResult(state) {
		const finalText = (state.transcript || '').trim();
		const interimText = (state.interim || '').trim();
		const text = [finalText, interimText].filter(Boolean).join(' ').trim();

		return {
			text,
			finalText,
			interimText,
			hasFinal: finalText.length > 0,
			usedInterim: interimText.length > 0,
			error: state.error || null
		};
	}

	return {
		subscribe,

		// Initialize connection with short-lived Deepgram token
		connect: async () => {
			closeActiveSocket('Restarting live transcription');

			// Reset state before connecting
			update((s) => ({
				...s,
				connecting: true,
				error: null,
				transcript: '',
				interim: ''
			}));
			audioBuffer = [];
			isConnectionOpen = false;
			isConnecting = true;
			const currentConnectionId = connectionId;

			try {
				// 1. Get a short-lived Deepgram token from our server
				const response = await fetch('/api/deepgram/token');
				const data = await response.json();

				if (!data.token) {
					throw new Error(data.error || 'Failed to get Deepgram token');
				}

				if (connectionId !== currentConnectionId || !isConnecting) {
					return;
				}

				// 2. Connect via raw WebSocket using Sec-WebSocket-Protocol auth.
				// Nova-3 on /v1/listen is the best fit for continuous dictation:
				// it supports interim results, smart formatting, and endpointing.
				const wsUrl = buildDeepgramLiveUrl();
				// Deepgram recommends short-lived tokens for client-side realtime connections.
				const activeSocket = new WebSocket(wsUrl, [DEEPGRAM_TOKEN_PROTOCOL, data.token]);
				socket = activeSocket;

				const isCurrentSocket = () =>
					socket === activeSocket && connectionId === currentConnectionId;
				const failCurrentSocket = (message, error) => {
					if (!isCurrentSocket()) return;

					console.warn('[Deepgram] Socket send failed:', error);
					isConnectionOpen = false;
					isConnecting = false;
					audioBuffer = [];
					closeActiveSocket(message);
					update((s) => ({
						...s,
						connected: false,
						connecting: false,
						error: message
					}));
				};

				activeSocket.onopen = () => {
					if (!isCurrentSocket()) {
						activeSocket.close(1000, 'Stale live transcription socket');
						return;
					}

					console.log('[Deepgram] Connected');
					isConnectionOpen = true;
					isConnecting = false;
					update((s) => ({ ...s, connected: true, connecting: false }));

					// Flush any buffered audio chunks
					if (audioBuffer.length > 0) {
						for (const chunk of audioBuffer) {
							try {
								activeSocket.send(chunk);
							} catch (error) {
								failCurrentSocket('Live transcription connection dropped', error);
								return;
							}
						}
						audioBuffer = [];
					}

					requestFinalize(activeSocket);

					// Start keep-alive to prevent NET-0001 timeout (10s without data)
					clearKeepAlive();
					keepAliveInterval = setInterval(() => {
						if (isCurrentSocket() && activeSocket.readyState === WebSocket.OPEN) {
							try {
								activeSocket.send(JSON.stringify({ type: 'KeepAlive' }));
							} catch (error) {
								failCurrentSocket('Live transcription connection dropped', error);
							}
						}
					}, 5000);
				};

				activeSocket.onclose = () => {
					if (!isCurrentSocket()) return;

					isConnectionOpen = false;
					isConnecting = false;
					socket = null;
					clearKeepAlive();
					resolvePendingFinalize('socket-closed', activeSocket);
					update((s) => ({ ...s, connected: false, connecting: false }));
				};

				activeSocket.onerror = (error) => {
					if (!isCurrentSocket()) return;

					console.error('[Deepgram] WebSocket error:', error);
					isConnecting = false;
					resolvePendingFinalize('socket-error', activeSocket);
					update((s) => ({ ...s, error: 'WebSocket error', connecting: false }));
				};

				activeSocket.onmessage = (event) => {
					if (!isCurrentSocket()) return;

					try {
						const data = JSON.parse(event.data);

						if (data.type === 'Results') {
							const received = data.channel?.alternatives?.[0]?.transcript;
							if (received && data.is_final) {
								update((s) => ({
									...s,
									transcript: appendFinalTranscript(s.transcript, received),
									interim: '',
									lastFinalAt: Date.now(),
									lastMessageAt: Date.now()
								}));
							} else if (received) {
								update((s) => ({ ...s, interim: received, lastMessageAt: Date.now() }));
							}
						} else if (data.type === 'Error') {
							const message =
								data.description || data.message || 'Deepgram live transcription error';
							console.error('[Deepgram] Error message:', data);
							resolvePendingFinalize('deepgram-error', activeSocket);
							update((s) => ({ ...s, error: message, lastMessageAt: Date.now() }));
						}
						if (data.from_finalize === true) {
							resolvePendingFinalize('finalized', activeSocket);
						}
						// Silently ignore Metadata, SpeechStarted, UtteranceEnd
					} catch (e) {
						console.error('[Deepgram] Failed to parse message:', e);
					}
				};
			} catch (err) {
				if (connectionId !== currentConnectionId) {
					return;
				}

				console.error('[Deepgram] Setup error:', err);
				isConnecting = false;
				audioBuffer = [];
				update((s) => ({ ...s, error: err.message, connecting: false }));
			}
		},

		// Send audio data
		send: (data) => {
			if (isConnectionOpen && socket && socket.readyState === WebSocket.OPEN) {
				socket.send(data);
			} else if (socket || isConnecting) {
				// Buffer the chunk until connection is ready
				audioBuffer.push(data);
				if (audioBuffer.length > MAX_BUFFERED_AUDIO_CHUNKS) {
					audioBuffer.shift();
				}
			}
			// Silently ignore if no connection
		},

		// Close connection
		disconnect: () => {
			closeActiveSocket('Done recording');
			isConnectionOpen = false;
			isConnecting = false;
			audioBuffer = [];
			update((s) => ({ ...s, connected: false, connecting: false, interim: '' }));
		},

		finish: async ({ graceMs = DEFAULT_FINISH_GRACE_MS } = {}) => {
			const socketToFinish = socket;
			const currentConnectionId = connectionId;

			if (
				socketToFinish?.readyState === WebSocket.OPEN ||
				socketToFinish?.readyState === WebSocket.CONNECTING
			) {
				const finalizeWait = waitForFinalizeResponse(socketToFinish, currentConnectionId, graceMs);
				requestFinalize(socketToFinish);
				const finalizeReason = await finalizeWait;
				const result = buildResult(getSnapshot());
				result.finalizeAcknowledged = finalizeReason === 'finalized';

				if (socketToFinish?.readyState === WebSocket.OPEN) {
					try {
						socketToFinish.send(JSON.stringify({ type: 'CloseStream' }));
					} catch {
						// The socket may already be closing after Finalize; closeActiveSocket handles cleanup.
					}
				}
				closeActiveSocket('Done recording');
				isConnectionOpen = false;
				isConnecting = false;
				audioBuffer = [];
				update((s) => ({ ...s, connected: false, connecting: false, interim: '' }));

				return result;
			}

			const result = buildResult(getSnapshot());
			result.finalizeAcknowledged = false;
			closeActiveSocket('Done recording');
			isConnectionOpen = false;
			isConnecting = false;
			audioBuffer = [];
			update((s) => ({ ...s, connected: false, connecting: false, interim: '' }));

			return result;
		},

		// Reset transcript
		reset: () => {
			set({
				connected: false,
				connecting: false,
				error: null,
				transcript: '',
				interim: '',
				lastFinalAt: null,
				lastMessageAt: null
			});
			audioBuffer = [];
		},

		// Get current transcript value (for checking if live mode captured anything)
		getTranscript: () => {
			let current;
			subscribe((s) => (current = s))();
			return current?.transcript || '';
		},

		getTranscriptSnapshot: () => buildResult(getSnapshot())
	};
}

export const transcriptionStore = createTranscriptionStore();
