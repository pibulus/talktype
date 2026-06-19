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
		await new Promise((r) => setTimeout(r, intervalMs));
		// Check the deadline AFTER the sleep so a hung files.get can't run past it.
		if (Date.now() >= deadline) {
			throw new Error('Gemini file processing timed out');
		}
		// Bound the individual poll call too — files.get can hang on a flaky network.
		const remaining = Math.max(1000, deadline - Date.now());
		current = await Promise.race([
			genAI.files.get({ name: uploadedFile.name }),
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error('Gemini file processing timed out')), remaining)
			)
		]);
	}

	// Require an explicitly ACTIVE file — FAILED, CANCELLED, STATE_UNSPECIFIED, or
	// a missing state from a 5xx all become a fallback-eligible error rather than
	// proceeding to generateContent with a file that isn't ready.
	if (current?.state !== 'ACTIVE') {
		throw new Error(`Gemini file processing failed (state: ${current?.state ?? 'unknown'})`);
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
