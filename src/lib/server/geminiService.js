import { GoogleGenAI } from '@google/genai';
import { env } from '$env/dynamic/private';
import { GEMINI_API_KEY } from '$env/static/private';
import { getTranscriptionPrompt } from '$lib/prompts';

const MODEL_ID = 'gemini-2.5-flash-lite';
const GENERATION_CONFIG = {
	temperature: 0.2,
	topP: 0.8,
	topK: 40,
	candidateCount: 1,
	maxOutputTokens: 8192
};

const genAI =
	GEMINI_API_KEY && GEMINI_API_KEY.length > 0
		? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
		: null;

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
			config: GENERATION_CONFIG
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
