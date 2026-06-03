import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { privacyMode } from '$lib';
import { simpleHybridService } from './simpleHybridService.js';
import { analytics } from '$lib/services/analytics.js';

function isPrivacyModeEnabled(value) {
	return value === true || value === 'true';
}

export class OfflineModelController {
	constructor({
		hybridService = simpleHybridService,
		privacyStore = privacyMode,
		isBrowser = browser
	} = {}) {
		this.hybridService = hybridService;
		this.privacyStore = privacyStore;
		this.isBrowser = isBrowser;
		this.started = false;
		this.modelLoadStarted = false;
		this.unsubscribePrivacyMode = null;
	}

	start() {
		if (!this.isBrowser || this.started) return;

		this.started = true;
		let initialPrivacyValue = true;
		this.unsubscribePrivacyMode = this.privacyStore.subscribe((value) => {
			if (initialPrivacyValue) {
				initialPrivacyValue = false;
				return;
			}

			if (isPrivacyModeEnabled(value)) {
				this.startModelLoading();
			} else {
				this.releaseModel();
			}
		});
	}

	startModelLoading() {
		if (this.modelLoadStarted || !isPrivacyModeEnabled(get(this.privacyStore))) return;

		this.modelLoadStarted = true;
		analytics.offlineModelLoadStarted();
		this.hybridService
			.startBackgroundLoad()
			.then((result) => {
				if (result?.success) {
					analytics.offlineModelReady({ alreadyLoaded: result.alreadyLoaded === true });
				}
				if (!result?.success) {
					this.modelLoadStarted = false;
					analytics.offlineModelFailed({ error: result?.error || 'load_failed' });
				}
			})
			.catch((error) => {
				this.modelLoadStarted = false;
				analytics.offlineModelFailed({ error });
			});
	}

	releaseModel() {
		this.modelLoadStarted = false;
		this.hybridService.releaseOfflineModel?.().catch(() => {});
	}

	cleanup() {
		this.unsubscribePrivacyMode?.();
		this.unsubscribePrivacyMode = null;
		this.started = false;
	}
}

export const offlineModelController = new OfflineModelController();
