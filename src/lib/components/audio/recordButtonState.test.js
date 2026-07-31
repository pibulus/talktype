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
		expect(state.progressRatio).toBe(1);
		expect(state.timeRemaining).toBe(0);
		expect(state.isDanger).toBe(true);
	});

	it('exposes normalized recording progress for the visual button', () => {
		const state = getRecordButtonState({
			recording: true,
			recordingDuration: 65,
			maxDuration: 300
		});

		expect(state.progressRatio).toBeCloseTo(0.2167, 4);
		expect(state.progressPercentage).toBeCloseTo(21.6667, 4);
		expect(state.durationLabel).toBe('1:05 of 5:00');
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

	it('keeps idle progress empty', () => {
		const state = getRecordButtonState();

		expect(state.progressRatio).toBe(0);
		expect(state.progressPercentage).toBe(0);
	});
});

// The label shown ON the button while recording. Replaced the word "All done"
// (2026-07-31) after a user read it, next to a filling bar, as a countdown to a
// deadline they hadn't been told about. Counting up reads as a tally instead,
// and doubles as the "how long did I speak for?" figure they asked for.
// This mirrors the derivation in RecordButtonWithTimer.svelte — if that changes,
// change this with it.
const recordingLabelFor = (state) =>
	state.isWarning ? `${state.remainingLabel} left` : state.elapsedLabel;

describe('recording button label', () => {
	it('counts elapsed time up while there is plenty left', () => {
		const state = getRecordButtonState({
			recording: true,
			recordingDuration: 42,
			maxDuration: 300,
			warningThreshold: 60
		});

		expect(recordingLabelFor(state)).toBe('0:42');
		expect(state.isWarning).toBe(false);
	});

	it('switches to remaining time only once the warning window opens', () => {
		const state = getRecordButtonState({
			recording: true,
			recordingDuration: 250,
			maxDuration: 300,
			warningThreshold: 60
		});

		expect(state.isWarning).toBe(true);
		expect(recordingLabelFor(state)).toBe('0:50 left');
	});

	it('never shows a bare countdown early in a long recording', () => {
		for (const seconds of [0, 5, 30, 120, 200]) {
			const state = getRecordButtonState({
				recording: true,
				recordingDuration: seconds,
				maxDuration: 300,
				warningThreshold: 60
			});
			expect(recordingLabelFor(state)).not.toContain('left');
		}
	});
});
