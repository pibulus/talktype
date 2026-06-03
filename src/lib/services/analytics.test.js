import { describe, expect, it } from 'vitest';
import { classifyAnalyticsError, durationBucket, normalizeTranscriptionMode } from './analytics.js';

describe('analytics helpers', () => {
	it('buckets recording duration without preserving exact lengths', () => {
		expect(durationBucket(0.5)).toBe('under_2s');
		expect(durationBucket(12)).toBe('10_30s');
		expect(durationBucket(75)).toBe('1_3m');
		expect(durationBucket(700)).toBe('5_15m');
		expect(durationBucket(Number.NaN)).toBe('unknown');
	});

	it('normalizes transcription modes into low-cardinality values', () => {
		expect(normalizeTranscriptionMode({ useLiveDeepgram: true })).toBe('live');
		expect(normalizeTranscriptionMode({ useOfflineWhisper: true })).toBe('offline');
		expect(normalizeTranscriptionMode('standard')).toBe('after_stop');
	});

	it('classifies errors without sending raw messages', () => {
		expect(classifyAnalyticsError(new Error('NotAllowedError: permission denied'))).toBe(
			'permission'
		);
		expect(classifyAnalyticsError(new Error('Model download timed out'))).toBe('timeout');
		expect(classifyAnalyticsError(new Error('fetch failed'))).toBe('network');
	});
});
