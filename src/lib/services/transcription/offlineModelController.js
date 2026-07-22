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
				// Policy: never auto-DOWNLOAD on app open. But when Offline Mode is
				// already on AND the model bytes are already cached, warm it from
				// disk so the first recording doesn't stall on a cold load.
				if (isPrivacyModeEnabled(value)) {
					Promise.resolve(this.hybridService.isOfflineModelCached?.())
						.then((cached) => {
							if (cached) this.startModelLoading({ quiet: true });
						})
						.catch(() => {});
				}
				return;
			}

			if (isPrivacyModeEnabled(value)) {
				this.startModelLoading();
			} else {
				this.releaseModel();
			}
		});
	}

	startModelLoading({ quiet = false } = {}) {
		if (this.modelLoadStarted || !isPrivacyModeEnabled(get(this.privacyStore))) return;

		this.modelLoadStarted = true;
		analytics.offlineModelLoadStarted();
		this.hybridService
			.startBackgroundLoad()
			.then((result) => {
				if (result?.success) {
					analytics.offlineModelReady({ alreadyLoaded: result.alreadyLoaded === true });
					if (!quiet && !result.alreadyLoaded) {
						this.#toast('success', 'Offline model ready — transcription runs on this device.');
					}
					return;
				}
				this.modelLoadStarted = false;
				// User switched away mid-load and the model was released — not a failure.
				if (result?.unloaded) return;
				analytics.offlineModelFailed({ error: result?.error || 'load_failed' });
				if (!quiet) {
					this.#toast('error', "Offline model couldn't load — tap Offline to retry.");
				}
			})
			.catch((error) => {
				this.modelLoadStarted = false;
				analytics.offlineModelFailed({ error });
				if (!quiet) {
					this.#toast('error', "Offline model couldn't load — tap Offline to retry.");
				}
			});
	}

	#toast(type, message) {
		if (!this.isBrowser || typeof window === 'undefined') return;
		window.dispatchEvent(new CustomEvent('talktype:toast', { detail: { type, message } }));
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
