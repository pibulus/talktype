import { browser } from '$app/environment';

export class ModalService {
	constructor() {
		this.modalOpen = false;
		this.scrollPosition = 0;
		this.scrollbarWidth = 0;
		this.isClosing = false;
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
			this.bindNativeClose(modal);
			modal.showModal();
		}

		return modal;
	}

	closeModal() {
		if (!browser || (!this.modalOpen && !document.querySelector('dialog[open]'))) return;

		// Close any open dialogs
		this.isClosing = true;
		document.querySelectorAll('dialog[open]').forEach((dialog) => {
			if (dialog && typeof dialog.close === 'function') {
				dialog.close();
			}
		});

		this.restorePage();
		this.unbindAllNativeClose();
		this.isClosing = false;
	}

	restorePage() {
		if (!browser) return;

		// Restore HTML element styles
		document.documentElement.style.overflow = '';
		document.documentElement.style.paddingRight = '';

		// No need to restore scroll position since we didn't change position to fixed

		this.modalOpen = false;
	}

	bindNativeClose(modal) {
		if (!modal) return;

		this.unbindNativeClose(modal);

		const handleNativeClose = () => {
			if (this.isClosing) return;

			requestAnimationFrame(() => {
				this.unbindNativeClose(modal);

				if (!document.querySelector('dialog[open]')) {
					this.restorePage();
				}
			});
		};

		modal.addEventListener('close', handleNativeClose);
		modal.__talktypeCloseHandler = handleNativeClose;
	}

	unbindNativeClose(modal) {
		if (!modal?.__talktypeCloseHandler) return;

		modal.removeEventListener('close', modal.__talktypeCloseHandler);
		delete modal.__talktypeCloseHandler;
	}

	unbindAllNativeClose() {
		document.querySelectorAll('dialog').forEach((dialog) => {
			this.unbindNativeClose(dialog);
		});
	}

	isModalOpen() {
		return this.modalOpen;
	}
}

export const modalService = new ModalService();
