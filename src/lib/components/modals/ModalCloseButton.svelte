<script>
	/**
	 * A reusable modal close button component that provides consistent styling and behavior
	 * across all modals in the application.
	 */
	import { modalService } from '$lib/services/modalService.js';

	export let position = 'right-3 top-3';
	export let size = 'md';
	export let label = 'Close';
	export let closeModal;
	export let modalId = null;

	// Size classes mapping
	const sizeClasses = {
		sm: 'h-7 w-7 text-xs',
		md: 'h-8 w-8 text-sm',
		lg: 'h-10 w-10 text-base'
	};

	const sizeClass = sizeClasses[size] || sizeClasses.md;

	function handleClick() {
		if (typeof closeModal === 'function') {
			closeModal();
			return;
		}

		if (modalId) {
			modalService.closeModal();
		}
	}
</script>

<button
	type="button"
	class="modal-close-btn absolute {position} z-50 flex {sizeClass} items-center justify-center rounded-full"
	aria-label={label}
	on:click|preventDefault={handleClick}
>
	<span class="relative flex h-full w-full items-center justify-center font-black leading-none"
		>✕</span
	>
</button>

<style>
	/* Family X: signature vibrant pink dot tucked into the corner, squishy on press,
	   rotates 90deg on hover. Matches ZipList and the Softstack standard. */
	.modal-close-btn {
		top: 0.75rem;
		right: 0.75rem;
		width: 30px;
		height: 30px;
		background: #ff6ac2;
		color: #fffdf5;
		border: none;
		box-shadow: 0 2px 8px rgba(255, 106, 194, 0.35);
		-webkit-tap-highlight-color: transparent;
		cursor: pointer;
		user-select: none;
		transition:
			box-shadow 0.15s ease,
			transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.modal-close-btn:hover {
		box-shadow: 0 4px 12px rgba(255, 106, 194, 0.55);
		transform: scale(1.1) rotate(90deg);
	}

	.modal-close-btn:active {
		transform: scale(0.85);
	}

	.modal-close-btn:focus-visible {
		outline: 2px solid #ff6ac2;
		outline-offset: 2px;
	}

	@media (pointer: coarse) {
		.modal-close-btn {
			min-width: 36px;
			min-height: 36px;
		}
	}
</style>
