import { browser } from '$app/environment';
import { ANIMATION } from '$lib/constants';

const MODAL_CLOSE_DURATION = ANIMATION.MODAL.CLOSE_DURATION;

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

		this.scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
		this.scrollPosition = window.scrollY;
		this.modalOpen = true;

		document.documentElement.style.overflow = 'hidden';
		if (this.scrollbarWidth > 0) {
			document.documentElement.style.paddingRight = `${this.scrollbarWidth}px`;
		}

		if (typeof modal.showModal === 'function') {
			this.bindNativeClose(modal);
			if (!modal.open) {
				modal.classList.remove('tt-modal-closing');
				modal.showModal();
			}
		}

		return modal;
	}

	closeModal() {
		if (
			!browser ||
			this.isClosing ||
			(!this.modalOpen && !document.querySelector('dialog[open], dialog.modal-open'))
		) {
			return;
		}

		this.isClosing = true;
		const openDialogs = Array.from(document.querySelectorAll('dialog[open], dialog.modal-open'));

		openDialogs.forEach((dialog) => {
			dialog.classList.add('tt-modal-closing');
		});

		const closeDelay = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
			? 0
			: MODAL_CLOSE_DURATION;

		window.setTimeout(() => {
			openDialogs.forEach((dialog) => {
				dialog.classList.remove('tt-modal-closing');
				if (dialog && typeof dialog.close === 'function' && dialog.open) {
					dialog.close();
				}
			});

			this.restorePage();
			this.unbindAllNativeClose();
			this.isClosing = false;
		}, closeDelay);
	}

	restorePage() {
		if (!browser) return;

		document.documentElement.style.overflow = '';
		document.documentElement.style.paddingRight = '';
		this.modalOpen = false;
	}

	bindNativeClose(modal) {
		if (!modal) return;

		this.unbindNativeClose(modal);

		const handleCancel = (event) => {
			event.preventDefault();
			this.closeModal();
		};

		const handleNativeClose = () => {
			if (this.isClosing) return;

			requestAnimationFrame(() => {
				this.unbindNativeClose(modal);

				if (!document.querySelector('dialog[open]')) {
					this.restorePage();
				}
			});
		};

		modal.addEventListener('cancel', handleCancel);
		modal.addEventListener('close', handleNativeClose);
		modal.__talktypeCancelHandler = handleCancel;
		modal.__talktypeCloseHandler = handleNativeClose;
	}

	unbindNativeClose(modal) {
		if (!modal) return;

		if (modal.__talktypeCancelHandler) {
			modal.removeEventListener('cancel', modal.__talktypeCancelHandler);
			delete modal.__talktypeCancelHandler;
		}

		if (modal.__talktypeCloseHandler) {
			modal.removeEventListener('close', modal.__talktypeCloseHandler);
			delete modal.__talktypeCloseHandler;
		}
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
