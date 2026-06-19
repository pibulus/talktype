import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	DEEPGRAM_TOKEN_PROTOCOL,
	appendFinalTranscript,
	buildDeepgramLiveUrl,
	transcriptionStore
} from './transcriptionStore.js';

describe('Deepgram live transcription configuration', () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		transcriptionStore.disconnect();
		transcriptionStore.reset();
	});

	it('uses Nova-3 streaming settings for continuous dictation', () => {
		const url = new URL(buildDeepgramLiveUrl());

		expect(url.origin + url.pathname).toBe('wss://api.deepgram.com/v1/listen');
		expect(url.searchParams.get('model')).toBe('nova-3');
		expect(url.searchParams.get('language')).toBe('en-US');
		expect(url.searchParams.get('interim_results')).toBe('true');
		// Dictation-tuned: longer endpointing so thinking pauses don't chop sentences.
		expect(url.searchParams.get('endpointing')).toBe('600');
		expect(url.searchParams.get('numerals')).toBe('true');
		expect(url.searchParams.get('filler_words')).toBe('false');
		expect(url.searchParams.has('vad_turn_delay_ms')).toBe(false);
		expect(url.searchParams.get('model')).not.toBe('flux');
	});

	it('uses bearer subprotocol for temporary Deepgram tokens', () => {
		expect(DEEPGRAM_TOKEN_PROTOCOL).toBe('bearer');
	});

	it('appends finalized segments without adding empty chunks', () => {
		expect(appendFinalTranscript('', 'Hello')).toBe('Hello');
		expect(appendFinalTranscript('Hello', 'world')).toBe('Hello world');
		expect(appendFinalTranscript('Hello', '   ')).toBe('Hello');
	});

	it('reconnects (does not error) when keep-alive fails mid-recording, preserving buffered audio', async () => {
		vi.useFakeTimers();
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(console, 'log').mockImplementation(() => {});

		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				json: async () => ({ token: 'test-token' })
			}))
		);

		const sockets = [];
		class MockWebSocket {
			static OPEN = 1;
			static CONNECTING = 0;

			constructor() {
				this.readyState = MockWebSocket.OPEN;
				this.sent = [];
				// First socket's keep-alive fails (simulating a mid-recording drop);
				// later sockets behave normally so the reconnect can succeed.
				this.failKeepAlive = sockets.length === 0;
				this.send = vi.fn((payload) => {
					if (this.failKeepAlive && typeof payload === 'string' && payload.includes('KeepAlive')) {
						throw new Error('socket send failed');
					}
					this.sent.push(payload);
				});
				this.close = vi.fn(() => {
					this.readyState = 3;
				});
				sockets.push(this);
			}
		}
		vi.stubGlobal('WebSocket', MockWebSocket);

		await transcriptionStore.connect();
		sockets[0].onopen();

		// chunk-A is sent to the live socket BEFORE the drop (Deepgram already has
		// it — replaying it on reconnect would DUPLICATE audio).
		transcriptionStore.send('chunk-A');
		expect(sockets[0].sent).toContain('chunk-A');

		await vi.advanceTimersByTimeAsync(5000); // fires the failing KeepAlive → drop

		let state;
		const read = () => transcriptionStore.subscribe((v) => (state = v))();
		read();
		// Dropped mid-recording → NOT a hard error; it should be reconnecting.
		expect(state.connected).toBe(false);
		expect(state.error).toBe(null);
		expect(state.connecting).toBe(true);

		// Audio produced DURING the gap (no live socket) must be buffered, not lost.
		transcriptionStore.send('chunk-B');

		// Let the backoff fire and the new socket open.
		await vi.advanceTimersByTimeAsync(500);
		expect(sockets.length).toBe(2); // a fresh socket was created
		sockets[1].onopen();
		read();
		expect(state.connected).toBe(true);

		// The gap chunk is flushed to the new socket; the already-sent chunk-A is
		// NOT replayed (no duplication).
		expect(sockets[1].sent).toContain('chunk-B');
		expect(sockets[1].sent).not.toContain('chunk-A');

		transcriptionStore.disconnect();
	});

	it('gives up with an error after exhausting reconnect attempts', async () => {
		vi.useFakeTimers();
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});

		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				json: async () => ({ token: 'test-token' })
			}))
		);

		const sockets = [];
		class MockWebSocket {
			static OPEN = 1;
			static CONNECTING = 0;
			constructor() {
				this.readyState = MockWebSocket.OPEN;
				this.send = vi.fn();
				this.close = vi.fn(() => {
					this.readyState = 3;
				});
				sockets.push(this);
			}
		}
		vi.stubGlobal('WebSocket', MockWebSocket);

		await transcriptionStore.connect();
		sockets[0].onopen(); // first connection is healthy...

		// ...then every socket drops WITHOUT ever opening (connection never
		// establishes), so the backoff counter isn't reset by onopen and the
		// bounded attempts get exhausted. MAX_RECONNECT_ATTEMPTS=4, max backoff
		// 4000ms → advance generously each round.
		sockets[0].onclose(); // the initial drop that starts reconnecting
		for (let i = 0; i < 6; i++) {
			await vi.advanceTimersByTimeAsync(5000); // fire the scheduled reconnect
			const s = sockets[sockets.length - 1];
			s.onclose?.(); // new socket drops before opening
		}

		let state;
		transcriptionStore.subscribe((v) => (state = v))();
		expect(state.error).toBe('Live connection lost');

		transcriptionStore.disconnect();
	});

	it('clears connecting state when disconnected before the token request finishes', async () => {
		let resolveTokenRequest;
		vi.stubGlobal(
			'fetch',
			vi.fn(
				() =>
					new Promise((resolve) => {
						resolveTokenRequest = resolve;
					})
			)
		);

		const connectPromise = transcriptionStore.connect();

		let state;
		transcriptionStore.subscribe((value) => {
			state = value;
		})();

		expect(state.connecting).toBe(true);

		transcriptionStore.disconnect();

		transcriptionStore.subscribe((value) => {
			state = value;
		})();
		expect(state.connected).toBe(false);
		expect(state.connecting).toBe(false);

		resolveTokenRequest({
			json: async () => ({ token: 'late-token' })
		});
		await connectPromise;

		transcriptionStore.subscribe((value) => {
			state = value;
		})();
		expect(state.connected).toBe(false);
		expect(state.connecting).toBe(false);
	});

	it('finishes as soon as Deepgram acknowledges finalize', async () => {
		vi.useFakeTimers();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				json: async () => ({ token: 'test-token' })
			}))
		);

		class MockWebSocket {
			static OPEN = 1;
			static CONNECTING = 0;
			static last = null;

			constructor() {
				this.readyState = MockWebSocket.OPEN;
				this.send = vi.fn();
				this.close = vi.fn(() => {
					this.readyState = 3;
				});
				MockWebSocket.last = this;
			}
		}

		vi.stubGlobal('WebSocket', MockWebSocket);

		await transcriptionStore.connect();
		MockWebSocket.last.onopen();

		const finishPromise = transcriptionStore.finish({ graceMs: 2200 });
		expect(MockWebSocket.last.send).toHaveBeenCalledWith(JSON.stringify({ type: 'Finalize' }));

		MockWebSocket.last.onmessage({
			data: JSON.stringify({
				type: 'Results',
				is_final: true,
				from_finalize: true,
				channel: {
					alternatives: [{ transcript: 'done now' }]
				}
			})
		});

		const result = await finishPromise;

		expect(result.text).toBe('done now');
		expect(result.hasFinal).toBe(true);
		expect(result.finalizeAcknowledged).toBe(true);
		expect(MockWebSocket.last.send).toHaveBeenCalledWith(JSON.stringify({ type: 'CloseStream' }));
		expect(MockWebSocket.last.close).toHaveBeenCalledWith(1000, 'Done recording');
	});

	it('waits for the finalize response instead of resolving on a regular final result', async () => {
		vi.useFakeTimers();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				json: async () => ({ token: 'test-token' })
			}))
		);

		class MockWebSocket {
			static OPEN = 1;
			static CONNECTING = 0;
			static last = null;

			constructor() {
				this.readyState = MockWebSocket.OPEN;
				this.send = vi.fn();
				this.close = vi.fn(() => {
					this.readyState = 3;
				});
				MockWebSocket.last = this;
			}
		}

		vi.stubGlobal('WebSocket', MockWebSocket);

		await transcriptionStore.connect();
		MockWebSocket.last.onopen();

		const finishPromise = transcriptionStore.finish({ graceMs: 2200 });
		let settled = false;
		finishPromise.then(() => {
			settled = true;
		});

		MockWebSocket.last.onmessage({
			data: JSON.stringify({
				type: 'Results',
				is_final: true,
				channel: {
					alternatives: [{ transcript: 'regular final' }]
				}
			})
		});
		await Promise.resolve();

		expect(settled).toBe(false);

		await vi.advanceTimersByTimeAsync(2200);
		const result = await finishPromise;

		expect(result.text).toBe('regular final');
		expect(result.hasFinal).toBe(true);
		expect(result.finalizeAcknowledged).toBe(false);
	});

	it('requests finalize after a connecting socket opens during finish', async () => {
		vi.useFakeTimers();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				json: async () => ({ token: 'test-token' })
			}))
		);

		class MockWebSocket {
			static OPEN = 1;
			static CONNECTING = 0;
			static last = null;

			constructor() {
				this.readyState = MockWebSocket.CONNECTING;
				this.send = vi.fn();
				this.close = vi.fn(() => {
					this.readyState = 3;
				});
				MockWebSocket.last = this;
			}
		}

		vi.stubGlobal('WebSocket', MockWebSocket);

		await transcriptionStore.connect();

		const finishPromise = transcriptionStore.finish({ graceMs: 2200 });
		expect(MockWebSocket.last.send).not.toHaveBeenCalledWith(JSON.stringify({ type: 'Finalize' }));

		MockWebSocket.last.readyState = MockWebSocket.OPEN;
		MockWebSocket.last.onopen();
		expect(MockWebSocket.last.send).toHaveBeenCalledWith(JSON.stringify({ type: 'Finalize' }));

		MockWebSocket.last.onmessage({
			data: JSON.stringify({
				from_finalize: true
			})
		});

		const result = await finishPromise;

		expect(result.text).toBe('');
		expect(result.finalizeAcknowledged).toBe(true);
		expect(MockWebSocket.last.send).toHaveBeenCalledWith(JSON.stringify({ type: 'CloseStream' }));
		expect(MockWebSocket.last.close).toHaveBeenCalledWith(1000, 'Done recording');
	});
});
