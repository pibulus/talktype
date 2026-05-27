import { describe, expect, it } from 'vitest';
import {
	WHISPER_PHASES,
	clampPercent,
	formatStorageBytes,
	getLoadStatusText,
	getProgressPercentFromEvent,
	isLargeModelFile
} from './statusUtils.js';

describe('whisper status utils', () => {
	it('normalizes progress callback events from loaded and total bytes', () => {
		expect(getProgressPercentFromEvent({ loaded: 25, total: 100 })).toBe(25);
		expect(getProgressPercentFromEvent({ loaded: 150, total: 100 })).toBe(100);
	});

	it('normalizes direct progress values without overflowing', () => {
		expect(getProgressPercentFromEvent({ progress: 42.4 })).toBe(42);
		expect(getProgressPercentFromEvent({ progress: -4 })).toBe(0);
		expect(getProgressPercentFromEvent({ progress: 110 })).toBe(100);
	});

	it('detects large model files that should drive the visible download bar', () => {
		expect(isLargeModelFile('onnx/encoder_model_quantized.onnx')).toBe(true);
		expect(isLargeModelFile('model.safetensors')).toBe(true);
		expect(isLargeModelFile('tokenizer_config.json')).toBe(false);
	});

	it('formats user-facing load status text', () => {
		expect(
			getLoadStatusText({
				phase: WHISPER_PHASES.DOWNLOADING,
				progress: 37,
				modelName: 'Tiny English'
			})
		).toBe('Downloading Tiny English 37%');
		expect(getLoadStatusText({ phase: WHISPER_PHASES.READY })).toBe('Offline model ready');
	});

	it('formats storage estimate bytes compactly', () => {
		expect(formatStorageBytes(117 * 1024 * 1024)).toBe('117 MB');
		expect(formatStorageBytes(null)).toBe(null);
	});

	it('clamps invalid progress to a fallback', () => {
		expect(clampPercent('bad', 12)).toBe(12);
	});
});
