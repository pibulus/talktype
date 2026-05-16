import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetStores } from '../infrastructure/stores.js';
import { AudioService } from './audioService.js';

describe('AudioService', () => {
	let service;

	beforeEach(() => {
		vi.useFakeTimers();
		resetStores();
		service = new AudioService();
	});

	afterEach(() => {
		vi.useRealTimers();
		resetStores();
		service = null;
	});

	it('shares one in-flight MediaRecorder stop across repeated stop calls', async () => {
		const audioChunk = new Blob(['x'.repeat(1200)], { type: 'audio/webm' });
		const stop = vi.fn(() => {
			service.mediaRecorder.state = 'inactive';
			service.mediaRecorder.onstop?.();
		});
		const requestData = vi.fn();

		service.audioChunks = [audioChunk];
		service.mediaRecorder = {
			state: 'recording',
			mimeType: 'audio/webm',
			requestData,
			stop
		};

		const firstStop = service.stopRecording();
		const secondStop = service.stopRecording();

		vi.advanceTimersByTime(100);
		const [firstBlob, secondBlob] = await Promise.all([firstStop, secondStop]);

		expect(requestData).toHaveBeenCalledTimes(1);
		expect(stop).toHaveBeenCalledTimes(1);
		expect(firstBlob.size).toBe(audioChunk.size);
		expect(secondBlob.size).toBe(audioChunk.size);
		expect(service.mediaRecorder).toBeNull();
	});
});
