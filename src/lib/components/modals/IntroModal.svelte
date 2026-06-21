<script>
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { ModalCloseButton } from './index.js';

	export let closeModal;
	export let markIntroAsSeen;
</script>

<dialog
	id="intro_modal"
	class="modal"
	aria-labelledby="intro_modal_title"
	aria-describedby="intro_modal_description"
	aria-modal="true"
>
	<div class="intro-modal-box tt-modal-md modal-box relative tt-intro-sheet">
		<form method="dialog">
			<ModalCloseButton
				{closeModal}
				position="right-4 top-4"
				size="sm"
				label="Close Intro"
				modalId="intro_modal"
			/>
		</form>

		<div class="space-y-4 sm:space-y-5 md:space-y-6">
			<div class="mb-3 flex justify-center sm:mb-4">
				<div class="animate-tt-pulse-slow ghost-wrapper h-14 w-14 sm:h-16 sm:w-16">
					<DisplayGhost size="100%" class="intro-ghost" seed={12346} />
				</div>
			</div>

			<h1
				id="intro_modal_title"
				class="text-center text-2xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-3xl md:text-4xl lg:text-5xl"
			>
				TalkType's the best. <br /> Kick out the rest.
			</h1>

			<div id="intro_modal_description" class="space-y-3 sm:space-y-4">
				<p class="text-base font-medium leading-relaxed text-gray-700 sm:text-lg md:text-xl">
					🎯 <strong>Private when you want it</strong> — Offline mode keeps everything on your device,
					and live mode is there when you want speed.
				</p>

				<p class="text-base font-medium leading-relaxed text-gray-700 sm:text-lg md:text-xl">
					⚡ <strong>Instant Start</strong> — Tap the ghost and talk. Works offline after first use.
				</p>

				<p class="text-base font-medium leading-relaxed text-gray-700 sm:text-lg md:text-xl">
					✨ <strong>Your words, your way</strong> — Save transcripts, switch styles, and keep the ghost
					vibes without weird upsells.
				</p>
			</div>

			<p class="py-2 text-center text-base font-bold text-pink-600 sm:text-lg md:text-xl">
				It's fast, it's fun, it's freaky good.
			</p>

			<div>
				<button
					type="button"
					class="min-h-11 w-full rounded-full bg-gradient-to-r from-yellow-400 to-pink-400 px-4 py-2.5 text-base font-bold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl sm:px-6 sm:py-3 sm:text-lg"
					on:click={() => {
						markIntroAsSeen();
						closeModal();
					}}
				>
					click &amp; see
				</button>
			</div>
		</div>
	</div>
	<button type="button" class="modal-backdrop" on:click={closeModal} aria-label="Close intro modal"
	></button>
</dialog>

<style>
	/* Custom pink shadow for intro modal */
	.intro-modal-box {
		box-shadow:
			0 10px 25px -5px rgba(249, 168, 212, 0.3),
			0 8px 10px -6px rgba(249, 168, 212, 0.2),
			0 0 15px rgba(249, 168, 212, 0.15);
	}

	/* SKELETON: cap intro panel width to 28rem (overrides shared tt-modal-md
	   32rem for this modal only — keeps a tighter, focused first-run card). */
	.intro-modal-box.tt-intro-sheet {
		--tt-modal-panel-width: min(92vw, 28rem);
	}

	/* SKELETON: mobile bottom-sheet below 640px — full-width docked panel,
	   rounded top only, safe-area-inset-bottom padding. Above 640px it stays
	   the centered card (default .modal-box behaviour). Scoped via :global to
	   #intro_modal so sibling modals are untouched. */
	@media (max-width: 639px) {
		:global(#intro_modal.modal[open]),
		:global(#intro_modal.modal.modal-open) {
			align-items: end !important;
			justify-items: stretch !important;
			padding: 0 !important;
		}

		.intro-modal-box.tt-intro-sheet {
			--tt-modal-panel-width: 100%;
			width: 100%;
			max-width: 100%;
			max-height: min(90dvh, var(--modal-max-height));
			margin: 0;
			align-self: end;
			border-bottom: 0;
			border-radius: 1.5rem 1.5rem 0 0;
			padding-bottom: calc(1.25rem + env(safe-area-inset-bottom, 0px));
		}
	}

	/* SKELETON: on mobile the sheet rises from the bottom edge instead of the
	   default centered pop. Honors the shared closing/reduced-motion handling
	   from app.css (close anim + prefers-reduced-motion already live there). */
	@media (max-width: 639px) {
		:global(#intro_modal.modal[open]:not(.tt-modal-closing) > .intro-modal-box.tt-intro-sheet) {
			animation: tt-intro-sheet-up 360ms cubic-bezier(0.18, 0.92, 0.2, 1.08) both;
		}

		:global(#intro_modal.modal.tt-modal-closing > .intro-modal-box.tt-intro-sheet) {
			animation: tt-intro-sheet-down 220ms cubic-bezier(0.4, 0, 0.2, 1) both;
		}
	}

	@keyframes tt-intro-sheet-up {
		from {
			opacity: 0;
			transform: translateY(100%);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes tt-intro-sheet-down {
		from {
			opacity: 1;
			transform: translateY(0);
		}
		to {
			opacity: 0;
			transform: translateY(100%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(#intro_modal.modal[open]:not(.tt-modal-closing) > .intro-modal-box.tt-intro-sheet),
		:global(#intro_modal.modal.tt-modal-closing > .intro-modal-box.tt-intro-sheet) {
			animation: none;
		}
	}

	/* Animations now in app.css with tt- prefix */

	/* Ghost wrapper styles to hide background container */
	.ghost-wrapper {
		position: relative;
		z-index: 1;
	}

	/* Target and modify the ghost button container */
	.ghost-wrapper :global(button.ghost-container) {
		background: transparent !important;
		box-shadow: none !important;
		filter: none !important;
		animation: none !important;
		contain: none !important; /* Remove containment which may affect transparency */
	}

	/* Target ghost container and remove any box shadows or backgrounds */
	.ghost-wrapper :global(.ghost-container),
	.ghost-wrapper :global(.ghost-svg) {
		background-color: transparent !important;
		box-shadow: none !important;
		filter: none !important;
	}

	/* Target pseudo elements that might have backgrounds */
	.ghost-wrapper :global(.ghost-container::before),
	.ghost-wrapper :global(.ghost-container::after) {
		display: none !important;
	}

	/* Apply animation only to the ghost SVG elements */
	.ghost-wrapper :global(svg.ghost-svg .ghost-layer) {
		animation: intro-pulse 3s ease-in-out infinite;
	}

	@keyframes intro-pulse {
		0%,
		100% {
			filter: brightness(1) saturate(1);
		}
		50% {
			filter: brightness(1.1) saturate(1.1);
		}
	}
</style>
