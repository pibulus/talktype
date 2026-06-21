import { env } from '$env/dynamic/private';

export const DEFAULT_GEMINI_TRANSCRIPTION_MODEL = 'gemini-flash-latest';
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
	clearShadowingGoogleKey();
	return key || '';
}

// Belt-and-braces: the @google/genai SDK auto-discovers GOOGLE_API_KEY from the
// process env and PREFERS it over an explicitly-passed key in some paths. A stale
// GOOGLE_API_KEY (e.g. sourced from a shell profile) can therefore shadow the real
// key in .env and make Gemini fail "for no reason". If the ambient GOOGLE_API_KEY
// differs from our configured key, drop it so the SDK can't silently prefer it.
// Safe to call repeatedly; only touches process.env when there's a real conflict.
let _shadowChecked = false;
function clearShadowingGoogleKey() {
	if (_shadowChecked || typeof process === 'undefined') return;
	_shadowChecked = true;
	const ours = env.GEMINI_API_KEY;
	if (ours && process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== ours) {
		delete process.env.GOOGLE_API_KEY;
	}
}
