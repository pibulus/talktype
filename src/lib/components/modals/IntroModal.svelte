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
	<div class="intro-modal-box tt-modal-md modal-box relative">
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

			<div id="intro_modal_description" class="space-y-1.5 text-center">
				<p class="intro-line">Tap the ghost. Talk. That's it.</p>
				<p class="intro-line">Offline mode keeps it on your device.</p>
				<p class="intro-line">Save it, restyle it, pick your vibe.</p>
			</div>

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

	/* Feature lines: plain and centred — the words carry it, no chrome.
	   (The pastel chip row was evicted 2026-08-07: Pablo hates pillboxes.) */
	.intro-line {
		font-size: 0.92rem;
		font-weight: 800;
		letter-spacing: -0.01em;
		line-height: 1.45;
		color: #1f2937;
	}

	@media (min-width: 640px) {
		.intro-line {
			font-size: 1rem;
		}
	}

	/* Custom pink shadow for intro modal */
	.intro-modal-box {
		box-shadow:
			0 10px 25px -5px rgba(249, 168, 212, 0.3),
			0 8px 10px -6px rgba(249, 168, 212, 0.2),
			0 0 15px rgba(249, 168, 212, 0.15);
	}

	/* Tighter than the shared tt-modal-md 32rem — the first-run card stays
	   focused. Positioning and motion come from the shared layer in app.css. */
	.intro-modal-box {
		--tt-modal-panel-width: min(92vw, 28rem);
	}

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
