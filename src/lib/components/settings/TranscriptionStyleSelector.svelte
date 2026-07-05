<script>
	import { customPrompt } from '$lib';
	import { PROMPT_STYLES } from '$lib/constants';
	import { soundService } from '$lib/services/infrastructure/soundService.js';

	export let selectedPromptStyle = 'standard';
	export let changePromptStyle = () => {};
	export let isSupporter = false;
	export let openSupporterModal = () => {};

	let customPromptText = '';
	let showCustomInput = false;
	const MAX_CUSTOM_PROMPT_LENGTH = 1200;

	const FREE_STYLE_IDS = new Set([PROMPT_STYLES.STANDARD, PROMPT_STYLES.SURLY_PIRATE]);

	const styleOptions = [
		{
			id: PROMPT_STYLES.STANDARD,
			label: 'Plain',
			requiresSupporter: false
		},
		{
			id: PROMPT_STYLES.SURLY_PIRATE,
			label: 'Pirate',
			requiresSupporter: false
		},
		{
			id: PROMPT_STYLES.CUSTOM,
			label: 'Custom',
			requiresSupporter: true
		},
		{
			id: PROMPT_STYLES.SPARKLE_POP,
			label: 'Sparkle',
			requiresSupporter: true
		}
	];

	const styleIcons = {
		[PROMPT_STYLES.STANDARD]: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-pink-500">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
		</svg>`,
		[PROMPT_STYLES.SURLY_PIRATE]: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-amber-500">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
		</svg>`,
		[PROMPT_STYLES.CUSTOM]: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-emerald-500">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
		</svg>`,
		[PROMPT_STYLES.SPARKLE_POP]: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-pink-400">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4M4 19h4m12-12v4m-2-2h4m-5 12v4m-2-2h4" />
		</svg>`
	};

	$: availableStyleIds = styleOptions.map((style) => style.id);
	$: if ($customPrompt && customPromptText !== $customPrompt) customPromptText = $customPrompt;

	$: if (!availableStyleIds.includes(selectedPromptStyle)) {
		changePromptStyle(PROMPT_STYLES.STANDARD);
	}

	$: if (!isSupporter && !FREE_STYLE_IDS.has(selectedPromptStyle)) {
		changePromptStyle(PROMPT_STYLES.STANDARD);
	}

	$: showCustomInput = selectedPromptStyle === PROMPT_STYLES.CUSTOM && isSupporter;

	function isStyleLocked(style) {
		return style.requiresSupporter && !isSupporter;
	}

	function showToast(message) {
		if (typeof window === 'undefined') return;

		window.dispatchEvent(
			new CustomEvent('talktype:toast', {
				detail: { message, type: 'info' }
			})
		);
	}

	function handleStyleClick(style) {
		if (isStyleLocked(style)) {
			soundService.locked();
			showToast('Supporter only');
			openSupporterModal();
			return;
		}

		const nextStyle =
			selectedPromptStyle === style.id && style.id !== PROMPT_STYLES.STANDARD
				? PROMPT_STYLES.STANDARD
				: style.id;

		soundService.select();
		changePromptStyle(nextStyle);
	}

	function saveCustomPrompt() {
		const prompt = customPromptText.trim().slice(0, MAX_CUSTOM_PROMPT_LENGTH);

		customPrompt.set(prompt);
	}

	function handleKeydown(event) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			saveCustomPrompt();
		}
	}
</script>

<div role="group" aria-label="Transcription style">
	<div class="grid grid-cols-4 gap-2">
		{#each styleOptions as style}
			<button
				type="button"
				class={`style-option relative flex min-h-[72px] flex-col items-center justify-center rounded-xl border bg-[#fffdf5] p-1.5 text-center shadow-sm transition-all duration-200 hover:border-pink-200 hover:shadow-md ${
					selectedPromptStyle === style.id
						? 'selected-style border-pink-300 ring-2 ring-pink-200 ring-opacity-60'
						: 'border-pink-100'
				} ${isStyleLocked(style) ? 'locked-style' : ''}`}
				on:click={() => handleStyleClick(style)}
				aria-label={isStyleLocked(style)
					? `${style.label} requires supporter mode`
					: `Choose ${style.label} style`}
				aria-pressed={selectedPromptStyle === style.id}
				title={isStyleLocked(style) ? 'Supporter' : style.label}
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
				{:else if isStyleLocked(style)}
					<div
						class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-xs text-white shadow-sm"
						title="Supporter"
						aria-hidden="true"
					>
						★
					</div>
				{/if}
			</button>
		{/each}
	</div>

	{#if showCustomInput}
		<div class="animate-in slide-in-from-top-2 mt-3 space-y-2 duration-200">
			<textarea
				bind:value={customPromptText}
				on:keydown={handleKeydown}
				on:blur={saveCustomPrompt}
				placeholder="Instructions"
				maxlength={MAX_CUSTOM_PROMPT_LENGTH}
				class="w-full rounded-lg border border-pink-200 bg-white p-3 text-sm focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
				rows="3"
				aria-label="Custom transcription instructions"
			></textarea>
		</div>
	{/if}
</div>

<style>
	.selected-style {
		box-shadow:
			0 0 0 2px rgba(249, 168, 212, 0.4),
			0 4px 8px rgba(249, 168, 212, 0.2);
	}

	.locked-style {
		opacity: 0.86;
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
