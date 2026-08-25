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
	<div class="tt-modal-md modal-box relative">
		<form method="dialog">
			<ModalCloseButton
				{closeModal}
				label="Close about modal"
				position="right-3 top-3"
				modalId="about_modal"
			/>
		</form>

		<div class="space-y-4">
			<!-- Header with Ghost -->
			<div class="flex items-center gap-3 pr-8">
				<div
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-[#fffdf5] to-pink-50 shadow-sm"
				>
					<DisplayGhost size="28px" theme={$theme} seed={12345} disableJsAnimation={true} />
				</div>
				<h3
					id="about_modal_title"
					class="text-xl font-black tracking-tight text-gray-900 sm:text-2xl"
				>
					About TalkType
				</h3>
			</div>

			<!-- Hero Headline Card -->
			<div
				class="rounded-2xl border-2 border-pink-200/80 bg-gradient-to-br from-pink-50/90 via-amber-50/70 to-pink-50/90 p-4 shadow-sm"
			>
				<h4 class="text-lg font-black leading-snug tracking-tight text-gray-900 sm:text-xl">
					Some thoughts come out <span class="tt-marker">better spoken</span> than typed.
				</h4>
				<p id="about_modal_description" class="mt-1 text-sm font-semibold text-pink-600">
					Talk, get text — that's the whole trick.
				</p>
			</div>

			<!-- Creator Note -->
			<p class="text-sm font-medium leading-relaxed text-gray-700">
				I made this because I think faster out loud — and everything else wanted an account first.
			</p>

			<!-- Badge/Pill Manifestos -->
			<div class="grid gap-2.5">
				<div
					class="shadow-xs flex items-center gap-3 rounded-xl border-2 border-pink-100 bg-white/80 px-3.5 py-2.5 transition-colors hover:border-pink-200"
				>
					<span
						class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-pink-200 bg-pink-100/70 text-xs"
						aria-hidden="true"
					>
						✨
					</span>
					<div class="min-w-0">
						<span class="text-xs font-black uppercase tracking-wider text-gray-900"
							>Zero Friction</span
						>
						<p class="text-xs text-gray-600">No accounts. No ads. No tracking.</p>
					</div>
				</div>

				<div
					class="shadow-xs flex items-center gap-3 rounded-xl border-2 border-pink-100 bg-white/80 px-3.5 py-2.5 transition-colors hover:border-pink-200"
				>
					<span
						class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-100/70 text-xs"
						aria-hidden="true"
					>
						⚡
					</span>
					<div class="min-w-0">
						<span class="text-xs font-black uppercase tracking-wider text-gray-900"
							>Local & Live</span
						>
						<p class="text-xs text-gray-600">
							Works offline with local Whisper, streams live with Deepgram.
						</p>
					</div>
				</div>

				<div
					class="shadow-xs flex items-center gap-3 rounded-xl border-2 border-pink-100 bg-white/80 px-3.5 py-2.5 transition-colors hover:border-pink-200"
				>
					<span
						class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-purple-200 bg-purple-100/70 text-xs"
						aria-hidden="true"
					>
						🎨
					</span>
					<div class="min-w-0">
						<span class="text-xs font-black uppercase tracking-wider text-gray-900">Your Words</span
						>
						<p class="text-xs text-gray-600">
							Vibes to try, voices to borrow, notes that stay yours.
						</p>
					</div>
				</div>
			</div>

			<!-- Footer Row with Chunky Buttons -->
			<div class="flex flex-wrap items-center justify-between gap-3 pt-2">
				<p class="text-xs font-medium text-gray-500">
					Made by <a
						href="https://madebypablo.app"
						target="_blank"
						rel="noopener noreferrer"
						class="font-bold text-gray-700 no-underline transition-colors hover:text-pink-600"
						>Pablo</a
					> in Melbourne
				</p>
				<div class="flex flex-wrap items-center gap-2">
					<a
						href="https://github.com/pibulus"
						target="_blank"
						rel="noopener noreferrer"
						class="shadow-xs inline-flex h-9 items-center justify-center gap-1.5 rounded-full border-2 border-pink-200/80 bg-white px-3.5 text-xs font-bold text-gray-700 transition-all duration-150 hover:border-pink-300 hover:bg-pink-50 hover:text-pink-600 active:scale-95"
						aria-label="Source code on GitHub"
					>
						<span class="text-sm" aria-hidden="true">🐙</span>
						<span>Peek under the sheet</span>
					</a>
					<a
						href="https://ko-fi.com/madebypablo"
						target="_blank"
						rel="noopener noreferrer"
						class="shadow-xs inline-flex h-9 items-center justify-center gap-1.5 rounded-full border-2 border-amber-200 bg-amber-50/70 px-3.5 text-xs font-bold text-amber-900 transition-all duration-150 hover:border-amber-300 hover:bg-amber-100 active:scale-95"
						aria-label="Support on Ko-fi"
					>
						<span class="text-sm" aria-hidden="true">☕</span>
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

<style>
	.tt-marker {
		background-image: linear-gradient(
			to top,
			rgba(249, 168, 212, 0.6) 0%,
			rgba(249, 168, 212, 0.6) 38%,
			transparent 38%
		);
		border-radius: 2px;
		padding: 0 0.08em;
	}
</style>
