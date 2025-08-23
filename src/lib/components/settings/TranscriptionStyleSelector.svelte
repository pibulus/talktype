<script>
	import { promptStyle, customPrompt } from '$lib';
	import { geminiService } from '$lib/services/geminiService';
	import { PROMPT_STYLES } from '$lib/constants';

	// Props
	export let selectedPromptStyle = 'standard';
	export let changePromptStyle = () => {};

	// State for custom prompt
	let showCustomInput = false;
	let customPromptText = '';

	// Subscribe to custom prompt store
	$: if ($customPrompt) customPromptText = $customPrompt;

	// Available styles - only 3 options now
	const availableStyles = [
		PROMPT_STYLES.STANDARD,
		PROMPT_STYLES.SURLY_PIRATE,
		PROMPT_STYLES.QUILL_AND_INK,
		'custom'
	];

	// Style icons with pastel colors
	const styleIcons = {
		standard: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-pink-500">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>`,
		surlyPirate: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-amber-500">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                 </svg>`,
		quillAndInk: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-purple-400">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                 </svg>`,
		custom: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-green-400">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>`
	};

	// Style names
	const styleNames = {
		standard: 'Standard',
		surlyPirate: 'Pirate',
		quillAndInk: 'Victorian',
		custom: 'Custom'
	};

	// Style tooltips
	const styleTooltips = {
		standard: 'Clean, professional tone',
		surlyPirate: 'Pirate lingo & swagger',
		quillAndInk: 'Victorian literature style',
		custom: 'Your own instructions'
	};

	// Handle style selection
	function handleStyleClick(style) {
		if (style === 'custom') {
			// Show custom input and switch to custom mode
			showCustomInput = true;
			selectedPromptStyle = 'custom';
			changePromptStyle('custom');
		} else {
			// Hide custom input and switch to selected style
			showCustomInput = false;
			selectedPromptStyle = style;
			changePromptStyle(style);
		}
	}

	// Save custom prompt
	function saveCustomPrompt() {
		if (customPromptText.trim()) {
			$customPrompt = customPromptText.trim();
			geminiService.setCustomPrompt(customPromptText.trim());
		}
	}

	// Handle enter key in textarea
	function handleKeydown(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			saveCustomPrompt();
		}
	}
</script>

<div>
	<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
		{#each availableStyles as style}
			<button
				class="vibe-option relative flex flex-col items-center rounded-xl border border-pink-100 bg-[#fffdf5] p-2 shadow-sm transition-all duration-300 hover:border-pink-200 hover:shadow-md {selectedPromptStyle ===
				style
					? 'selected-vibe border-pink-300 ring-2 ring-pink-200 ring-opacity-60'
					: ''}"
				on:click={() => handleStyleClick(style)}
				aria-label={styleNames[style] || style}
				title={styleTooltips[style]}
				data-style-type={style}
			>
				<div class="preview-container mb-2">
					<div class="preview-ghost-wrapper relative h-12 w-12">
						<div
							class="preview-icon-layers relative flex h-full w-full items-center justify-center"
							style="pointer-events: none;"
						>
							{@html styleIcons[style] || ''}
						</div>
					</div>
				</div>

				<!-- Style Name -->
				<span class="text-xs font-medium text-gray-700">{styleNames[style] || style}</span>

				<!-- Selected indicator -->
				{#if selectedPromptStyle === style}
					<div
						class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-pink-400 text-xs text-white shadow-sm"
					>
						✓
					</div>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Custom prompt input area -->
	{#if showCustomInput}
		<div class="animate-in slide-in-from-top-2 mt-3 space-y-2 duration-200">
			<textarea
				bind:value={customPromptText}
				on:keydown={handleKeydown}
				on:blur={saveCustomPrompt}
				placeholder="Write your custom transcription instructions..."
				class="w-full rounded-lg border border-pink-200 bg-white p-3 text-sm focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
				rows="3"
			></textarea>
			<p class="text-xs text-gray-500">Press Enter to save your custom prompt</p>
		</div>
	{/if}
</div>

<style>
	.selected-vibe {
		box-shadow:
			0 0 0 2px rgba(249, 168, 212, 0.4),
			0 4px 8px rgba(249, 168, 212, 0.2);
	}

	textarea {
		resize: vertical;
		min-height: 80px;
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
