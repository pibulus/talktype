import { describe, expect, it } from 'vitest';
import { extractDeepgramTranscript } from './deepgramService.js';

describe('Deepgram service helpers', () => {
	it('prefers paragraph transcript formatting when Deepgram provides it', () => {
		const payload = {
			results: {
				channels: [
					{
						alternatives: [
							{
								transcript: 'plain transcript',
								paragraphs: {
									transcript: 'Speaker 0: formatted transcript'
								}
							}
						]
					}
				]
			}
		};

		expect(extractDeepgramTranscript(payload)).toBe('Speaker 0: formatted transcript');
	});

	it('falls back to the plain transcript', () => {
		const payload = {
			results: {
				channels: [
					{
						alternatives: [
							{
								transcript: 'plain transcript'
							}
						]
					}
				]
			}
		};

		expect(extractDeepgramTranscript(payload)).toBe('plain transcript');
	});
});
