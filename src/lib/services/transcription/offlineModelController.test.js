import { writable } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OfflineModelController } from './offlineModelController.js';

function createController({ initialPrivacyMode = 'false', isModelCached } = {}) {
	const privacyStore = writable(initialPrivacyMode);
	const hybridService = {
		startBackgroundLoad: vi.fn().mockResolvedValue({ success: true }),
		releaseOfflineModel: vi.fn().mockResolvedValue()
	};
	if (isModelCached !== undefined) {
		hybridService.isOfflineModelCached = vi.fn().mockResolvedValue(isModelCached);
	}
	const controller = new OfflineModelController({
		hybridService,
		privacyStore,
		isBrowser: true
	});

	return { controller, hybridService, privacyStore };
}

describe('OfflineModelController', () => {
	let controller;

	afterEach(() => {
		controller?.cleanup();
		controller = null;
	});

	it('does not download a model on start or first interaction', () => {
		const setup = createController({ initialPrivacyMode: 'false' });
		controller = setup.controller;
		controller.start();

		window.dispatchEvent(new MouseEvent('click'));

		expect(setup.hybridService.startBackgroundLoad).not.toHaveBeenCalled();
	});

	it('does not auto-download when Offline Mode was already persisted before start', () => {
		const setup = createController({ initialPrivacyMode: 'true' });
		controller = setup.controller;
		controller.start();

		window.dispatchEvent(new MouseEvent('click'));

		expect(setup.hybridService.startBackgroundLoad).not.toHaveBeenCalled();
	});

	it('warms the model from cache at startup when Offline Mode is on and bytes are cached', async () => {
		const setup = createController({ initialPrivacyMode: 'true', isModelCached: true });
		controller = setup.controller;
		controller.start();

		await vi.waitFor(() => {
			expect(setup.hybridService.startBackgroundLoad).toHaveBeenCalledTimes(1);
		});
	});

	it('does not download at startup when Offline Mode is on but nothing is cached', async () => {
		const setup = createController({ initialPrivacyMode: 'true', isModelCached: false });
		controller = setup.controller;
		controller.start();

		// Give the async cache probe a tick to resolve.
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(setup.hybridService.startBackgroundLoad).not.toHaveBeenCalled();
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
