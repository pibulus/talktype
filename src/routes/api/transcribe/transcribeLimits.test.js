import { describe, expect, it } from 'vitest';
import {
	_getUploadLimitForSupporter,
	_isFreeDurationOverLimit,
	_isRequestBodyOverLimit,
	_shouldFallbackToDeepgramForGeminiError
} from './+server.js';

describe('/api/transcribe limits', () => {
	it('uses a smaller upload limit for free recordings', () => {
		const freeLimit = _getUploadLimitForSupporter(false);
		const supporterLimit = _getUploadLimitForSupporter(true);

		expect(freeLimit).toBeGreaterThan(0);
		expect(supporterLimit).toBeGreaterThan(freeLimit);
	});

	it('flags free recordings above the five-minute limit with a small grace period', () => {
		expect(_isFreeDurationOverLimit(300)).toBe(false);
		expect(_isFreeDurationOverLimit(305)).toBe(false);
		expect(_isFreeDurationOverLimit(306)).toBe(true);
		expect(_isFreeDurationOverLimit(Number.NaN)).toBe(false);
	});

	it('rejects obviously oversized multipart bodies before form parsing', () => {
		const freeLimit = _getUploadLimitForSupporter(false);

		expect(_isRequestBodyOverLimit(freeLimit, freeLimit)).toBe(false);
		expect(_isRequestBodyOverLimit(freeLimit + 512 * 1024, freeLimit)).toBe(false);
		expect(_isRequestBodyOverLimit(freeLimit + 512 * 1024 + 1, freeLimit)).toBe(true);
		expect(_isRequestBodyOverLimit(Number.NaN, freeLimit)).toBe(false);
	});

	it('falls back to Deepgram for Gemini capacity and key failures only', () => {
		expect(
			_shouldFallbackToDeepgramForGeminiError(
				new Error('RESOURCE_EXHAUSTED: prepayment credits are depleted')
			)
		).toBe(true);
		expect(_shouldFallbackToDeepgramForGeminiError(new Error('API_KEY_INVALID'))).toBe(true);
		expect(_shouldFallbackToDeepgramForGeminiError(new Error('network dropped'))).toBe(false);
	});
});
