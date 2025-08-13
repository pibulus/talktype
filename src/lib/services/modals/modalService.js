import { browser } from '$app/environment';

export class ModalService {
	constructor() {
		this.modalOpen = false;
		this.scrollPosition = 0;
	}

	openModal(modalId) {
		if (!browser) return;

		const modal = document.getElementById(modalId);
		if (!modal) return;

		// Save scroll position and lock body
		this.scrollPosition = window.scrollY;
		const width = document.body.clientWidth;
		this.modalOpen = true;

		document.body.style.position = 'fixed';
		document.body.style.top = `-${this.scrollPosition}px`;
		document.body.style.width = `${width}px`;
		document.body.style.overflow = 'hidden';

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

		// Restore body styles
		document.body.style.position = '';
		document.body.style.top = '';
		document.body.style.width = '';
		document.body.style.overflow = '';
		document.body.style.height = '';

		// Restore scroll position
		window.scrollTo(0, this.scrollPosition);

		this.modalOpen = false;
	}

	isModalOpen() {
		return this.modalOpen;
	}
}

export const modalService = new ModalService();
