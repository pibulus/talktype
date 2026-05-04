import { writable } from 'svelte/store';

function createTranscriptionStore() {
	const { subscribe, set, update } = writable({
		connected: false,
		connecting: false,
		error: null,
		transcript: '', // Finalized transcript
		interim: '' // Current interim result
	});

	let socket = null;
	let audioBuffer = []; // Buffer chunks until connection is open
	let isConnectionOpen = false;
	let isConnecting = false;
	let keepAliveInterval = null;
	let connectionId = 0;

	function clearKeepAlive() {
		if (keepAliveInterval) {
			clearInterval(keepAliveInterval);
			keepAliveInterval = null;
		}
	}

	function closeActiveSocket(reason) {
		clearKeepAlive();
		connectionId += 1;

		const socketToClose = socket;
		socket = null;

		if (!socketToClose) return;

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

				// 2. Connect via raw WebSocket using Sec-WebSocket-Protocol auth
				// Using 'flux' model for ultra-low latency conversational AI
				// and 'utterance_end_ms' for smart turn detection
				const params = new URLSearchParams({
					model: 'flux',
					smart_format: 'true',
					interim_results: 'true',
					punctuate: 'true',
					utterance_end_ms: '1000',
					vad_turn_delay_ms: '500'
				});
				const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;
				// Deepgram recommends short-lived tokens for client-side realtime connections.
				const activeSocket = new WebSocket(wsUrl, ['token', data.token]);
				socket = activeSocket;

				const isCurrentSocket = () =>
					socket === activeSocket && connectionId === currentConnectionId;

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
						audioBuffer.forEach((chunk) => {
							activeSocket.send(chunk);
						});
						audioBuffer = [];
					}

					// Start keep-alive to prevent NET-0001 timeout (10s without data)
					clearKeepAlive();
					keepAliveInterval = setInterval(() => {
						if (isCurrentSocket() && activeSocket.readyState === WebSocket.OPEN) {
							activeSocket.send(JSON.stringify({ type: 'KeepAlive' }));
						}
					}, 5000);
				};

				activeSocket.onclose = () => {
					if (!isCurrentSocket()) return;

					isConnectionOpen = false;
					isConnecting = false;
					socket = null;
					clearKeepAlive();
					update((s) => ({ ...s, connected: false, connecting: false }));
				};

				activeSocket.onerror = (error) => {
					if (!isCurrentSocket()) return;

					console.error('[Deepgram] WebSocket error:', error);
					isConnecting = false;
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
									transcript: s.transcript + (s.transcript ? ' ' : '') + received,
									interim: ''
								}));
							} else if (received) {
								update((s) => ({ ...s, interim: received }));
							}
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
			}
			// Silently ignore if no connection
		},

		// Close connection
		disconnect: () => {
			closeActiveSocket('Done recording');
			isConnectionOpen = false;
			isConnecting = false;
			audioBuffer = [];
			update((s) => ({ ...s, connected: false, interim: '' }));
		},

		// Reset transcript
		reset: () => {
			set({
				connected: false,
				connecting: false,
				error: null,
				transcript: '',
				interim: ''
			});
			audioBuffer = [];
		},

		// Get current transcript value (for checking if live mode captured anything)
		getTranscript: () => {
			let current;
			subscribe((s) => (current = s))();
			return current?.transcript || '';
		}
	};
}

export const transcriptionStore = createTranscriptionStore();
