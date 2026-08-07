<script>
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { theme } from '$lib';
	import { ModalCloseButton } from './index.js';
	export let closeModal;
</script>

<dialog
	id="about_modal"
	class="modal"
	aria-labelledby="about_modal_title"
	aria-describedby="about_modal_description"
	aria-modal="true"
>
	<div class="tt-modal-md modal-box">
		<form method="dialog">
			<ModalCloseButton {closeModal} label="Close about modal" modalId="about_modal" />
		</form>

		<div class="space-y-4">
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
					Some ideas come out better talked than typed. So: talk, get text.
				</p>
			</div>

			<p class="text-sm leading-relaxed text-gray-600">
				No account, no upsell to use it. It runs on your phone, and talking is faster than thumbs.
			</p>

			<p class="flex items-center gap-1.5 pt-1 text-xs leading-relaxed text-gray-500">
				<span class="text-pink-500" aria-hidden="true">🔒</span>
				<span>Nothing you say is stored. Offline Mode keeps it all on your device.</span>
			</p>

			<div class="flex flex-wrap items-center justify-between gap-3 pt-2">
				<p class="text-xs text-gray-500">Made by Pablo in Melbourne ☕</p>
				<div class="flex items-center gap-1">
					<a
						href="https://github.com/pibulus"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-gray-600 transition-colors hover:bg-pink-50 hover:text-pink-600"
						aria-label="Pablo on GitHub"
					>
						<span class="text-base" aria-hidden="true">🐙</span>
						<span>GitHub</span>
					</a>
					<a
						href="https://ko-fi.com/madebypablo"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-gray-600 transition-colors hover:bg-amber-50 hover:text-amber-600"
						aria-label="Support on Ko-fi"
					>
						<span class="text-base" aria-hidden="true">☕</span>
						<span>Ko-fi</span>
					</a>
				</div>
			</div>
		</div>
	</div>
	<button
		type="button"
		class="modal-backdrop"
		on:click={closeModal}
		on:keydown={(e) => e.key === 'Enter' && closeModal()}
		aria-label="Close about modal"
	></button>
</dialog>
