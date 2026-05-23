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
		expect(url.searchParams.get('endpointing')).toBe('300');
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

	it('marks live transcription disconnected if keep-alive send fails', async () => {
		vi.useFakeTimers();
		vi.spyOn(console, 'warn').mockImplementation(() => {});

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
				this.send = vi.fn((payload) => {
					if (typeof payload === 'string' && payload.includes('KeepAlive')) {
						throw new Error('socket send failed');
					}
				});
				this.close = vi.fn();
				MockWebSocket.last = this;
			}
		}

		vi.stubGlobal('WebSocket', MockWebSocket);

		await transcriptionStore.connect();
		MockWebSocket.last.onopen();
		await vi.advanceTimersByTimeAsync(5000);

		let state;
		transcriptionStore.subscribe((value) => {
			state = value;
		})();

		expect(state.connected).toBe(false);
		expect(state.error).toBe('Live transcription connection dropped');
	});
});
