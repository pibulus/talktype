import { GoogleGenAI, createPartFromUri, createUserContent } from '@google/genai';
import { getTranscriptionPrompt } from '$lib/prompts';
import {
	GEMINI_MODELS,
	GEMINI_GENERATION_CONFIG,
	getGeminiApiKey
} from '$lib/server/geminiConfig.js';

const MODEL_ID = GEMINI_MODELS.transcription;
const GENERATION_CONFIG = GEMINI_GENERATION_CONFIG.transcription;

export function resolveGeminiTranscriptionPrompt(promptStyle, customPromptText = '') {
	if (promptStyle !== 'custom') {
		return getTranscriptionPrompt(promptStyle);
	}

	const customPrompt = customPromptText.trim();
	return customPrompt || getTranscriptionPrompt('standard');
}

export function buildGeminiTranscriptionRequest({
	uploadedFile,
	mimeType,
	prompt,
	modelId = MODEL_ID
}) {
	if (!uploadedFile?.uri) {
		throw new Error('File upload to Gemini failed');
	}

	const uploadedMimeType = uploadedFile.mimeType || mimeType;
	return {
		model: modelId,
		contents: createUserContent([
			{ text: prompt },
			createPartFromUri(uploadedFile.uri, uploadedMimeType)
		]),
		config: GENERATION_CONFIG
	};
}

export async function deleteUploadedGeminiFile(genAI, uploadedFileName) {
	if (!uploadedFileName) return;

	await genAI.files.delete({ name: uploadedFileName });
}

export async function transcribeAudio(file, promptStyle, customPromptText = '') {
	const apiKey = getGeminiApiKey();
	if (!apiKey) {
		throw new Error('Server Error: Missing Gemini API key');
	}

	const genAI = new GoogleGenAI({ apiKey });

	const mimeType = file.type || 'audio/webm';
	const displayName = file.name || `recording-${Date.now()}`;

	const prompt = resolveGeminiTranscriptionPrompt(promptStyle, customPromptText);

	let uploadedFileName = null;

	try {
		const uploadResult = await genAI.files.upload({
			file,
			config: {
				mimeType,
				displayName
			}
		});

		uploadedFileName = uploadResult?.name ?? null;

		console.log(`[GeminiService] Uploaded audio to Gemini. Style: ${promptStyle}`);

		const result = await genAI.models.generateContent(
			buildGeminiTranscriptionRequest({
				uploadedFile: uploadResult,
				mimeType,
				prompt
			})
		);

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
				await deleteUploadedGeminiFile(genAI, uploadedFileName);
			} catch (cleanupError) {
				console.warn('⚠️ Failed to delete Gemini file', uploadedFileName, cleanupError);
			}
		}
	}
}
