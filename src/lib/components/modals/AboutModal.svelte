<script>
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { theme } from '$lib';
	import { ModalCloseButton } from './index.js';
	import { analytics } from '$lib/services/analytics';
	export let closeModal;

	function handleGithubClick() {
		analytics.clickExternal('github-pibulus');
	}
</script>

<dialog
	id="about_modal"
	class="modal modal-bottom fixed z-50 overflow-y-hidden sm:modal-middle"
	aria-labelledby="about_modal_title"
	aria-describedby="about_modal_description"
	aria-modal="true"
>
	<div
		class="modal-box max-h-[85vh] w-[92%] overflow-y-auto rounded-2xl border border-pink-200 bg-gradient-to-br from-[#fffaef] to-[#fff6e6] shadow-xl"
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
				<p id="about_modal_description" class="text-base leading-relaxed text-gray-700">
					TalkType turns voice into editable text. Tap the ghost, say the thing, tidy it up if you
					want.
				</p>
			</div>

			<div>
				<h4 class="mb-2 text-sm font-bold text-gray-700">The idea:</h4>
				<ul class="space-y-1.5 text-sm text-gray-600">
					<li class="flex items-start gap-2">
						<span class="text-lg text-pink-500" aria-hidden="true">⬩</span>
						<span>Live mode when speed matters</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="text-lg text-pink-500" aria-hidden="true">⬩</span>
						<span>Offline mode when privacy matters</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="text-lg text-pink-500" aria-hidden="true">⬩</span>
						<span>Fast start, simple extras, one-time supporter unlock</span>
					</li>
				</ul>
			</div>

			<div class="border-l-3 my-2 ml-1 border-pink-300 py-1 pl-4 italic text-gray-600">
				"A small voice tool with a ghost and decent manners."
			</div>

			<div class="flex items-end justify-between pt-2">
				<div>
					<p class="text-xs text-gray-500">Made with ☕ in Melbourne, Australia</p>
				</div>
				<div class="flex items-center gap-2 text-xs font-medium text-gray-600">
					<span class="animate-pulse text-pink-500">❤️</span>
					<a
						href="https://github.com/pibulus"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex min-h-11 items-center hover:text-pink-600 hover:underline"
						on:click={handleGithubClick}
					>
						Pablo / Pibulus
					</a>
				</div>
			</div>
		</div>
	</div>
	<button
		type="button"
		class="modal-backdrop bg-black/40"
		on:click={closeModal}
		on:keydown={(e) => e.key === 'Enter' && closeModal()}
		aria-label="Close about modal"
	></button>
</dialog>

<style>
	/* Animation now in app.css with tt- prefix */
</style>
