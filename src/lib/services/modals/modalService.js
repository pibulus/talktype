import { browser } from '$app/environment';
import { ANIMATION } from '$lib/constants';
import { soundService } from '$lib/services/infrastructure/soundService.js';

const MODAL_CLOSE_DURATION = ANIMATION.MODAL.CLOSE_DURATION;

export class ModalService {
	constructor() {
		this.modalOpen = false;
		this.scrollPosition = 0;
		this.scrollbarWidth = 0;
		this.isClosing = false;
		this.pendingModalId = null;
		this.closeTimer = null;
		this.pendingOpenFrame = null;
	}

	openModal(modalId) {
		if (!browser) return;

		const modal = document.getElementById(modalId);
		if (!modal) return;

		if (this.isClosing) {
			this.pendingModalId = modalId;
			return modal;
		}

		const openDialogs = this.getOpenDialogs().filter((dialog) => dialog !== modal);
		if (openDialogs.length > 0) {
			this.pendingModalId = modalId;
			this.closeModal();
			return modal;
		}

		if (modal.open) {
			return modal;
		}

		this.scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
		this.scrollPosition = window.scrollY;
		this.modalOpen = true;

		document.documentElement.style.overflow = 'hidden';
		document.body?.classList.add('tt-modal-open');
		if (this.scrollbarWidth > 0) {
			document.documentElement.style.paddingRight = `${this.scrollbarWidth}px`;
		}

		if (typeof modal.showModal === 'function') {
			this.bindNativeClose(modal);
			modal.classList.remove('tt-modal-closing');
			modal.showModal();
			this.playOpenSound();
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
		const openDialogs = this.getOpenDialogs();
		this.playCloseSound();

		openDialogs.forEach((dialog) => {
			dialog.classList.add('tt-modal-closing');
		});

		const closeDelay = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
			? 0
			: MODAL_CLOSE_DURATION;

		this.closeTimer = window.setTimeout(() => {
			this.closeTimer = null;
			openDialogs.forEach((dialog) => {
				dialog.classList.remove('tt-modal-closing');
				if (dialog && typeof dialog.close === 'function' && dialog.open) {
					dialog.close();
				}
			});

			this.restorePage();
			this.unbindAllNativeClose();
			this.isClosing = false;

			const nextModalId = this.pendingModalId;
			this.pendingModalId = null;
			if (nextModalId) {
				this.pendingOpenFrame = requestAnimationFrame(() => {
					this.pendingOpenFrame = null;
					this.openModal(nextModalId);
				});
			}
		}, closeDelay);
	}

	cleanup() {
		if (!browser) return;

		if (this.closeTimer) {
			clearTimeout(this.closeTimer);
			this.closeTimer = null;
		}

		if (this.pendingOpenFrame) {
			cancelAnimationFrame(this.pendingOpenFrame);
			this.pendingOpenFrame = null;
		}

		this.getOpenDialogs().forEach((dialog) => {
			dialog.classList.remove('tt-modal-closing');
			this.unbindNativeClose(dialog);
			if (dialog && typeof dialog.close === 'function' && dialog.open) {
				dialog.close();
			}
		});

		this.pendingModalId = null;
		this.isClosing = false;
		this.restorePage();
	}

	restorePage() {
		if (!browser) return;

		document.documentElement.style.overflow = '';
		document.documentElement.style.paddingRight = '';
		document.body?.classList.remove('tt-modal-open');
		this.modalOpen = false;
	}

	getOpenDialogs() {
		if (!browser) return [];

		return Array.from(document.querySelectorAll('dialog[open], dialog.modal-open'));
	}

	playOpenSound() {
		soundService.open().catch(() => {});
	}

	playCloseSound() {
		soundService.close().catch(() => {});
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
