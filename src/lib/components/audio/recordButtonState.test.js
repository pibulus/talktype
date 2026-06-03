import { describe, expect, it } from 'vitest';
import { formatDuration, getRecordButtonState } from './recordButtonState.js';

describe('record button state', () => {
	it('formats recording durations as m:ss', () => {
		expect(formatDuration(0)).toBe('0:00');
		expect(formatDuration(65.8)).toBe('1:05');
		expect(formatDuration(-12)).toBe('0:00');
	});

	it('clamps progress and remaining time for over-limit recordings', () => {
		const state = getRecordButtonState({
			recording: true,
			recordingDuration: 360,
			maxDuration: 300
		});

		expect(state.progressPercentage).toBe(100);
		expect(state.timeRemaining).toBe(0);
		expect(state.isDanger).toBe(true);
	});

	it('guards against invalid max duration values', () => {
		const state = getRecordButtonState({
			recording: true,
			recordingDuration: 5,
			maxDuration: 0
		});

		expect(state.progressPercentage).toBe(100);
		expect(state.durationLabel).toBe('0:05 of 0:01');
	});

	it('only pulses the idle primary CTA', () => {
		expect(getRecordButtonState({ buttonLabel: 'Say hi' }).isIdlePrimaryCta).toBe(true);
		expect(
			getRecordButtonState({ buttonLabel: 'Say hi', clipboardSuccess: true }).isIdlePrimaryCta
		).toBe(false);
		expect(getRecordButtonState({ buttonLabel: 'Try again' }).isIdlePrimaryCta).toBe(false);
	});
});
