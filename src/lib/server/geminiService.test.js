import { describe, expect, it, vi } from 'vitest';
import { getTranscriptionPrompt } from '$lib/prompts';
import {
	buildGeminiTranscriptionRequest,
	deleteUploadedGeminiFile,
	resolveGeminiTranscriptionPrompt
} from './geminiService.js';
import { GEMINI_GENERATION_CONFIG } from './geminiConfig.js';

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

	it('builds Gemini generateContent requests with the current SDK config shape', () => {
		const request = buildGeminiTranscriptionRequest({
			modelId: 'gemini-test-model',
			uploadedFile: {
				uri: 'https://generativelanguage.googleapis.com/v1beta/files/example',
				mimeType: 'audio/webm'
			},
			mimeType: 'audio/ogg',
			prompt: 'Rewrite this like a pirate.'
		});

		expect(request).toMatchObject({
			model: 'gemini-test-model',
			config: GEMINI_GENERATION_CONFIG.transcription,
			contents: {
				role: 'user',
				parts: [
					{ text: 'Rewrite this like a pirate.' },
					{
						fileData: {
							fileUri: 'https://generativelanguage.googleapis.com/v1beta/files/example',
							mimeType: 'audio/webm'
						}
					}
				]
			}
		});
		expect(request).not.toHaveProperty('generationConfig');
	});

	it('deletes uploaded Gemini files with the SDK parameter object', async () => {
		const genAI = {
			files: {
				delete: vi.fn().mockResolvedValue({})
			}
		};

		await deleteUploadedGeminiFile(genAI, 'files/example');

		expect(genAI.files.delete).toHaveBeenCalledWith({ name: 'files/example' });
	});
});
