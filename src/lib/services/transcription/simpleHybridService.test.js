import { beforeEach, describe, expect, it, vi } from 'vitest';

const storeMock = vi.hoisted(() => {
	let privacyValue = 'false';
	const subscribers = new Set();

	const privacyMode = {
		subscribe(run) {
			subscribers.add(run);
			run(privacyValue);
			return () => subscribers.delete(run);
		},
		set(value) {
			privacyValue = value;
			subscribers.forEach((run) => run(privacyValue));
		}
	};

	const customPrompt = {
		subscribe(run) {
			run('');
			return () => {};
		}
	};

	return { customPrompt, privacyMode };
});

const whisperMock = vi.hoisted(() => ({
	whisperStatus: {
		subscribe(run) {
			run({ isLoaded: false });
			return () => {};
		}
	},
	whisperService: {
		preloadModel: vi.fn(),
		unloadModel: vi.fn().mockResolvedValue()
	}
}));

vi.mock('$app/environment', () => ({
	browser: true,
	dev: false,
	building: false,
	version: ''
}));

vi.mock('$lib', () => storeMock);

vi.mock('./whisper/whisperService', () => whisperMock);

describe('SimpleHybridService', () => {
	beforeEach(() => {
		storeMock.privacyMode.set('false');
		whisperMock.whisperService.preloadModel.mockClear();
		whisperMock.whisperService.unloadModel.mockClear();
	});

	it('keeps Whisper loaded when Offline Mode is re-enabled before a pending release completes', async () => {
		const { SimpleHybridService } = await import('./simpleHybridService.js');
		const service = new SimpleHybridService();
		let resolveLoad;

		whisperMock.whisperService.preloadModel.mockReturnValue(
			new Promise((resolve) => {
				resolveLoad = resolve;
			})
		);

		storeMock.privacyMode.set('true');
		const loadPromise = service.startBackgroundLoad();
		storeMock.privacyMode.set('false');
		const releasePromise = service.releaseOfflineModel();
		storeMock.privacyMode.set('true');

		resolveLoad({ success: true });
		await Promise.all([loadPromise, releasePromise]);

		expect(whisperMock.whisperService.unloadModel).not.toHaveBeenCalled();
	});

	it('unloads Whisper once when Offline Mode stays disabled after a pending load', async () => {
		const { SimpleHybridService } = await import('./simpleHybridService.js');
		const service = new SimpleHybridService();
		let resolveLoad;

		whisperMock.whisperService.preloadModel.mockReturnValue(
			new Promise((resolve) => {
				resolveLoad = resolve;
			})
		);

		storeMock.privacyMode.set('true');
		const loadPromise = service.startBackgroundLoad();
		storeMock.privacyMode.set('false');
		const releasePromise = service.releaseOfflineModel();

		resolveLoad({ success: true });
		await Promise.all([loadPromise, releasePromise]);

		expect(whisperMock.whisperService.unloadModel).toHaveBeenCalledTimes(1);
	});
});
