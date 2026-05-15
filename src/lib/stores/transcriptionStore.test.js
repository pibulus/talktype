import { describe, expect, it } from 'vitest';
import {
	DEEPGRAM_TOKEN_PROTOCOL,
	appendFinalTranscript,
	buildDeepgramLiveUrl
} from './transcriptionStore.js';

describe('Deepgram live transcription configuration', () => {
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
});
