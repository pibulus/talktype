import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { privacyMode } from '$lib';
import { ANIMATION } from '$lib/constants';
import { simpleHybridService } from './simpleHybridService.js';

function isPrivacyModeEnabled(value) {
	return value === true || value === 'true';
}

export class OfflineModelController {
	constructor({
		hybridService = simpleHybridService,
		privacyStore = privacyMode,
		delayMs = ANIMATION.MODEL.AUTO_LOAD_DELAY,
		isBrowser = browser,
		target = typeof window !== 'undefined' ? window : null
	} = {}) {
		this.hybridService = hybridService;
		this.privacyStore = privacyStore;
		this.delayMs = delayMs;
		this.isBrowser = isBrowser;
		this.target = target;
		this.started = false;
		this.hasUserInteracted = false;
		this.modelLoadStarted = false;
		this.delayTimeoutId = null;
		this.unsubscribePrivacyMode = null;
		this.handleFirstInteraction = this.handleFirstInteraction.bind(this);
	}

	start() {
		if (!this.isBrowser || !this.target || this.started) return;

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

		this.addFirstInteractionListeners();
		this.delayTimeoutId = setTimeout(() => {
			this.delayTimeoutId = null;
			this.startModelLoading();
		}, this.delayMs);
	}

	addFirstInteractionListeners() {
		this.target.addEventListener('click', this.handleFirstInteraction, { once: true });
		this.target.addEventListener('touchstart', this.handleFirstInteraction, { once: true });
		this.target.addEventListener('keydown', this.handleFirstInteraction, { once: true });
	}

	removeFirstInteractionListeners() {
		this.target?.removeEventListener('click', this.handleFirstInteraction);
		this.target?.removeEventListener('touchstart', this.handleFirstInteraction);
		this.target?.removeEventListener('keydown', this.handleFirstInteraction);
	}

	handleFirstInteraction() {
		if (this.hasUserInteracted) return;
		this.hasUserInteracted = true;
		this.removeFirstInteractionListeners();
		this.startModelLoading();
	}

	startModelLoading() {
		if (this.modelLoadStarted || !isPrivacyModeEnabled(get(this.privacyStore))) return;

		this.modelLoadStarted = true;
		this.hybridService
			.startBackgroundLoad()
			.then((result) => {
				if (!result?.success) {
					this.modelLoadStarted = false;
				}
			})
			.catch(() => {
				this.modelLoadStarted = false;
			});
	}

	releaseModel() {
		this.modelLoadStarted = false;
		this.hybridService.releaseOfflineModel?.().catch(() => {});
	}

	cleanup() {
		this.removeFirstInteractionListeners();
		if (this.delayTimeoutId) {
			clearTimeout(this.delayTimeoutId);
			this.delayTimeoutId = null;
		}
		this.unsubscribePrivacyMode?.();
		this.unsubscribePrivacyMode = null;
		this.hasUserInteracted = false;
		this.started = false;
	}
}

export const offlineModelController = new OfflineModelController();
