<script>
	import { onMount } from 'svelte';
	import { theme, autoRecord, showSettingsModal, applyTheme, promptStyle } from '$lib';
	import { geminiService } from '$lib/services/geminiService';
	import { PROMPT_STYLES } from '$lib/constants';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import TranscriptionStyleSelector from './TranscriptionStyleSelector.svelte';
	import { ModalCloseButton } from '../modals/index.js';

	// Props for the modal
	export let closeModal = () => {};

	// Theme/vibe selection
	let selectedVibe;
	let scrollPosition = 0;
	let autoRecordValue = false;

	// Prompt style selection
	let promptStyles = [];
	let selectedPromptStyle = 'standard';

	// Subscribe to theme store
	const unsubscribeTheme = theme.subscribe((value) => {
		selectedVibe = value;
	});

	// Subscribe to autoRecord store
	const unsubscribeAutoRecord = autoRecord.subscribe((value) => {
		autoRecordValue = value === 'true';
	});

	// Subscribe to promptStyle store
	const unsubscribePromptStyle = promptStyle.subscribe((value) => {
		selectedPromptStyle = value;
	});

	// Theme options
	const vibeOptions = [
		{
			id: 'peach',
			name: 'Peach'
		},
		{
			id: 'mint',
			name: 'Mint'
		},
		{
			id: 'bubblegum',
			name: 'Bubblegum'
		},
		{
			id: 'rainbow',
			name: 'Rainbow'
		}
	];

	// Prompt styles are now directly defined in the UI components below

	// Set up event listeners for the modal on component mount
	onMount(() => {
		// Get available prompt styles from the service
		promptStyles = geminiService.getAvailableStyles();

		// Get currently selected prompt style
		selectedPromptStyle = geminiService.getPromptStyle();

		// Set up event listeners for the modal
		const modal = document.getElementById('settings_modal');
		if (modal) {
			// Listen for custom beforeshow event
			modal.addEventListener('beforeshow', () => {
				// Just update the selected value, don't apply theme
				// The main app already has the theme applied
				// This fixes the double flash issue
			});

			// Also listen for the standard dialog open event
			modal.addEventListener('open', () => {
				// No need to apply theme here - we just want settings to reflect current state

				// Update prompt style selection in case it was changed elsewhere
				selectedPromptStyle = geminiService.getPromptStyle();
			});
		}

		// Clean up subscriptions on component destroy
		return () => {
			unsubscribeTheme();
			unsubscribeAutoRecord();
			unsubscribePromptStyle();
		};
	});

	// Handle vibe change
	function changeVibe(vibeId) {
		selectedVibe = vibeId;
		applyTheme(vibeId);

		// Dispatch a custom event that other components can listen for
		window.dispatchEvent(
			new CustomEvent('talktype-setting-changed', {
				detail: { setting: 'theme', value: vibeId }
			})
		);
	}

	// Handle prompt style change
	function changePromptStyle(style) {
		selectedPromptStyle = style;
		geminiService.setPromptStyle(style);

		// Update the store (this will also save to localStorage)
		promptStyle.set(style);

		// Dispatch a custom event that the main page can listen for
		window.dispatchEvent(
			new CustomEvent('talktype-setting-changed', {
				detail: { setting: 'promptStyle', value: style }
			})
		);
	}

	// Handle auto-record toggle
	function toggleAutoRecord() {
		autoRecordValue = !autoRecordValue;
		autoRecord.set(autoRecordValue.toString());

		// Dispatch a custom event that the main page can listen for (for backward compatibility)
		window.dispatchEvent(
			new CustomEvent('talktype-setting-changed', {
				detail: { setting: 'autoRecord', value: autoRecordValue }
			})
		);
	}

	// Handle modal opening - called when the modal is opened
	function handleModalOpen() {
		if (typeof window === 'undefined') return;

		// Get current scroll position
		scrollPosition = window.scrollY;
		const width = document.body.clientWidth;

		// Lock the body in place exactly where it was
		document.body.style.position = 'fixed';
		document.body.style.top = `-${scrollPosition}px`;
		document.body.style.width = `${width}px`;
		document.body.style.overflow = 'hidden';
	}

	// Handle modal closure - called when the modal is closed
	function handleModalClose() {
		// Restore body styles
		document.body.style.position = '';
		document.body.style.top = '';
		document.body.style.width = '';
		document.body.style.overflow = '';

		// Restore scroll position
		window.scrollTo(0, scrollPosition);

		// Call the passed closeModal function
		closeModal();
	}

	// No need to watch for changes since we'll use direct DOM methods
	// When this component is initialized, we just make sure the modal exists
</script>

<dialog
	id="settings_modal"
	class="modal fixed z-[999] overflow-hidden"
	aria-labelledby="settings_modal_title"
	aria-modal="true"
>
	<div
		class="animate-modal-enter modal-box relative max-h-[80vh] w-[95%] max-w-md overflow-y-auto rounded-2xl border border-pink-200 bg-gradient-to-br from-[#fffaef] to-[#fff6e6] shadow-xl md:max-w-lg"
	>
		<form method="dialog">
			<ModalCloseButton
				closeModal={handleModalClose}
				label="Close settings"
				position="right-2 top-2"
				modalId="settings_modal"
			/>
		</form>

		<div class="animate-fadeUp space-y-4">
			<div class="mb-1 flex items-center gap-2">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-full border border-pink-200/60 bg-gradient-to-br from-white to-pink-50 shadow-sm"
				>
					<DisplayGhost width="24px" height="24px" theme={$theme} seed={54321} />
				</div>
				<h3 id="settings_modal_title" class="text-xl font-black tracking-tight text-gray-800">
					Settings
				</h3>
			</div>

			<!-- Settings Section -->
			<div class="mb-2 space-y-2">
				<h4 class="text-sm font-bold text-gray-700">Settings</h4>

				<div
					class="mb-2 flex items-center justify-between rounded-xl border border-pink-100 bg-[#fffdf5] p-2 shadow-sm transition-all duration-200 hover:border-pink-200"
				>
					<div>
						<span class="text-sm font-medium text-gray-700">Auto-Record on Start</span>
						<p class="mt-0.5 text-xs text-gray-500">
							Start recording immediately when you open TalkType
						</p>
					</div>
					<label class="flex cursor-pointer items-center">
						<span class="sr-only"
							>Auto-Record Toggle {autoRecordValue ? 'Enabled' : 'Disabled'}</span
						>
						<div class="relative">
							<input
								type="checkbox"
								class="sr-only"
								checked={autoRecordValue}
								on:change={toggleAutoRecord}
							/>
							<div
								class={`h-5 w-10 rounded-full ${autoRecordValue ? 'bg-pink-400' : 'bg-gray-200'} transition-all duration-200`}
							></div>
							<div
								class={`absolute left-0.5 top-0.5 h-4 w-4 transform rounded-full bg-white transition-all duration-200 ${autoRecordValue ? 'translate-x-5' : ''}`}
							></div>
						</div>
					</label>
				</div>
			</div>

			<!-- Vibe Selector Section -->
			<div class="space-y-2">
				<h4 class="text-sm font-bold text-gray-700">Choose Your Vibe</h4>

				<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
					{#each vibeOptions as vibe, index}
						<button
							class="vibe-option relative flex flex-col items-center rounded-xl border border-pink-100 bg-[#fffdf5] p-2 shadow-sm transition-all duration-300 hover:border-pink-200 hover:shadow-md {selectedVibe ===
							vibe.id
								? 'selected-vibe border-pink-300 ring-2 ring-pink-200 ring-opacity-60'
								: ''}"
							data-vibe-type={vibe.id}
							on:click={() => changeVibe(vibe.id)}
						>
							<div class="preview-container mb-2">
								<!-- Use the original DisplayGhost component with masking -->
								<div class="preview-ghost-wrapper relative h-12 w-12">
									<div class="ghost-mask-wrapper">
										<DisplayGhost
											theme={vibe.id}
											size="48px"
											seed={index * 1000 + 12345}
											disableJsAnimation={true}
										/>
									</div>
								</div>
							</div>

							<span class="text-xs font-medium text-gray-700">{vibe.name}</span>

							{#if selectedVibe === vibe.id}
								<div
									class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-pink-400 text-xs text-white shadow-sm"
								>
									✓
								</div>
							{/if}
						</button>
					{/each}
				</div>
			</div>

			<!-- Prompt Style Selection Section -->
			<TranscriptionStyleSelector {selectedPromptStyle} {changePromptStyle} />

			<!-- Premium Features Section -->
			<div
				class="space-y-2 rounded-lg border border-pink-100/60 bg-gradient-to-r from-pink-50/50 to-amber-50/50 p-3 shadow-sm"
			>
				<div class="flex items-center justify-between">
					<h4 class="text-sm font-bold text-gray-700">
						Bonus Features <span class="text-xs font-normal text-pink-500">(Coming Soon)</span>
					</h4>
					<span
						class="badge badge-sm gap-1 border-amber-200 bg-amber-100 font-medium text-amber-700"
					>
						<span class="text-[10px]">✧</span> Premium
					</span>
				</div>

				<div class="space-y-2 pt-1">
					<!-- Toggle items -->
					<div class="flex items-center justify-between">
						<span class="text-xs font-medium text-gray-600">Save transcript + audio</span>
						<input type="checkbox" disabled class="toggle toggle-primary toggle-xs bg-gray-200" />
					</div>

					<div class="flex items-center justify-between">
						<span class="text-xs font-medium text-gray-600">View transcript history</span>
						<input type="checkbox" disabled class="toggle toggle-primary toggle-xs bg-gray-200" />
					</div>

					<div class="flex items-center justify-between">
						<span class="text-xs font-medium text-gray-600">Batch download everything</span>
						<input type="checkbox" disabled class="toggle toggle-primary toggle-xs bg-gray-200" />
					</div>

					<div class="flex items-center justify-between">
						<span class="text-xs font-medium text-gray-600">Custom filename builder</span>
						<input type="checkbox" disabled class="toggle toggle-primary toggle-xs bg-gray-200" />
					</div>
				</div>

				<div class="flex justify-end">
					<span class="text-xs italic text-gray-500">We're working on these goodies!</span>
				</div>
			</div>

			<div class="border-t border-pink-100 pt-2 text-center">
				<p class="text-xs text-gray-500">TalkType • Made with 💜 by Dennis & Pablo</p>
			</div>
		</div>
	</div>

	<button
		class="modal-backdrop bg-black/40"
		on:click|self|preventDefault|stopPropagation={() => {
			const modal = document.getElementById('settings_modal');
			if (modal) {
				modal.close();
				setTimeout(handleModalClose, 50);
			}
		}}
		on:keydown={(e) => e.key === 'Enter' && handleModalClose()}
		aria-label="Close modal"
	></button>
</dialog>

<style>
	/* Improve close button */
	.close-btn {
		-webkit-tap-highlight-color: transparent;
		outline: none;
		cursor: pointer;
		user-select: none;
		z-index: 1000;
	}

	.close-btn:hover {
		transform: scale(1.1);
	}

	.close-btn:active {
		transform: scale(0.95);
	}

	.animate-fadeUp {
		animation: fadeUp 0.5s cubic-bezier(0.19, 1, 0.22, 1) forwards;
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

	.selected-vibe {
		box-shadow:
			0 0 0 2px rgba(249, 168, 212, 0.4),
			0 4px 8px rgba(249, 168, 212, 0.2);
	}

	/* Ghost preview styling */
	.preview-ghost-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.3s ease;
	}

	.vibe-option:hover .preview-ghost-wrapper {
		transform: scale(1.05);
	}

	/* Container for masking the ghost - hides the background */
	.ghost-mask-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: visible;
	}

	/* Apply masking to remove background from DisplayGhost */
	.ghost-mask-wrapper :global(.display-ghost) {
		overflow: visible;
	}

	/* Target only the ghost SVG, not its container */
	.ghost-mask-wrapper :global(.ghost-svg) {
		overflow: visible;
	}

	/* Hide the ghost background rectangle */
	.ghost-mask-wrapper :global(.ghost-container) {
		background: transparent;
	}

	.ghost-mask-wrapper :global(.ghost-bg) {
		/* Ensure the ghost background doesn't show */
		opacity: 1;
	}

	.vibe-option {
		transition: all 0.2s ease-in-out;
	}

	.vibe-option:hover {
		transform: translateY(-1px);
	}

	.vibe-option:active {
		transform: translateY(0px);
	}

	/* Connect the preview eyes to the main app's Brian Eno-inspired ambient blinking system */
	.preview-eyes {
		animation: preview-blink 6s infinite;
		transform-origin: center center;
	}

	/* Each theme preview has a slightly different blink timing 
	   to create an organic, non-synchronized effect */
	.vibe-option:nth-child(1) .preview-eyes {
		animation-duration: 6.7s;
		animation-delay: 0.4s;
	}

	.vibe-option:nth-child(2) .preview-eyes {
		animation-duration: 7.3s;
		animation-delay: 1.2s;
	}

	.vibe-option:nth-child(3) .preview-eyes {
		animation-duration: 5.9s;
		animation-delay: 2.3s;
	}

	.vibe-option:nth-child(4) .preview-eyes {
		animation-duration: 8.2s;
		animation-delay: 0.7s;
	}

	@keyframes preview-blink {
		0%,
		96.5%,
		100% {
			transform: scaleY(1);
		}
		97.5% {
			transform: scaleY(0); /* Closed eyes */
		}
		98.5% {
			transform: scaleY(1); /* Open eyes */
		}
	}

	@keyframes hueShift {
		0% {
			background-position: 0% 0%;
			filter: saturate(1.3) brightness(1.1);
		}
		25% {
			background-position: 0% 33%;
			filter: saturate(1.4) brightness(1.15);
		}
		50% {
			background-position: 0% 66%;
			filter: saturate(1.5) brightness(1.2);
		}
		75% {
			background-position: 0% 100%;
			filter: saturate(1.4) brightness(1.15);
		}
		100% {
			background-position: 0% 0%;
			filter: saturate(1.3) brightness(1.1);
		}
	}

	/* Modal entrance animation - clean without !important */
	.animate-modal-enter {
		animation: modalEnter 0.4s cubic-bezier(0.19, 1, 0.22, 1) forwards;
		will-change: transform, opacity;
	}

	@keyframes modalEnter {
		0% {
			opacity: 0;
			transform: scale(0.95) translateY(10px);
		}
		60% {
			opacity: 1;
			transform: scale(1.02) translateY(-5px);
		}
		100% {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	/* Backdrop animation without fighting DaisyUI */
	@keyframes backdropFadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
