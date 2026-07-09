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
	<div class="intro-modal-box tt-modal-md tt-intro-sheet modal-box relative">
		<form method="dialog">
			<ModalCloseButton
				{closeModal}
				position="right-4 top-4"
				size="sm"
				label="Close Intro"
				modalId="intro_modal"
			/>
		</form>

		<div class="space-y-4 sm:space-y-5">
			<div class="flex justify-center pt-1">
				<div class="animate-tt-pulse-slow ghost-wrapper h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]">
					<DisplayGhost size="100%" class="intro-ghost" seed={12346} />
				</div>
			</div>

			<div class="space-y-1.5 text-center">
				<h1
					id="intro_modal_title"
					class="text-[1.55rem] font-black leading-[1.15] tracking-tight text-gray-900 sm:text-3xl"
				>
					TalkType's the <span class="tt-marker">best.</span><br />Kick out the rest.
				</h1>
				<p class="text-sm font-bold tracking-tight text-pink-500 sm:text-base">
					It's fast, it's fun, it's freaky good.
				</p>
			</div>

			<ul id="intro_modal_description" class="space-y-2.5 sm:space-y-3">
				<li class="intro-feature">
					<span class="intro-chip intro-chip-rose" aria-hidden="true">🎯</span>
					<span class="min-w-0">
						<span class="intro-feature-lead">Private when you want it</span>
						<span class="intro-feature-copy">Offline mode keeps every word on your device.</span>
					</span>
				</li>
				<li class="intro-feature">
					<span class="intro-chip intro-chip-amber" aria-hidden="true">⚡</span>
					<span class="min-w-0">
						<span class="intro-feature-lead">Instant start</span>
						<span class="intro-feature-copy">Tap the ghost and talk. That's it.</span>
					</span>
				</li>
				<li class="intro-feature">
					<span class="intro-chip intro-chip-purple" aria-hidden="true">✨</span>
					<span class="min-w-0">
						<span class="intro-feature-lead">Your words, your way</span>
						<span class="intro-feature-copy">Save transcripts, switch styles, pick your vibe.</span>
					</span>
				</li>
			</ul>

			<div class="pt-1">
				<button
					type="button"
					class="min-h-12 w-full rounded-full bg-gradient-to-r from-amber-400 via-pink-400 to-pink-500 px-6 py-3 text-base font-black tracking-tight text-white shadow-lg shadow-pink-200/60 transition-all duration-150 hover:scale-[1.02] hover:shadow-xl hover:shadow-pink-200/80 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-amber-400/80 active:scale-[0.97] sm:text-lg"
					on:click={() => {
						markIntroAsSeen();
						closeModal();
					}}
				>
					Let's go
				</button>
			</div>
		</div>
	</div>
	<button type="button" class="modal-backdrop" on:click={closeModal} aria-label="Close intro modal"
	></button>
</dialog>

<style>
	/* Signature: marker-highlight swipe under the punchline word. */
	.tt-marker {
		background-image: linear-gradient(
			to top,
			rgba(249, 168, 212, 0.55) 0%,
			rgba(249, 168, 212, 0.55) 34%,
			transparent 34%
		);
		border-radius: 2px;
		padding: 0 0.06em;
	}

	/* Feature rows: pastel emoji chip + bold lead over one quiet line of copy. */
	.intro-feature {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		text-align: left;
	}

	.intro-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 2.35rem;
		height: 2.35rem;
		border-radius: 9999px;
		font-size: 1.05rem;
		box-shadow: 0 2px 6px rgba(244, 114, 182, 0.12);
	}

	.intro-chip-rose {
		background: linear-gradient(135deg, #fdf2f8, #ffe4ef);
		border: 1px solid rgba(244, 114, 182, 0.28);
	}

	.intro-chip-amber {
		background: linear-gradient(135deg, #fffbeb, #fef3c7);
		border: 1px solid rgba(245, 158, 11, 0.26);
	}

	.intro-chip-purple {
		background: linear-gradient(135deg, #faf5ff, #f1e8ff);
		border: 1px solid rgba(167, 139, 250, 0.3);
	}

	.intro-feature-lead {
		display: block;
		font-size: 0.875rem;
		font-weight: 900;
		letter-spacing: -0.01em;
		line-height: 1.3;
		color: #111827;
	}

	.intro-feature-copy {
		display: block;
		margin-top: 0.1rem;
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1.45;
		color: #4b5563;
	}

	@media (min-width: 640px) {
		.intro-feature-lead {
			font-size: 0.95rem;
		}

		.intro-feature-copy {
			font-size: 0.95rem;
		}
	}

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
