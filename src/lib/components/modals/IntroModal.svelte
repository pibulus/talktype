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

		<div class="space-y-4 sm:space-y-5 md:space-y-6">
			<div class="mb-3 flex justify-center sm:mb-4">
				<div class="animate-tt-pulse-slow ghost-wrapper h-14 w-14 sm:h-16 sm:w-16">
					<DisplayGhost size="100%" class="intro-ghost" seed={12345} />
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
