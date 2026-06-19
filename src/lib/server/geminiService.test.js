import { describe, expect, it, vi } from 'vitest';
import { getTranscriptionPrompt } from '$lib/prompts';
import {
	buildGeminiTranscriptionRequest,
	deleteUploadedGeminiFile,
	resolveGeminiTranscriptionPrompt,
	waitForGeminiFileActive
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

	describe('waitForGeminiFileActive', () => {
		it('returns immediately when the file is already ACTIVE', async () => {
			const genAI = { files: { get: vi.fn() } };
			const file = { name: 'files/x', state: 'ACTIVE' };
			const result = await waitForGeminiFileActive(genAI, file);
			expect(result).toBe(file);
			expect(genAI.files.get).not.toHaveBeenCalled();
		});

		it('polls until the file becomes ACTIVE', async () => {
			const genAI = {
				files: {
					get: vi
						.fn()
						.mockResolvedValueOnce({ name: 'files/x', state: 'PROCESSING' })
						.mockResolvedValueOnce({ name: 'files/x', state: 'ACTIVE' })
				}
			};
			const result = await waitForGeminiFileActive(
				genAI,
				{ name: 'files/x', state: 'PROCESSING' },
				{ intervalMs: 1, maxWaitMs: 1000 }
			);
			expect(result.state).toBe('ACTIVE');
			expect(genAI.files.get).toHaveBeenCalledTimes(2);
		});

		it('throws when the file processing FAILED', async () => {
			const genAI = {
				files: { get: vi.fn().mockResolvedValue({ name: 'files/x', state: 'FAILED' }) }
			};
			await expect(
				waitForGeminiFileActive(
					genAI,
					{ name: 'files/x', state: 'PROCESSING' },
					{ intervalMs: 1, maxWaitMs: 1000 }
				)
			).rejects.toThrow(/failed/i);
		});

		it('throws a timeout error if it never becomes ACTIVE', async () => {
			const genAI = {
				files: { get: vi.fn().mockResolvedValue({ name: 'files/x', state: 'PROCESSING' }) }
			};
			await expect(
				waitForGeminiFileActive(
					genAI,
					{ name: 'files/x', state: 'PROCESSING' },
					{ intervalMs: 1, maxWaitMs: 5 }
				)
			).rejects.toThrow(/timed out/i);
		});
	});
});
