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
	// Opt-in candy variant: pink fill, soft-black rim, tucked further into the
	// corner. Used where the modal is a pitch rather than a utility panel.
	export let tone = 'default';

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
	class:is-candy={tone === 'candy'}
	aria-label={label}
	on:click|preventDefault={handleClick}
>
	<span class="relative flex h-full w-full items-center justify-center leading-none">✕</span>
</button>

<style>
	/* Solid, tactile pastel badge button — no transparent wash */
	.modal-close-btn {
		top: 0.75rem;
		right: 0.75rem;
		width: 32px;
		height: 32px;
		font-size: 0.85rem;
		font-weight: 900;
		background: #ffffff;
		border: 1.5px solid rgba(244, 114, 182, 0.45);
		color: #db2777;
		box-shadow: 0 2px 6px rgba(244, 114, 182, 0.18);
		-webkit-tap-highlight-color: transparent;
		cursor: pointer;
		user-select: none;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease,
			transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
			box-shadow 0.15s ease;
	}

	.modal-close-btn:hover {
		background: #fdf2f8;
		border-color: #f472b6;
		color: #be185d;
		transform: scale(1.1);
		box-shadow: 0 4px 10px rgba(244, 114, 182, 0.28);
	}

	.modal-close-btn:active {
		transform: scale(0.9);
	}

	/* Candy: a tiny pink pill with a warm sepia rim — never full black. */
	.modal-close-btn.is-candy {
		top: 0.65rem;
		right: 0.65rem;
		width: 28px;
		height: 28px;
		font-size: 0.75rem;
		font-weight: 900;
		background: #fdf2f8;
		border: 1.5px solid rgba(30, 23, 20, 0.85);
		color: rgba(30, 23, 20, 0.85);
		box-shadow: 0 1.5px 0 rgba(30, 23, 20, 0.18);
	}

	.modal-close-btn.is-candy:hover {
		background: #f472b6;
		color: rgba(30, 23, 20, 0.95);
	}

	/* Fingers get a slightly bigger target */
	@media (pointer: coarse) {
		.modal-close-btn {
			width: 36px;
			height: 36px;
		}

		.modal-close-btn.is-candy {
			width: 32px;
			height: 32px;
		}
	}
</style>
