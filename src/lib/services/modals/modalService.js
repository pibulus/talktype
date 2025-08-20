import { browser } from '$app/environment';

export class ModalService {
	constructor() {
		this.modalOpen = false;
		this.scrollPosition = 0;
		this.scrollbarWidth = 0;
	}

	openModal(modalId) {
		if (!browser) return;

		const modal = document.getElementById(modalId);
		if (!modal) return;

		// Calculate scrollbar width to prevent layout shift
		this.scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
		
		// Save scroll position
		this.scrollPosition = window.scrollY;
		this.modalOpen = true;

		// Use overflow hidden on HTML element instead of body to prevent layout shift
		// Also add padding to compensate for scrollbar removal
		document.documentElement.style.overflow = 'hidden';
		if (this.scrollbarWidth > 0) {
			document.documentElement.style.paddingRight = `${this.scrollbarWidth}px`;
		}

		// Show the modal
		if (typeof modal.showModal === 'function') {
			modal.showModal();
		}

		return modal;
	}

	closeModal() {
		if (!browser || !this.modalOpen) return;

		// Close any open dialogs
		document.querySelectorAll('dialog[open]').forEach((dialog) => {
			if (dialog && typeof dialog.close === 'function') {
				dialog.close();
			}
		});

		// Restore HTML element styles
		document.documentElement.style.overflow = '';
		document.documentElement.style.paddingRight = '';

		// No need to restore scroll position since we didn't change position to fixed

		this.modalOpen = false;
	}

	isModalOpen() {
		return this.modalOpen;
	}
}

export const modalService = new ModalService();
