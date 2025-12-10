<script>
	import { ModalCloseButton } from './index.js';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { browser } from '$app/environment';

	export let closeModal = () => {};

	function handleClose() {
		closeModal();
	}
</script>

<dialog
	id="install_pwa_modal"
	class="modal fixed z-[1000]"
	aria-labelledby="install_pwa_title"
	aria-modal="true"
>
	<div
		class="animate-modal-enter modal-box relative max-h-[85vh] w-[95%] max-w-md overflow-y-auto rounded-3xl border-2 border-pink-200 bg-white p-0 shadow-2xl"
	>
		<div class="bg-gradient-to-br from-pink-50 to-purple-50 px-6 pb-6 pt-8">
			<form method="dialog">
				<ModalCloseButton
					closeModal={handleClose}
					label="Close instructions"
					position="right-3 top-3"
					modalId="install_pwa_modal"
				/>
			</form>

			<div class="flex flex-col items-center text-center">
				<div
					class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg ring-4 ring-pink-100"
				>
					<DisplayGhost width="48px" height="48px" theme="peach" seed={123} />
				</div>
				<h3 id="install_pwa_title" class="text-2xl font-black tracking-tight text-gray-800">
					Get the App
				</h3>
				<p class="mt-2 text-sm font-medium text-gray-600">
					Install TalkType for the best experience. <br /> It's free, private, and looks great.
				</p>
			</div>
		</div>

		<div class="space-y-6 px-6 py-6">
			<!-- iOS Instructions -->
			<div class="rounded-2xl border border-gray-100 bg-gray-50 p-4">
				<div class="mb-2 flex items-center gap-2">
					<span class="text-xl">🍎</span>
					<h4 class="font-bold text-gray-800">iPhone / iPad (Safari or Chrome)</h4>
				</div>
				<ol class="ml-4 list-decimal space-y-2 text-sm text-gray-600">
					<li>Tap the <span class="font-bold text-blue-600">Share</span> button (box with arrow)</li>
					<li>Scroll down and tap <span class="font-bold text-gray-800">Add to Home Screen</span></li>
					<li>Tap <span class="font-bold text-blue-600">Add</span> in the top right</li>
				</ol>
			</div>

			<!-- Android Instructions -->
			<div class="rounded-2xl border border-gray-100 bg-gray-50 p-4">
				<div class="mb-2 flex items-center gap-2">
					<span class="text-xl">🤖</span>
					<h4 class="font-bold text-gray-800">Android</h4>
				</div>
				<ol class="ml-4 list-decimal space-y-2 text-sm text-gray-600">
					<li>Tap the <span class="font-bold text-gray-800">three dots</span> menu</li>
					<li>Tap <span class="font-bold text-gray-800">Install App</span> or <span class="font-bold text-gray-800">Add to Home Screen</span></li>
					<li>Follow the prompt to install</li>
				</ol>
			</div>

			<!-- Desktop Instructions -->
			<div class="rounded-2xl border border-gray-100 bg-gray-50 p-4">
				<div class="mb-2 flex items-center gap-2">
					<span class="text-xl">💻</span>
					<h4 class="font-bold text-gray-800">Desktop</h4>
				</div>
				<p class="text-sm text-gray-600">
					Click the <span class="font-bold text-gray-800">Install icon</span> in your browser's address bar (usually on the right side).
				</p>
			</div>

			<button
				class="btn w-full border-none bg-gradient-to-r from-pink-400 to-purple-500 text-white shadow-md hover:from-pink-500 hover:to-purple-600"
				on:click={handleClose}
			>
				Got it!
			</button>
		</div>
	</div>

	<button
		class="modal-backdrop bg-black/40 backdrop-blur-sm"
		aria-label="Close modal"
		on:click|self|preventDefault|stopPropagation={() => {
			if (browser) {
				const modal = document.getElementById('install_pwa_modal');
				if (modal) modal.close();
				handleClose();
			}
		}}
	></button>
</dialog>

<style>
	.animate-modal-enter {
		animation: modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes modalPop {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(10px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}
</style>
