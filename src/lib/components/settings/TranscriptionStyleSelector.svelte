<script>
	import { PROMPT_STYLES } from '$lib/constants';

	export let selectedPromptStyle = 'standard';
	export let changePromptStyle = () => {};
	export let privacyModeValue = false;
	export let liveModeValue = false;
	export let isSupporter = false;
	export let openSupporterModal = () => {};

	$: stylesDisabled = liveModeValue || privacyModeValue;

	const availableStyles = [
		PROMPT_STYLES.QUILL_AND_INK,
		PROMPT_STYLES.SPARKLE_POP,
		PROMPT_STYLES.LEET_SPEAK
	];

	const styleIcons = {
		quillAndInk: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-purple-400">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
		</svg>`,
		sparklePop: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-pink-400">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4M4 19h4m12-12v4m-2-2h4m-5 12v4m-2-2h4" />
		</svg>`,
		leetSpeak: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-blue-500">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
		</svg>`
	};

	const styleNames = {
		quillAndInk: 'Victorian',
		sparklePop: 'Sparkle',
		leetSpeak: 'L33t'
	};

	$: styleTooltips = {
		quillAndInk: disabledTooltip('Victorian polish'),
		sparklePop: disabledTooltip('Extra sparkle'),
		leetSpeak: disabledTooltip('H4ck3r style')
	};
	$: styleNotice = !isSupporter
		? stylesDisabled
			? 'Supporter mode unlocks these presets. They run in After Stop mode.'
			: 'Supporter mode unlocks these style presets.'
		: stylesDisabled
			? 'Style presets are available in After Stop mode.'
			: '';

	$: if (!availableStyles.includes(selectedPromptStyle) && selectedPromptStyle !== 'standard') {
		changePromptStyle('standard');
	}

	$: if (stylesDisabled && selectedPromptStyle !== 'standard') {
		changePromptStyle('standard');
	}

	$: if (!isSupporter && selectedPromptStyle !== 'standard') {
		changePromptStyle('standard');
	}

	function disabledTooltip(fallback) {
		if (liveModeValue) return 'Use After Stop mode for style presets';
		if (privacyModeValue) return 'Use After Stop mode for style presets';
		if (!isSupporter) return 'Supporter mode unlocks style presets';
		return fallback;
	}

	function handleStyleClick(style) {
		if (!isSupporter) {
			window.dispatchEvent(
				new CustomEvent('talktype:toast', {
					detail: {
						message: 'Supporter mode unlocks style presets.',
						type: 'info'
					}
				})
			);
			openSupporterModal();
			return;
		}

		if (stylesDisabled) {
			window.dispatchEvent(
				new CustomEvent('talktype:toast', {
					detail: {
						message: 'Style presets work in After Stop mode.',
						type: 'info'
					}
				})
			);
			return;
		}

		changePromptStyle(selectedPromptStyle === style ? 'standard' : style);
	}
</script>

<div>
	{#if styleNotice}
		<div class="mb-2 rounded-lg border border-pink-200 bg-pink-50/80 p-2">
			<p class="text-xs font-medium text-pink-700">{styleNotice}</p>
		</div>
	{/if}

	<div class="grid grid-cols-3 gap-2">
		{#each availableStyles as style}
			<button
				class={`relative flex min-h-[92px] flex-col items-center justify-center rounded-xl border bg-[#fffdf5] p-2 text-center shadow-sm transition-all duration-200 hover:border-pink-200 hover:shadow-md ${
					selectedPromptStyle === style
						? 'border-pink-300 ring-2 ring-pink-200 ring-opacity-60'
						: 'border-pink-100'
				} ${stylesDisabled ? 'opacity-60' : ''}`}
				on:click={() => handleStyleClick(style)}
				aria-label={styleNames[style]}
				aria-pressed={selectedPromptStyle === style}
				title={styleTooltips[style]}
				disabled={stylesDisabled}
			>
				<div class="mb-2 flex h-10 w-10 items-center justify-center">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html styleIcons[style]}
				</div>

				<span class="text-xs font-semibold text-gray-700">{styleNames[style]}</span>

				{#if selectedPromptStyle === style}
					<div
						class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink-400 text-xs text-white shadow-sm"
					>
						✓
					</div>
				{:else if !isSupporter}
					<div
						class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-xs text-white shadow-sm"
						title="Requires supporter mode"
					>
						★
					</div>
				{/if}
			</button>
		{/each}
	</div>
</div>
