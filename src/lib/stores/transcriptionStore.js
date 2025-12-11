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

	return {
		subscribe,

		// Initialize connection with a temporary key
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
				// 1. Get temp key from our server
				console.log('[Deepgram] Fetching temporary key...');
				const response = await fetch('/api/deepgram/token');
				const data = await response.json();

				if (!data.key) {
					throw new Error(data.error || 'Failed to get Deepgram token');
				}
				console.log('[Deepgram] Got temporary key');

				// 2. Connect via raw WebSocket using Sec-WebSocket-Protocol for auth
				// This is Deepgram's recommended approach for browser connections
				const wsUrl = `wss://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&interim_results=true&punctuate=true`;
				
				console.log('[Deepgram] Opening WebSocket connection with protocol auth...');
				// Pass 'token' and API key as subprotocols - Deepgram uses this for browser auth
				socket = new WebSocket(wsUrl, ['token', data.key]);

				socket.onopen = () => {
					console.log('[Deepgram] ✅ WebSocket opened - flushing buffered audio');
					isConnectionOpen = true;
					update((s) => ({ ...s, connected: true, connecting: false }));
					
					// Flush any buffered audio chunks
					if (audioBuffer.length > 0) {
						console.log(`[Deepgram] Flushing ${audioBuffer.length} buffered chunks`);
						audioBuffer.forEach((chunk) => {
							socket.send(chunk);
						});
						audioBuffer = [];
					}
				};

				socket.onclose = (event) => {
					console.log('[Deepgram] WebSocket closed:', event.code, event.reason);
					isConnectionOpen = false;
					update((s) => ({ ...s, connected: false, connecting: false }));
				};

				socket.onerror = (error) => {
					console.error('[Deepgram] ❌ WebSocket error:', error);
					update((s) => ({ ...s, error: 'WebSocket error', connecting: false }));
				};

				socket.onmessage = (event) => {
					try {
						const data = JSON.parse(event.data);
						console.log('[Deepgram] 📨 Message received:', data.type, data);
						
						if (data.type === 'Results') {
							const received = data.channel?.alternatives?.[0]?.transcript;
							if (received && data.is_final) {
								console.log('[Deepgram] ✅ Final transcript:', received);
								update((s) => ({
									...s,
									transcript: s.transcript + (s.transcript ? ' ' : '') + received,
									interim: ''
								}));
							} else if (received) {
								console.log('[Deepgram] ⏳ Interim transcript:', received);
								update((s) => ({ ...s, interim: received }));
							}
						} else if (data.type === 'Metadata') {
							console.log('[Deepgram] 📊 Metadata:', data);
						} else if (data.type === 'SpeechStarted') {
							console.log('[Deepgram] 🎤 Speech started');
						} else if (data.type === 'UtteranceEnd') {
							console.log('[Deepgram] 🔚 Utterance end');
						} else {
							console.log('[Deepgram] ⚠️ Unknown message type:', data.type);
						}
					} catch (e) {
						console.error('[Deepgram] Failed to parse message:', e, event.data);
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
				console.log('[Deepgram] Sending audio chunk:', data.size, 'bytes');
				socket.send(data);
			} else if (socket) {
				// Buffer the chunk until connection is ready
				console.log('[Deepgram] Buffering audio chunk:', data.size, 'bytes (connection not ready)');
				audioBuffer.push(data);
			} else {
				console.warn('[Deepgram] Cannot send - no connection');
			}
		},

		// Close connection
		disconnect: () => {
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
		}
	};
}

export const transcriptionStore = createTranscriptionStore();
