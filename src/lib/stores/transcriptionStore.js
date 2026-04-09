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
	let keepAliveInterval = null;

	return {
		subscribe,

		// Initialize connection with short-lived Deepgram token
		connect: async () => {
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

			try {
				// 1. Get a short-lived Deepgram token from our server
				const response = await fetch('/api/deepgram/token');
				const data = await response.json();

				if (!data.token) {
					throw new Error(data.error || 'Failed to get Deepgram token');
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
				socket = new WebSocket(wsUrl, ['token', data.token]);

				socket.onopen = () => {
					console.log('[Deepgram] Connected');
					isConnectionOpen = true;
					update((s) => ({ ...s, connected: true, connecting: false }));
					
					// Flush any buffered audio chunks
					if (audioBuffer.length > 0) {
						audioBuffer.forEach((chunk) => {
							socket.send(chunk);
						});
						audioBuffer = [];
					}

					// Start keep-alive to prevent NET-0001 timeout (10s without data)
					keepAliveInterval = setInterval(() => {
						if (socket?.readyState === WebSocket.OPEN) {
							socket.send(JSON.stringify({ type: 'KeepAlive' }));
						}
					}, 5000);
				};

				socket.onclose = () => {
					isConnectionOpen = false;
					clearInterval(keepAliveInterval);
					update((s) => ({ ...s, connected: false, connecting: false }));
				};

				socket.onerror = (error) => {
					console.error('[Deepgram] WebSocket error:', error);
					update((s) => ({ ...s, error: 'WebSocket error', connecting: false }));
				};

				socket.onmessage = (event) => {
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
				console.error('[Deepgram] Setup error:', err);
				update((s) => ({ ...s, error: err.message, connecting: false }));
			}
		},

		// Send audio data
		send: (data) => {
			if (isConnectionOpen && socket && socket.readyState === WebSocket.OPEN) {
				socket.send(data);
			} else if (socket) {
				// Buffer the chunk until connection is ready
				audioBuffer.push(data);
			}
			// Silently ignore if no connection
		},

		// Close connection
		disconnect: () => {
			clearInterval(keepAliveInterval);
			if (socket) {
				// Send close frame to indicate we're done
				if (socket.readyState === WebSocket.OPEN) {
					socket.close(1000, 'Done recording');
				}
				socket = null;
			}
			isConnectionOpen = false;
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
