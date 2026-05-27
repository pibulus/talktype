import { describe, expect, it } from 'vitest';
import { getTranscriptionPrompt } from '$lib/prompts';
import { resolveGeminiTranscriptionPrompt } from './geminiService.js';

describe('Gemini service helpers', () => {
	it('uses the saved custom prompt when provided', () => {
		expect(resolveGeminiTranscriptionPrompt('custom', '  rewrite this neatly  ')).toBe(
			'rewrite this neatly'
		);
	});

	it('falls back to the standard prompt when custom is empty', () => {
		expect(resolveGeminiTranscriptionPrompt('custom', '   ')).toBe(
			getTranscriptionPrompt('standard')
		);
	});

	it('uses the selected built-in style prompt', () => {
		expect(resolveGeminiTranscriptionPrompt('surlyPirate')).toBe(
			getTranscriptionPrompt('surlyPirate')
		);
	});
});
