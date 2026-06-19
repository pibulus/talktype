import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { guardRequest } from '$lib/server/authService.js';
import { enforceRateLimit } from '$lib/server/rateLimiter.js';
import { transcribeAudio } from '$lib/server/deepgramService.js';
import { verifySupporterToken } from '$lib/server/supporter/licenseCrypto.js';
import { ANIMATION, LEGACY_STORAGE_KEYS, PROMPT_STYLES, STORAGE_KEYS } from '$lib/constants';

const DEFAULT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const DEFAULT_FREE_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
function parsePositiveNumber(value, fallback) {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeNumber(value, fallback) {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

const MAX_UPLOAD_BYTES = parsePositiveNumber(env.MAX_UPLOAD_BYTES, DEFAULT_MAX_UPLOAD_BYTES);
const parsedFreeMaxUploadBytes = parsePositiveNumber(
	env.FREE_MAX_UPLOAD_BYTES,
	DEFAULT_FREE_MAX_UPLOAD_BYTES
);
const FREE_MAX_UPLOAD_BYTES =
	Math.min(parsedFreeMaxUploadBytes, MAX_UPLOAD_BYTES) ||
	Math.min(DEFAULT_FREE_MAX_UPLOAD_BYTES, MAX_UPLOAD_BYTES);
const FREE_RECORDING_LIMIT_SECONDS = parsePositiveNumber(
	env.FREE_RECORDING_LIMIT_SECONDS,
	ANIMATION.RECORDING.FREE_LIMIT
);
const TRANSCRIBE_RATE_WINDOW_MS = parseNonNegativeNumber(
	env.TRANSCRIBE_RATE_WINDOW_MS,
	10 * 60 * 1000
);
const TRANSCRIBE_RATE_LIMIT = parseNonNegativeNumber(env.TRANSCRIBE_RATE_LIMIT, 20);
const MAX_CUSTOM_PROMPT_CHARS = 1200;
const SUPPORTER_TOKEN_HEADER = 'x-talktype-supporter-token';
const FREE_PROMPT_STYLES = new Set([PROMPT_STYLES.STANDARD, PROMPT_STYLES.SURLY_PIRATE]);
const VALID_PROMPT_STYLES = new Set(Object.values(PROMPT_STYLES));
const DURATION_GRACE_SECONDS = 5;
const MULTIPART_OVERHEAD_GRACE_BYTES = 512 * 1024;

export function _getUploadLimitForSupporter(isSupporter) {
	return isSupporter ? MAX_UPLOAD_BYTES : FREE_MAX_UPLOAD_BYTES;
}

export function _isFreeDurationOverLimit(durationSeconds) {
	return (
		Number.isFinite(durationSeconds) &&
		durationSeconds > FREE_RECORDING_LIMIT_SECONDS + DURATION_GRACE_SECONDS
	);
}

export function _isRequestBodyOverLimit(contentLength, uploadLimitBytes) {
	return (
		Number.isFinite(contentLength) &&
		contentLength > uploadLimitBytes + MULTIPART_OVERHEAD_GRACE_BYTES
	);
}

export function _shouldFallbackToDeepgramForGeminiError(error) {
	const message = error?.message?.toString()?.toLowerCase() ?? '';
	return [
		'resource_exhausted',
		'quota',
		'billing',
		'prepayment',
		'credits are depleted',
		'api key not found',
		'api_key_invalid',
		'missing gemini api key',
		// Soft Gemini failures — degrade to Deepgram rather than failing the request.
		'empty transcription',
		'file processing timed out',
		'file processing failed'
	].some((signal) => message.includes(signal));
}

function getBearerToken(event) {
	const authorization = event.request.headers.get('authorization') || '';
	const match = authorization.match(/^Bearer\s+(.+)$/i);
	return match?.[1]?.trim() || '';
}

export function _getSupporterToken(event) {
	return (
		event.cookies.get(STORAGE_KEYS.SUPPORTER_TOKEN) ||
		LEGACY_STORAGE_KEYS.SUPPORTER_TOKEN.map((key) => event.cookies.get(key)).find(Boolean) ||
		event.request.headers.get(SUPPORTER_TOKEN_HEADER) ||
		getBearerToken(event)
	);
}

export function _hasValidSupporterToken(token) {
	if (!token) return false;

	try {
		return Boolean(verifySupporterToken(token));
	} catch (error) {
		console.warn('[API /transcribe] Supporter token could not be verified:', error.message);
		return false;
	}
}

export async function POST(event) {
	try {
		const guardResponse = await guardRequest(event);
		if (guardResponse) {
			return guardResponse;
		}

		const transcribeRateResponse = await enforceRateLimit(event, {
			bucket: 'transcribe',
			windowMs: TRANSCRIBE_RATE_WINDOW_MS,
			max: TRANSCRIBE_RATE_LIMIT
		});
		if (transcribeRateResponse) {
			return transcribeRateResponse;
		}

		const token = _getSupporterToken(event);
		const isSupporter = _hasValidSupporterToken(token);
		const uploadLimitBytes = _getUploadLimitForSupporter(isSupporter);
		const contentLength = Number(event.request.headers.get('content-length') || NaN);

		if (_isRequestBodyOverLimit(contentLength, uploadLimitBytes)) {
			const mb = (uploadLimitBytes / 1024 / 1024).toFixed(1);
			return json(
				{
					error: isSupporter
						? `That file is a bit too chunky. Please keep recordings under ${mb} MB so the ghost can chew through them.`
						: 'Free recordings are capped at 5 minutes. Try a shorter one or unlock longer recordings.'
				},
				{ status: 413 }
			);
		}

		const formData = await event.request.formData();
		const file = formData.get('audio_file');
		const promptStyle = formData.get('prompt_style')?.toString() || 'standard';
		const customPrompt = (formData.get('custom_prompt')?.toString() || '')
			.trim()
			.slice(0, MAX_CUSTOM_PROMPT_CHARS);
		const durationSeconds = Number(formData.get('duration_seconds')?.toString() || NaN);

		if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
			console.error('[API /transcribe] Missing or invalid audio file');
			return json(
				{
					error: 'Hmm, the audio needs one more pass. Mind trying that again?'
				},
				{ status: 400 }
			);
		}

		if (!isSupporter && _isFreeDurationOverLimit(durationSeconds)) {
			return json(
				{
					error:
						'Free recordings are capped at 5 minutes. Try a shorter one or unlock longer recordings.'
				},
				{ status: 413 }
			);
		}

		if (typeof file.size === 'number' && file.size > uploadLimitBytes) {
			const mb = (uploadLimitBytes / 1024 / 1024).toFixed(1);
			return json(
				{
					error: isSupporter
						? `That file is a bit too chunky. Please keep recordings under ${mb} MB so the ghost can chew through them.`
						: 'Free recordings are capped at 5 minutes. Try a shorter one or unlock longer recordings.'
				},
				{ status: 413 }
			);
		}

		if (!VALID_PROMPT_STYLES.has(promptStyle)) {
			return json({ error: 'Choose a supported transcription style.' }, { status: 400 });
		}

		if (!isSupporter && !FREE_PROMPT_STYLES.has(promptStyle)) {
			return json(
				{ error: 'Supporter mode unlocks custom transcription and extra styles.' },
				{ status: 403 }
			);
		}

		const audioSizeKB = typeof file.size === 'number' ? (file.size / 1024).toFixed(2) : 'unknown';

		console.log(
			`[API /transcribe] Received ${audioSizeKB}KB of ${file.type || 'audio/webm'}, preferred style: ${promptStyle}, supporter: ${isSupporter}`
		);

		let transcription = '';
		let fallback = null;

		// Routing Logic:
		// 1. Standard -> Deepgram (High Accuracy, premium diarization for supporters)
		// 2. Creative / Custom -> Gemini, with Deepgram standard as a graceful outage fallback
		if (promptStyle === PROMPT_STYLES.STANDARD) {
			console.log('[API /transcribe] Routing to Deepgram (Standard)');
			transcription = await transcribeAudio(file, {
				diarize: isSupporter,
				paragraphs: isSupporter
			});
		} else {
			console.log(`[API /transcribe] Routing to Gemini (${promptStyle})`);
			// Dynamically import Gemini service to keep initial load light

			try {
				const { transcribeAudio: transcribeWithGemini } = await import(
					'$lib/server/geminiService.js'
				);
				transcription = await transcribeWithGemini(file, promptStyle, customPrompt);
			} catch (geminiError) {
				if (!_shouldFallbackToDeepgramForGeminiError(geminiError)) {
					throw geminiError;
				}

				console.warn(
					`[API /transcribe] Gemini unavailable for ${promptStyle}; falling back to Deepgram standard:`,
					geminiError?.message || geminiError
				);
				transcription = await transcribeAudio(file, {
					diarize: false,
					paragraphs: false
				});
				fallback = {
					requested_style: promptStyle,
					used: PROMPT_STYLES.STANDARD,
					reason: 'gemini_unavailable'
				};
			}
		}

		return json(fallback ? { transcription, fallback } : { transcription });
	} catch (error) {
		console.error('[API /transcribe] ❌ Error:', error);

		let friendlyMessage = 'The ghost needs one more pass. Give it another shot?';

		const message = error?.message?.toString()?.toLowerCase() ?? '';
		if (
			message.includes('quota') ||
			message.includes('limit') ||
			message.includes('resource_exhausted') ||
			message.includes('billing') ||
			message.includes('prepayment') ||
			message.includes('credits are depleted')
		) {
			friendlyMessage = 'The ghost needs a quick breather. Try again in a moment?';
		} else if (message.includes('network')) {
			friendlyMessage = 'Check your connection, then try transcription again.';
		} else if (message.includes('timeout')) {
			friendlyMessage = 'That took longer than expected. Maybe try a shorter recording?';
		} else if (message.includes('missing gemini api key')) {
			friendlyMessage = 'Style transcription needs server setup before it can run here.';
		} else if (message.includes('missing deepgram api key')) {
			friendlyMessage = 'Transcription needs server setup before it can run here.';
		}

		return json({ error: friendlyMessage }, { status: 500 });
	}
}
