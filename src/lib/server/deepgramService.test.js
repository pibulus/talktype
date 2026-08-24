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

	it('formats multi-speaker paragraphs with speaker labels when diarized', () => {
		const payload = {
			results: {
				channels: [
					{
						alternatives: [
							{
								transcript: 'hello world how are you',
								paragraphs: {
									transcript: 'hello world\n\nhow are you',
									paragraphs: [
										{
											speaker: 0,
											sentences: [{ text: 'hello world' }]
										},
										{
											speaker: 1,
											sentences: [{ text: 'how are you' }]
										}
									]
								}
							}
						]
					}
				]
			}
		};

		expect(extractDeepgramTranscript(payload)).toBe(
			'Speaker 0: hello world\n\nSpeaker 1: how are you'
		);
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
