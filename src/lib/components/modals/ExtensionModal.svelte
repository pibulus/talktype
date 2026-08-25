<script>
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { theme } from '$lib';
	import { ModalCloseButton } from './index.js';
	export let closeModal;

	const downloadUrl = '/downloads/talktype-extension.zip';
</script>

<dialog
	id="extension_modal"
	class="modal"
	aria-labelledby="extension_modal_title"
	aria-describedby="extension_modal_description"
	aria-modal="true"
>
	<div class="tt-modal-md modal-box relative">
		<form method="dialog">
			<ModalCloseButton {closeModal} label="Close extension modal" modalId="extension_modal" />
		</form>

		<div class="space-y-4">
			<div class="mb-1 flex items-center gap-3">
				<div
					class="flex h-9 w-9 items-center justify-center rounded-full border border-pink-200/60 bg-gradient-to-br from-white to-pink-50 shadow-sm"
				>
					<DisplayGhost size="28px" theme={$theme} seed={54321} />
				</div>
				<h3 id="extension_modal_title" class="text-xl font-black tracking-tight text-gray-800">
					Chrome Extension
				</h3>
			</div>

			<div
				class="rounded-lg border border-pink-200/60 bg-gradient-to-r from-pink-50/90 to-amber-50/90 p-4 shadow-sm"
			>
				<p id="extension_modal_description" class="text-base leading-relaxed text-gray-700">
					Voice-to-text for any text input on the web. Works in Gmail, Twitter/X, Discord, Claude,
					ChatGPT, and anywhere else you type.
				</p>
			</div>

			<div class="space-y-2 text-sm leading-relaxed text-gray-600">
				<p class="font-semibold text-gray-800">Install in 30 seconds:</p>
				<ol class="list-decimal space-y-1.5 pl-5">
					<li class="pb-1">Download and unzip the extension</li>
					<li class="pb-1">
						Open <code
							class="rounded-md bg-pink-100 px-1.5 py-0.5 font-mono font-bold text-pink-600"
							>chrome://extensions</code
						>
					</li>
					<li class="pb-1">Enable "Developer mode" in the top-right corner</li>
					<li>
						Click "Load unpacked" and select the <code
							class="rounded-md bg-pink-100 px-1.5 py-0.5 font-mono font-bold text-pink-600"
							>talktype-extension</code
						> folder
					</li>
				</ol>
			</div>

			<div class="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
				<a
					href={downloadUrl}
					download
					class="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
				>
					Download zip
				</a>
				<a
					href="/extension"
					class="inline-flex min-h-11 items-center justify-center rounded-xl border border-pink-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-pink-300 hover:text-pink-600"
				>
					See install guide
				</a>
				<a
					href="https://github.com/pibulus/talktype_extension"
					target="_blank"
					rel="noreferrer"
					class="inline-flex min-h-11 items-center justify-center rounded-xl border border-pink-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-pink-300 hover:text-pink-600"
				>
					Open repo
				</a>
			</div>
		</div>
	</div>
	<button
		type="button"
		class="modal-backdrop"
		on:click={closeModal}
		on:keydown={(e) => e.key === 'Enter' && closeModal()}
		aria-label="Close extension modal"
	></button>
</dialog>

<style>
	#extension_modal :global(.ghost-container) {
		background: transparent !important;
	}
</style>
