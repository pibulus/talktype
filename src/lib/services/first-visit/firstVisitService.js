import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import { StorageUtils } from '../infrastructure/storageUtils';
import { modalService } from '../modalService.js';
import { STORAGE_KEYS } from '../../constants';

// Store to track first visit status (internal — nothing outside this service
// consumes it; the ghost's isFirstVisit is an unrelated local).
const isFirstVisit = writable(false);

export class FirstVisitService {
	constructor() {
		this.debug = false;
		this.introTimer = null;
		this.introModal = null;
		this.introCloseHandler = null;
		this.pendingIntroResolve = null;
	}

	setDebug(value) {
		this.debug = !!value;
	}

	log(message) {
		if (this.debug) {
			console.log(`[FirstVisitService] ${message}`);
		}
	}

	checkFirstVisit() {
		if (!browser) return false;

		const hasSeenIntro = StorageUtils.getItem(STORAGE_KEYS.FIRST_VISIT);
		const firstVisit = !hasSeenIntro;

		this.log(`Checking first visit: ${firstVisit}`);
		isFirstVisit.set(firstVisit);

		return firstVisit;
	}

	markIntroAsSeen() {
		if (!browser) return;

		StorageUtils.setItem(STORAGE_KEYS.FIRST_VISIT, 'true');
		isFirstVisit.set(false);
		this.log('Marked intro as seen in localStorage');
	}

	showIntroModal(modalId = 'intro_modal', delay = 500) {
		if (!browser || !this.checkFirstVisit()) return Promise.resolve(false);

		this.cancelPendingIntroModal();
		this.log('Scheduling intro modal to appear');

		return new Promise((resolve) => {
			this.pendingIntroResolve = resolve;
			this.introTimer = setTimeout(() => {
				this.introTimer = null;
				const modal = document.getElementById(modalId);
				if (modal) {
					this.log('Opening intro modal on first visit');

					// Set up event listener to handle modal close
					const handleClose = () => {
						this.log('Intro modal closed, marking intro as seen');
						this.markIntroAsSeen();
						this.clearIntroModalListener();
						this.pendingIntroResolve = null;
						resolve(true);
					};

					this.introModal = modal;
					this.introCloseHandler = handleClose;
					modal.addEventListener('close', handleClose, { once: true });
					modalService.openModal(modalId);
				} else {
					console.error('Intro modal element not found');
					this.log('Intro modal element not found');
					this.pendingIntroResolve = null;
					resolve(false);
				}
			}, delay);
		});
	}

	clearIntroModalListener() {
		if (this.introModal && this.introCloseHandler) {
			this.introModal.removeEventListener('close', this.introCloseHandler);
		}
		this.introModal = null;
		this.introCloseHandler = null;
	}

	cancelPendingIntroModal() {
		if (this.introTimer) {
			clearTimeout(this.introTimer);
			this.introTimer = null;
		}

		this.clearIntroModalListener();

		if (this.pendingIntroResolve) {
			const resolve = this.pendingIntroResolve;
			this.pendingIntroResolve = null;
			resolve(false);
		}
	}
}

export const firstVisitService = new FirstVisitService();
