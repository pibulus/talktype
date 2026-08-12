import { env } from '$env/dynamic/private';

/**
 * In-house transcription via the Chonk home server (transcribe.cpp running
 * Parakeet). Env-gated: with CHONK_TRANSCRIBE_URL unset this path simply
 * doesn't exist and everything routes to Deepgram as before.
 */

export function isChonkConfigured() {
	return Boolean(env.CHONK_TRANSCRIBE_URL);
}

export function extractChonkTranscript(data) {
	return typeof data?.text === 'string' ? data.text.trim() : '';
}

export async function transcribeAudio(file) {
	const base = (env.CHONK_TRANSCRIBE_URL || '').replace(/\/+$/, '');
	if (!base) {
		throw new Error('Missing Chonk transcriber URL');
	}

	const response = await fetch(`${base}/transcribe`, {
		method: 'POST',
		headers: { 'Content-Type': file.type || 'audio/webm' },
		body: file,
		// Shorter than the client's 60s cap so a slow Chonk still leaves
		// room for the Deepgram fallback to run.
		signal: AbortSignal.timeout(40_000)
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData?.error || `Chonk transcriber failed: ${response.status}`);
	}

	const transcript = extractChonkTranscript(await response.json());
	if (!transcript) {
		// Let the caller fall back to Deepgram rather than shipping silence.
		throw new Error('Chonk transcriber returned an empty transcription');
	}

	console.log('[ChonkService] ✅ Transcription complete');
	return transcript;
}
