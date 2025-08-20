<script>
	import { browser } from '$app/environment';
	import Ghost from '$lib/components/ghost/Ghost.svelte';
	import { ModalCloseButton } from './index.js';

	export let closeModal;
	export let markIntroAsSeen;
	export let triggerGhostClick;

	// Use Svelte's binding instead of getElementById
	let modalElement;

	function handleActionButton() {
		if (modalElement) modalElement.close();
		markIntroAsSeen();

		setTimeout(() => {
			triggerGhostClick();
		}, 300);
	}
</script>

<dialog
	bind:this={modalElement}
	id="intro_modal"
	class="modal modal-bottom sm:modal-middle"
	aria-labelledby="intro_modal_title"
	aria-modal="true"
>
	<div
		class="intro-modal-box modal-box relative mx-auto w-[95%] max-w-[90vw] rounded-3xl border-0 bg-[#fff9ed] p-6 sm:max-w-md sm:p-8 md:max-w-lg md:p-10 lg:max-w-xl"
	>
		<form method="dialog">
			<ModalCloseButton
				{closeModal}
				position="right-4 top-4"
				size="sm"
				label="Close Intro"
				modalId="intro_modal"
			/>
		</form>

		<div class="animate-tt-fadeIn space-y-5 sm:space-y-6 md:space-y-7">
			<div class="mb-4 flex justify-center">
				<div class="animate-tt-pulse-slow ghost-wrapper h-16 w-16">
					<Ghost size="100%" clickable={false} class="intro-ghost" seed={12345} />
				</div>
			</div>

			<h1
				id="intro_modal_title"
				class="text-center text-2xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-3xl md:text-4xl lg:text-5xl"
			>
				TalkType's the best. <br /> Kick out the rest.
			</h1>

			<div class="space-y-3 sm:space-y-4">
				<p class="text-sm font-medium leading-relaxed text-gray-700 sm:text-base md:text-lg">
					Clean, sweet, and stupidly easy.
				</p>

				<p class="text-sm font-medium leading-relaxed text-gray-700 sm:text-base md:text-lg">
					Tap the ghost to speak — we turn your voice into text.
				</p>

				<p class="text-sm font-medium leading-relaxed text-gray-700 sm:text-base md:text-lg">
					Use it anywhere. Save it to your home screen. Add the extension. Talk into any box on any
					site.
				</p>
			</div>

			<button
				class="relative w-full cursor-pointer rounded-xl border border-amber-300/50 bg-gradient-to-r from-amber-100 to-amber-200 px-4 py-3 text-center text-sm font-bold text-gray-800 shadow-md transition-all duration-300 hover:bg-gradient-to-r hover:from-amber-200 hover:to-amber-300 hover:text-gray-900 hover:shadow-lg active:scale-[0.98] sm:px-5 sm:py-4 sm:text-base md:text-lg"
				on:click={handleActionButton}
			>
				You click the ghost, we do the most.
			</button>

			<p class="py-2 text-center text-base font-bold text-pink-600 sm:text-lg md:text-xl">
				It's fast, it's fun, it's freaky good.
			</p>

			<form method="dialog">
				<button
					class="w-full rounded-full bg-gradient-to-r from-yellow-400 to-pink-400 px-4 py-2.5 text-base font-bold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl sm:px-6 sm:py-3 sm:text-lg"
					on:click={markIntroAsSeen}
				>
					Let's Go! 🚀
				</button>
			</form>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
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
