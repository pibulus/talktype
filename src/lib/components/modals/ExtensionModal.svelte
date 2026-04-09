<script>
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { theme } from '$lib';
	import { ModalCloseButton } from './index.js';
	export let closeModal;
</script>

<dialog
	id="extension_modal"
	class="modal modal-bottom fixed z-50 overflow-y-hidden sm:modal-middle"
	aria-labelledby="extension_modal_title"
	aria-modal="true"
>
	<div
		class="modal-box max-h-[80vh] overflow-y-auto rounded-2xl border border-pink-200 bg-gradient-to-br from-[#fffaef] to-[#fff6e6] shadow-xl"
	>
		<form method="dialog">
			<ModalCloseButton {closeModal} label="Close extension modal" modalId="extension_modal" />
		</form>

		<div class="animate-tt-fadeUp space-y-4">
			<div class="mb-1 flex items-center gap-3">
				<div
					class="flex h-9 w-9 items-center justify-center rounded-full border border-pink-200/60 bg-gradient-to-br from-white to-pink-50 shadow-sm"
				>
					<DisplayGhost width="28px" height="28px" theme={$theme} seed={98765} />
				</div>
				<h3 id="extension_modal_title" class="text-xl font-black tracking-tight text-gray-800">
					Chrome Extension
				</h3>
			</div>

			<div
				class="rounded-lg border border-pink-200/60 bg-gradient-to-r from-pink-50/90 to-amber-50/90 p-4 shadow-sm"
			>
				<p class="text-sm leading-relaxed text-gray-700">
					Use TalkType everywhere on the web. The extension drops voice typing into text boxes,
					textareas, and rich editors so you can dictate straight into Gmail, Notion, chat apps,
					forms, and docs.
				</p>
			</div>

			<div
				class="rounded-xl border border-pink-200/60 bg-gradient-to-br from-white to-pink-50/50 p-4 shadow-sm"
			>
				<h4 class="mb-2 text-sm font-bold text-gray-800">Right now:</h4>
				<p class="mb-3 text-sm leading-relaxed text-gray-700">
					The extension is in manual-install mode while the Chrome Web Store listing gets packaged.
				</p>
				<ol class="mt-2 list-decimal space-y-2 pl-5 text-left text-sm text-gray-700">
					<li class="pb-1">Download or clone the extension repo from GitHub</li>
					<li class="pb-1">Unzip the files to a folder on your computer</li>
					<li class="pb-1">
						Open Chrome and go to <code
							class="rounded-md bg-pink-100 px-1.5 py-0.5 font-mono text-pink-700"
							>chrome://extensions</code
						>
					</li>
					<li class="pb-1">Enable "Developer mode" in the top-right corner</li>
					<li>Click "Load unpacked" and select the <code class="rounded-md bg-pink-100 px-1.5 py-0.5 font-mono text-pink-700">src</code> folder</li>
				</ol>
			</div>

			<div class="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
				<a
					href="/extension"
					class="inline-flex items-center justify-center rounded-xl border border-pink-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-pink-300 hover:text-pink-600"
				>
					See install guide
				</a>
				<a
					href="https://github.com/pibulus/talktype_extension"
					target="_blank"
					rel="noreferrer"
					class="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
				>
					Open repo
				</a>
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

	/* Ensure ghost container is properly styled and background is hidden */
	:global(.ghost-container) {
		background: transparent !important;
	}
</style>
