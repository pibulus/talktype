<script>
	import { customPrompt } from '$lib';
	import { PROMPT_STYLES } from '$lib/constants';
	import { MAX_CUSTOM_PROMPT_CHARS } from '$lib/prompts';
	import { soundService } from '$lib/services/infrastructure/soundService.js';

	export let selectedPromptStyle = 'standard';
	export let changePromptStyle = () => {};
	export let isSupporter = false;
	export let openSupporterModal = () => {};

	let customPromptText = '';

	// Three demo styles, not four, and no tile for "Plain" — plain IS no
	// selection, so a whole panel saying "nothing happens" was dead space and
	// left the row misaligned with the 3-up Output Mode grid above it.
	//
	// The three are deliberately on DIFFERENT axes, because the point of this
	// row is to make someone realise they could write their own:
	//   Pirate — funny        (voice)
	//   Austen — beautiful    (register and craft)
	//   Code   — useful       (restructures rambling into a usable prompt)
	// Three joke voices would only ever demonstrate jokes.
	const styleOptions = [
		{ id: PROMPT_STYLES.SURLY_PIRATE, label: 'Pirate' },
		{ id: PROMPT_STYLES.QUILL_AND_INK, label: 'Austen' },
		{ id: PROMPT_STYLES.CODE_WHISPERER, label: 'Code' }
	];

	const styleIcons = {
		[PROMPT_STYLES.SURLY_PIRATE]: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-amber-500">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
		</svg>`,
		[PROMPT_STYLES.QUILL_AND_INK]: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-violet-500">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
		</svg>`,
		[PROMPT_STYLES.CODE_WHISPERER]: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-emerald-500">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
		</svg>`
	};

	// Anyone carrying a retired style in localStorage (Sparkle, l33t) lands back
	// on plain rather than on a tile that no longer exists.
	const validStyleIds = [
		PROMPT_STYLES.STANDARD,
		PROMPT_STYLES.CUSTOM,
		...styleOptions.map((s) => s.id)
	];

	$: if (!validStyleIds.includes(selectedPromptStyle)) {
		changePromptStyle(PROMPT_STYLES.STANDARD);
	}

	$: if ($customPrompt && customPromptText !== $customPrompt) customPromptText = $customPrompt;

	$: if (!isSupporter && selectedPromptStyle === PROMPT_STYLES.CUSTOM) {
		changePromptStyle(PROMPT_STYLES.STANDARD);
	}

	$: isCustomOn = selectedPromptStyle === PROMPT_STYLES.CUSTOM;
	$: showCustomInput = isCustomOn && isSupporter;
	$: customRemaining = MAX_CUSTOM_PROMPT_CHARS - customPromptText.length;

	function showToast(message) {
		if (typeof window === 'undefined') return;

		window.dispatchEvent(
			new CustomEvent('talktype:toast', {
				detail: { message, type: 'info' }
			})
		);
	}

	function handleStyleClick(style) {
		// Tapping the active tile turns it off — plain is the absence of a choice.
		const nextStyle = selectedPromptStyle === style.id ? PROMPT_STYLES.STANDARD : style.id;

		soundService.select();
		changePromptStyle(nextStyle);
	}

	function handleCustomClick() {
		if (!isSupporter) {
			soundService.locked();
			showToast('Supporter only');
			openSupporterModal();
			return;
		}

		soundService.select();
		changePromptStyle(isCustomOn ? PROMPT_STYLES.STANDARD : PROMPT_STYLES.CUSTOM);
	}

	function saveCustomPrompt() {
		customPrompt.set(customPromptText.trim().slice(0, MAX_CUSTOM_PROMPT_CHARS));
	}

	function handleKeydown(event) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			saveCustomPrompt();
		}
	}
</script>

<div role="group" aria-label="Transcription style" class="space-y-2">
	<div class="grid grid-cols-3 gap-2">
		{#each styleOptions as style}
			<button
				type="button"
				class={`style-option relative flex min-h-[72px] flex-col items-center justify-center rounded-xl border bg-[#fffdf5] p-1.5 text-center shadow-sm transition-all duration-200 hover:border-pink-200 hover:shadow-md ${
					selectedPromptStyle === style.id
						? 'selected-style border-pink-300 ring-2 ring-pink-200 ring-opacity-60'
						: 'border-pink-100'
				}`}
				on:click={() => handleStyleClick(style)}
				aria-label={`Choose ${style.label} style`}
				aria-pressed={selectedPromptStyle === style.id}
				title={style.label}
			>
				<div class="mb-1 flex h-7 w-7 items-center justify-center">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html styleIcons[style.id]}
				</div>

				<span class="text-xs font-semibold leading-tight text-gray-700">{style.label}</span>

				{#if selectedPromptStyle === style.id}
					<div
						class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink-400 text-xs text-white shadow-sm"
						aria-hidden="true"
					>
						✓
					</div>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Custom gets its own row rather than a fourth tile. It isn't a peer of the
	     presets — it's the door the presets are advertising — and the row idiom
	     matches Your Words and Auto Start further down the modal. -->
	<button
		type="button"
		class={`setting-row flex min-h-12 w-full items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left shadow-sm transition-all duration-200 ${
			isCustomOn
				? 'border-pink-300 bg-pink-50 text-gray-900 ring-2 ring-pink-100'
				: 'border-pink-100 bg-[#fffdf5] text-gray-700 hover:border-pink-200 hover:bg-pink-50/70'
		}`}
		aria-pressed={isCustomOn}
		aria-label={isSupporter
			? 'Write your own output style'
			: 'Writing your own style requires supporter mode'}
		on:click={handleCustomClick}
	>
		<span class="flex items-center gap-3">
			<span class="block text-sm font-black">Write your own</span>
		</span>
		{#if !isSupporter}
			<span
				class="shrink-0 rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900"
			>
				Unlock
			</span>
		{:else}
			<span
				class="text-pink-300 transition-transform duration-200 {isCustomOn ? 'rotate-90' : ''}"
				aria-hidden="true">▸</span
			>
		{/if}
	</button>

	{#if showCustomInput}
		<div class="animate-in slide-in-from-top-2 space-y-1 px-1 duration-200">
			<textarea
				bind:value={customPromptText}
				on:keydown={handleKeydown}
				on:blur={saveCustomPrompt}
				placeholder="Describe how you want it to read. Try: like a nature documentary narrator."
				maxlength={MAX_CUSTOM_PROMPT_CHARS}
				class="w-full rounded-lg border border-pink-200 bg-[#fffdf5] p-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
				rows="3"
				aria-label="Custom transcription instructions"
			></textarea>
			<p class="text-right text-[11px] text-gray-400" aria-live="polite">
				{customRemaining} left
			</p>
		</div>
	{/if}
</div>

<style>
	.selected-style {
		box-shadow:
			0 0 0 2px rgba(249, 168, 212, 0.4),
			0 4px 8px rgba(249, 168, 212, 0.2);
	}

	.setting-row {
		contain: content;
	}

	textarea {
		min-height: 80px;
		resize: vertical;
	}

	@keyframes slide-in-from-top-2 {
		from {
			transform: translateY(-8px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.animate-in {
		animation: slide-in-from-top-2 0.2s ease-out;
	}
</style>
