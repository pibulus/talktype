<script>
	import Ghost from '$lib/components/ghost/Ghost.svelte';
	import { theme } from '$lib';
	import { ModalCloseButton } from './index.js';
	export let closeModal;
</script>

<dialog
	id="extension_modal"
	class="modal modal-bottom fixed z-50 overflow-hidden sm:modal-middle"
	style="overflow-y: hidden!important;"
	aria-labelledby="extension_modal_title"
	aria-modal="true"
>
	<div
		class="modal-box max-h-[80vh] overflow-y-auto rounded-2xl border border-pink-200 bg-gradient-to-br from-[#fffaef] to-[#fff6e6] shadow-xl"
	>
		<form method="dialog">
			<ModalCloseButton {closeModal} label="Close extension modal" modalId="extension_modal" />
		</form>

		<div class="animate-fadeUp space-y-4">
			<div class="mb-1 flex items-center gap-3">
				<div
					class="flex h-9 w-9 items-center justify-center rounded-full border border-pink-200/60 bg-gradient-to-br from-white to-pink-50 shadow-sm"
				>
					<Ghost width="28px" height="28px" externalTheme={theme} clickable={false} seed={98765} />
				</div>
				<h3 id="extension_modal_title" class="text-xl font-black tracking-tight text-gray-800">
					Chrome Extension
				</h3>
			</div>

			<div
				class="rounded-lg border border-pink-200/60 bg-gradient-to-r from-pink-50/90 to-amber-50/90 p-4 shadow-sm"
			>
				<p class="text-sm leading-relaxed text-gray-700">
					Use TalkType everywhere on the web! Our Chrome extension lets you transcribe directly into
					any text field. Perfect for emails, social media, messaging apps, or anywhere else you
					need to type.
				</p>
			</div>

			<div
				class="rounded-xl border border-pink-200/60 bg-gradient-to-br from-white to-pink-50/50 p-4 shadow-sm"
			>
				<h4 class="mb-2 text-sm font-bold text-gray-800">Installation in 5 easy steps:</h4>
				<ol class="mt-2 list-decimal space-y-2 pl-5 text-left text-sm text-gray-700">
					<li class="pb-1">
						Download the extension files <button
							on:click={() => console.log('Download extension')}
							class="font-medium text-pink-600 transition-colors hover:text-pink-700 hover:underline"
							>here</button
						>
					</li>
					<li class="pb-1">Unzip the files to a folder on your computer</li>
					<li class="pb-1">
						Open Chrome and go to <code
							class="rounded-md bg-pink-100 px-1.5 py-0.5 font-mono text-pink-700"
							>chrome://extensions</code
						>
					</li>
					<li class="pb-1">Enable "Developer mode" in the top-right corner</li>
					<li>Click "Load unpacked" and select the extension folder</li>
				</ol>
			</div>

			<div class="flex justify-end pt-1">
				<span class="text-xs font-medium italic text-gray-600"
					>Voice-to-text anywhere, anytime 🎙️</span
				>
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
	.animate-fadeUp {
		animation: fadeUp 0.5s ease-out forwards;
	}

	@keyframes fadeUp {
		0% {
			opacity: 0;
			transform: translateY(8px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Ensure ghost container is properly styled and background is hidden */
	:global(.ghost-container) {
		background: transparent !important;
	}
</style>
