import { writable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OfflineModelController } from './offlineModelController.js';

function createController({ initialPrivacyMode = 'false', delayMs = 100 } = {}) {
	const privacyStore = writable(initialPrivacyMode);
	const hybridService = {
		startBackgroundLoad: vi.fn().mockResolvedValue({ success: true }),
		releaseOfflineModel: vi.fn().mockResolvedValue()
	};
	const controller = new OfflineModelController({
		hybridService,
		privacyStore,
		delayMs,
		isBrowser: true,
		target: window
	});

	return { controller, hybridService, privacyStore };
}

describe('OfflineModelController', () => {
	let controller;

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		controller?.cleanup();
		controller = null;
		vi.useRealTimers();
	});

	it('does not download a model when Offline Mode is disabled', () => {
		const setup = createController({ initialPrivacyMode: 'false' });
		controller = setup.controller;
		controller.start();

		window.dispatchEvent(new MouseEvent('click'));
		vi.advanceTimersByTime(100);

		expect(setup.hybridService.startBackgroundLoad).not.toHaveBeenCalled();
	});

	it('starts the model download after interaction when Offline Mode was already enabled', () => {
		const setup = createController({ initialPrivacyMode: 'true' });
		controller = setup.controller;
		controller.start();

		window.dispatchEvent(new MouseEvent('click'));

		expect(setup.hybridService.startBackgroundLoad).toHaveBeenCalledTimes(1);
	});

	it('loads immediately when Offline Mode is turned on and releases when turned off', () => {
		const setup = createController({ initialPrivacyMode: 'false' });
		controller = setup.controller;
		controller.start();

		setup.privacyStore.set('true');
		setup.privacyStore.set('false');

		expect(setup.hybridService.startBackgroundLoad).toHaveBeenCalledTimes(1);
		expect(setup.hybridService.releaseOfflineModel).toHaveBeenCalledTimes(1);
	});
});
