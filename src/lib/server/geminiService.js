import { GoogleGenAI } from '@google/genai';
import { getTranscriptionPrompt } from '$lib/prompts';
import { GEMINI_MODELS, GEMINI_GENERATION_CONFIG, geminiApiKey } from '$lib/server/geminiConfig.js';

const MODEL_ID = GEMINI_MODELS.transcription;
const GENERATION_CONFIG = GEMINI_GENERATION_CONFIG.transcription;

const genAI = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

export async function transcribeAudio(file, promptStyle) {
	if (!genAI) {
		throw new Error('Server Error: Missing Gemini API key');
	}

	const mimeType = file.type || 'audio/webm';
	const displayName = file.name || `recording-${Date.now()}`;
	const prompt = getTranscriptionPrompt(promptStyle);

	let uploadedFileName = null;

	try {
		const uploadResult = await genAI.files.upload({
			file,
			config: {
				mimeType,
				displayName
			}
		});

		if (!uploadResult?.uri) {
			throw new Error('File upload to Gemini failed');
		}

		uploadedFileName = uploadResult?.name ?? uploadResult?.file?.name ?? null;

		console.log('[GeminiService] Uploaded audio to Gemini');

		const result = await genAI.models.generateContent({
			model: MODEL_ID,
			contents: [
				{
					parts: [
						{ text: prompt },
						{
							fileData: {
								mimeType: uploadResult.mimeType || mimeType,
								fileUri: uploadResult.uri
							}
						}
					]
				}
			],
			generationConfig: GENERATION_CONFIG
		});

		let transcription = result.text || '';

		if (!transcription && result.candidates?.length) {
			const candidate = result.candidates[0];
			const parts = candidate.content?.parts || [];
			transcription = parts
				.map((part) => (part.text ? part.text.trim() : ''))
				.filter(Boolean)
				.join(' ');
		}

		console.log('[GeminiService] ✅ Transcription complete');

		return transcription;
	} finally {
		if (uploadedFileName) {
			try {
				await genAI.files.delete(uploadedFileName);
			} catch (cleanupError) {
				console.warn('⚠️ Failed to delete Gemini file', uploadedFileName, cleanupError);
			}
		}
	}
}
