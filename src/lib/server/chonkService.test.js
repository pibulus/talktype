import { describe, expect, it } from 'vitest';
import { extractChonkTranscript } from './chonkService.js';

describe('Chonk service helpers', () => {
	it('extracts and trims the transcript text', () => {
		expect(extractChonkTranscript({ text: '  hello from the chonk  ' })).toBe(
			'hello from the chonk'
		);
	});

	it('returns empty string for missing or non-string payloads', () => {
		expect(extractChonkTranscript({})).toBe('');
		expect(extractChonkTranscript(null)).toBe('');
		expect(extractChonkTranscript({ text: 42 })).toBe('');
	});
});
