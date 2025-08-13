import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import { StorageUtils } from '../infrastructure/storageUtils';
import { STORAGE_KEYS } from '../../constants';

// Store to track first visit status
export const isFirstVisit = writable(false);

export class FirstVisitService {
	constructor() {
		this.debug = false;
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
		if (!browser || !this.checkFirstVisit()) return null;

		this.log('Scheduling intro modal to appear');

		return new Promise((resolve) => {
			setTimeout(() => {
				const modal = document.getElementById(modalId);
				if (modal) {
					this.log('Opening intro modal on first visit');
					modal.showModal();

					// Set up event listener to handle modal close
					const handleClose = () => {
						this.log('Intro modal closed, marking intro as seen');
						this.markIntroAsSeen();
						modal.removeEventListener('close', handleClose);
						resolve(true);
					};

					modal.addEventListener('close', handleClose, { once: true });
					resolve(modal);
				} else {
					console.error('Intro modal element not found');
					this.log('Intro modal element not found');
					resolve(null);
				}
			}, delay);
		});
	}
}

export const firstVisitService = new FirstVisitService();
