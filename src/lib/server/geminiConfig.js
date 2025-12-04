import { env } from '$env/dynamic/private';

export const GEMINI_MODELS = {
	transcription: 'gemini-2.5-flash-lite',
	animation: 'gemini-2.0-flash-exp'
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
