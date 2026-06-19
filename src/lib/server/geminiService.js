import { GoogleGenAI, createPartFromUri, createUserContent } from '@google/genai';
import { getTranscriptionPrompt } from '$lib/prompts';
import {
	GEMINI_MODELS,
	GEMINI_GENERATION_CONFIG,
	getGeminiApiKey
} from '$lib/server/geminiConfig.js';

const MODEL_ID = GEMINI_MODELS.transcription;
const GENERATION_CONFIG = GEMINI_GENERATION_CONFIG.transcription;

async function withRetry(fn, { tries = 3, baseMs = 600 } = {}) {
	let lastErr;
	for (let i = 0; i < tries; i++) {
		try {
			return await fn();
		} catch (err) {
			const msg = String(err?.message || err);
			const transient = /\b(503|429|overload|UNAVAILABLE|RESOURCE_EXHAUSTED)\b/i.test(msg);
			lastErr = err;
			if (!transient || i === tries - 1) throw err;
			await new Promise((r) => setTimeout(r, baseMs * 2 ** i));
		}
	}
	throw lastErr;
}

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

// After upload, a Gemini file is briefly in PROCESSING; calling generateContent
// before it's ACTIVE can fail or return empty. Poll until ACTIVE (bounded), and
// throw a fallback-eligible error if it never becomes usable.
export async function waitForGeminiFileActive(
	genAI,
	uploadedFile,
	{ maxWaitMs = 12000, intervalMs = 500 } = {}
) {
	if (!uploadedFile?.name) return uploadedFile;

	let current = uploadedFile;
	const deadline = Date.now() + maxWaitMs;

	while (current?.state === 'PROCESSING') {
		if (Date.now() >= deadline) {
			throw new Error('Gemini file processing timed out');
		}
		await new Promise((r) => setTimeout(r, intervalMs));
		current = await genAI.files.get({ name: uploadedFile.name });
	}

	if (current?.state === 'FAILED') {
		throw new Error('Gemini file processing failed');
	}

	return current;
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

		// Wait for the file to finish processing before generating.
		const activeFile = await waitForGeminiFileActive(genAI, uploadResult);

		const result = await withRetry(() =>
			genAI.models.generateContent(
				buildGeminiTranscriptionRequest({
					uploadedFile: activeFile,
					mimeType,
					prompt
				})
			)
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

		// Empty Gemini output is a soft failure — throw a fallback-eligible error so
		// the API route degrades to Deepgram instead of returning a blank transcript.
		if (!transcription.trim()) {
			throw new Error('Gemini returned an empty transcription');
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
