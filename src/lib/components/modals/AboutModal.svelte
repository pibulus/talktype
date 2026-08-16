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
					class="flex h-9 w-9 items-center justify-center rounded-full border border-pink-200/60 bg-gradient-to-br from-[#fffdf5] to-pink-50 shadow-sm"
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
					Some thoughts come out better spoken than typed. Talk, get text — that's the whole trick.
				</p>
			</div>

			<!-- Same short-line rhythm as the intro modal on purpose: that's the
			     voice everybody already met on their first visit. The first-person
			     line came back by request — an About with no person in it read
			     like a spec sheet, and this one sentence is the whole why. -->
			<div class="space-y-1.5 text-sm leading-relaxed text-gray-600">
				<p>
					I made this because I think faster out loud — and everything else wanted an account first.
				</p>
				<p>So: no account. No sign-up. No upsell to use it.</p>
				<p>Nothing said here is stored anywhere. Keep it private and it never leaves the phone.</p>
				<p>Vibes to try, voices to borrow, words that stay yours.</p>
			</div>

			<div class="flex flex-wrap items-center justify-between gap-3 pt-2">
				<p class="text-xs text-gray-500">Made by Pablo in Melbourne</p>
				<div class="flex items-center gap-1">
					<a
						href="https://github.com/pibulus"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-gray-600 transition-colors hover:bg-pink-50 hover:text-pink-600"
						aria-label="Source code on GitHub"
					>
						<span class="text-base" aria-hidden="true">🐙</span>
						<span>Peek under the sheet</span>
					</a>
					<a
						href="https://ko-fi.com/madebypablo"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-gray-600 transition-colors hover:bg-amber-50 hover:text-amber-600"
						aria-label="Support on Ko-fi"
					>
						<span class="text-base" aria-hidden="true">☕</span>
						<span>Buy me a coffee</span>
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
