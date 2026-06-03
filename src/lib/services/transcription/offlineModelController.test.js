import { writable } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OfflineModelController } from './offlineModelController.js';

function createController({ initialPrivacyMode = 'false' } = {}) {
	const privacyStore = writable(initialPrivacyMode);
	const hybridService = {
		startBackgroundLoad: vi.fn().mockResolvedValue({ success: true }),
		releaseOfflineModel: vi.fn().mockResolvedValue()
	};
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
