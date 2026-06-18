import { env } from '$env/dynamic/private';

export const DEFAULT_GEMINI_TRANSCRIPTION_MODEL = 'gemini-2.5-flash';
const STALE_GEMINI_MODEL_ALIASES = new Map([
	['gemini-3.1-flash-lite-preview', DEFAULT_GEMINI_TRANSCRIPTION_MODEL]
]);

export function resolveGeminiTranscriptionModel(value = env.GEMINI_MODEL) {
	const model = value?.trim();
	if (!model) return DEFAULT_GEMINI_TRANSCRIPTION_MODEL;

	const replacement = STALE_GEMINI_MODEL_ALIASES.get(model);
	if (replacement) {
		console.warn(
			`GEMINI_MODEL=${model} is not a supported Gemini API model; using ${replacement} instead.`
		);
		return replacement;
	}

	return model;
}

export const GEMINI_MODELS = {
	transcription: resolveGeminiTranscriptionModel()
};
export const GEMINI_GENERATION_CONFIG = {
	transcription: {
		temperature: 0.2,
		topP: 0.8,
		topK: 40,
		candidateCount: 1,
		maxOutputTokens: 8192
	}
};

export function getGeminiApiKey() {
	const key = env.GEMINI_API_KEY;
	if (!key) {
		console.warn('GEMINI_API_KEY is missing in environment variables');
	}
	return key || '';
}
