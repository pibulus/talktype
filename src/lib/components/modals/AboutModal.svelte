<script>
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { theme } from '$lib';
	import { ModalCloseButton } from './index.js';
	export let closeModal;
</script>

<dialog
	id="about_modal"
	class="modal modal-bottom fixed z-50 overflow-y-hidden sm:modal-middle"
	aria-labelledby="about_modal_title"
	aria-modal="true"
>
	<div
		class="modal-box max-h-[80vh] overflow-y-auto rounded-2xl border border-pink-200 bg-gradient-to-br from-[#fffaef] to-[#fff6e6] shadow-xl"
	>
		<form method="dialog">
			<ModalCloseButton {closeModal} label="Close about modal" modalId="about_modal" />
		</form>

		<div class="animate-tt-fadeUp space-y-4">
			<div class="mb-1 flex items-center gap-3">
				<div
					class="flex h-9 w-9 items-center justify-center rounded-full border border-pink-200/60 bg-gradient-to-br from-white to-pink-50 shadow-sm"
				>
					<DisplayGhost size="28px" theme={$theme} seed={12345} />
				</div>
				<h3 id="about_modal_title" class="text-xl font-black tracking-tight text-gray-800">
					About TalkType
				</h3>
			</div>

			<div
				class="rounded-lg border border-pink-200/60 bg-gradient-to-r from-pink-50/90 to-amber-50/90 p-4 shadow-sm"
			>
				<p class="text-sm leading-relaxed text-gray-700">
					TalkType is a minimalist voice-to-text tool that transforms your speech into text
					effortlessly. Built with love by two friends who think tech should be <span
						class="font-medium text-pink-600">simple</span
					>,
					<span class="font-medium text-amber-600">delightful</span>, and actually
					<span class="font-medium text-pink-600">helpful</span>.
				</p>
			</div>

			<div>
				<h4 class="mb-2 text-sm font-bold text-gray-700">Why we made this:</h4>
				<ul class="space-y-1.5 text-sm text-gray-600">
					<li class="flex items-start gap-2">
						<span class="text-lg text-pink-500">⬩</span>
						<span>We both think better by <span class="italic">talking</span>, not typing</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="text-lg text-pink-500">⬩</span>
						<span>Other voice-typing tools are either expensive or clunky</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="text-lg text-pink-500">⬩</span>
						<span>We wanted something beautiful that just works</span>
					</li>
				</ul>
			</div>

			<div class="border-l-3 my-2 ml-1 border-pink-300 py-1 pl-4 italic text-gray-600">
				"A little bit of soul, a hint of chaos, and a deep love for clarity."
			</div>

			<div class="flex items-end justify-between pt-2">
				<div>
					<p class="text-xs text-gray-500">Made with ☕ in Melbourne, Australia</p>
				</div>
				<div class="flex items-center gap-2 text-xs font-medium text-gray-600">
					<span class="animate-pulse text-pink-500">❤️</span> Dennis & Pabs
				</div>
			</div>
		</div>
	</div>
	<button
		class="modal-backdrop bg-black/40"
		on:click={closeModal}
		on:keydown={(e) => e.key === 'Enter' && closeModal()}
		aria-label="Close modal"
	></button>
</dialog>

<style>
	/* Animation now in app.css with tt- prefix */
</style>
