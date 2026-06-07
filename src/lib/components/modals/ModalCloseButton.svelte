<script>
	/**
	 * A reusable modal close button component that provides consistent styling and behavior
	 * across all modals in the application.
	 */
	import { modalService } from '$lib/services/modals/modalService.js';

	export let position = 'right-3 top-3';
	export let size = 'md';
	export let label = 'Close';
	export let closeModal;
	export let modalId = null;

	// Size classes mapping
	const sizeClasses = {
		sm: 'h-11 w-11 text-sm',
		md: 'h-11 w-11 text-base',
		lg: 'h-12 w-12 text-lg'
	};

	// Get size classes based on the size prop
	const sizeClass = sizeClasses[size] || sizeClasses.md;

	// Let the shared modal service own animated closes when available.
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
	class="modal-close-btn absolute {position} z-50 flex {sizeClass} items-center justify-center rounded-full border border-pink-200 bg-pink-100 text-pink-500 shadow-sm transition-all duration-200 ease-in-out hover:bg-pink-200 hover:text-pink-700 focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffaef]"
	aria-label={label}
	on:click|preventDefault={handleClick}
>
	<span class="relative flex h-full w-full items-center justify-center leading-none">✕</span>
</button>

<style>
	.modal-close-btn {
		-webkit-tap-highlight-color: transparent;
		cursor: pointer;
		user-select: none;
	}

	.modal-close-btn:hover {
		transform: scale(1.05);
	}

	.modal-close-btn:active {
		transform: scale(0.95);
	}
</style>
