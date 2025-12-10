import { writable } from 'svelte/store';
import { createClient } from '@deepgram/sdk';

function createTranscriptionStore() {
	const { subscribe, set, update } = writable({
		connected: false,
		connecting: false,
		error: null,
		transcript: '', // Finalized transcript
		interim: '' // Current interim result
	});

	let deepgram = null;
	let connection = null;

	return {
		subscribe,
		
		// Initialize connection with a temporary key
		connect: async () => {
			update(s => ({ ...s, connecting: true, error: null }));
			
			try {
				// 1. Get temp key from our server
				const response = await fetch('/api/deepgram/token');
				const data = await response.json();
				
				if (!data.key) {
					throw new Error(data.error || 'Failed to get Deepgram token');
				}

				// 2. Initialize SDK with temp key
				deepgram = createClient(data.key);

				// 3. Connect to WebSocket
				connection = deepgram.listen.live({
					model: 'nova-3',
					smart_format: true,
					interim_results: true,
					punctuate: true,
					encoding: 'linear16',
					sample_rate: 16000 // We'll need to ensure we send this rate
				});

				// 4. Setup event listeners
				connection.on('open', () => {
					console.log('[Deepgram] Connection opened');
					update(s => ({ ...s, connected: true, connecting: false }));
				});

				connection.on('close', () => {
					console.log('[Deepgram] Connection closed');
					update(s => ({ ...s, connected: false, connecting: false }));
				});

				connection.on('error', (err) => {
					console.error('[Deepgram] Error:', err);
					update(s => ({ ...s, error: err.message, connecting: false }));
				});

				connection.on('transcriptReceived', (data) => {
					const received = data.channel.alternatives[0].transcript;
					if (received && data.is_final) {
						update(s => ({ 
							...s, 
							transcript: s.transcript + (s.transcript ? ' ' : '') + received,
							interim: '' 
						}));
					} else if (received) {
						update(s => ({ ...s, interim: received }));
					}
				});

			} catch (err) {
				console.error('[Deepgram] Setup error:', err);
				update(s => ({ ...s, error: err.message, connecting: false }));
			}
		},

		// Send audio data
		send: (data) => {
			if (connection && connection.getReadyState() === 1) { // 1 = OPEN
				connection.send(data);
			}
		},

		// Close connection
		disconnect: () => {
			if (connection) {
				connection.finish();
				connection = null;
			}
			update(s => ({ ...s, connected: false, interim: '' }));
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
