<script>
	import { onMount } from 'svelte';
	import { theme, autoRecord, autoSave, applyTheme, promptStyle } from '$lib';
	import { geminiService } from '$lib/services/geminiService';
	import { installPromptEvent } from '$lib/stores/pwa';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import ThemeSelector from './ThemeSelector.svelte';
	import TranscriptionStyleSelector from './TranscriptionStyleSelector.svelte';
	import KeyboardShortcutsInfo from './KeyboardShortcutsInfo.svelte';
	import SupportSection from './SupportSection.svelte';
	import { ModalCloseButton } from '../modals/index.js';
	import { Toggle } from '../shared';

	// Props for the modal
	export let closeModal = () => {};

	// Theme/vibe selection
	let selectedVibe;
	let autoRecordValue = false;

	// Prompt style selection
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

	// Theme options are now handled in ThemeSelector component

	// Prompt styles are now directly defined in the UI components below
	let promptStyles = [];

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

	// Handle modal closure - called when the modal is closed
	function handleModalClose() {
		// Modal service handles restoration

		// Call the passed closeModal function
		closeModal();
	}

	// Handle PWA install
	async function handleInstallClick() {
		if ($installPromptEvent) {
			try {
				$installPromptEvent.prompt();
				const { outcome } = await $installPromptEvent.userChoice;
				if (outcome === 'accepted') {
					// Clear the event after successful install
					$installPromptEvent = null;
				}
			} catch (err) {
				console.error('Install failed:', err);
			}
		}
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
					Options
				</h3>
			</div>

			<!-- Settings Sections -->
			<div class="space-y-3">
				<!-- Section: Vibes -->
				<section class="space-y-2">
					<h3 class="text-xs font-medium uppercase tracking-widest text-gray-500">Vibes</h3>
					<ThemeSelector currentTheme={selectedVibe} onThemeChange={changeVibe} />
				</section>

				<div class="divider my-1 opacity-10"></div>

				<!-- Section: Personality -->
				<section class="space-y-2">
					<h3 class="text-xs font-medium uppercase tracking-widest text-gray-500">Personality</h3>
					<TranscriptionStyleSelector {selectedPromptStyle} {changePromptStyle} />
				</section>

				<div class="divider my-1 opacity-10"></div>

				<!-- Section: Automagic -->
				<section class="space-y-2">
					<h3 class="text-xs font-medium uppercase tracking-widest text-gray-500">Automagic</h3>
					<Toggle
						label="Auto-Record on Start"
						description="Start recording immediately when you open TalkType"
						bind:checked={autoRecordValue}
						on:change={toggleAutoRecord}
					/>
					<Toggle
						label="Auto-Save Transcripts"
						description="Automatically save all your transcriptions"
						bind:checked={$autoSave === 'true'}
						on:change={() => {
							const newValue = $autoSave === 'true' ? 'false' : 'true';
							$autoSave = newValue;
							window.dispatchEvent(
								new CustomEvent('talktype-setting-changed', {
									detail: { setting: 'autoSave', value: newValue === 'true' }
								})
							);
						}}
					/>
				</section>

				<div class="divider my-1 opacity-10"></div>

				<!-- Section: App Features -->
				<section class="space-y-2">
					<!-- Install App Button -->
					{#if $installPromptEvent}
						<button
							on:click={handleInstallClick}
							class="btn btn-block border-pink-300 bg-gradient-to-r from-pink-100 to-purple-100 text-gray-800 hover:from-pink-200 hover:to-purple-200"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
								/>
							</svg>
							Install TalkType App
						</button>
					{/if}

					<!-- Keyboard Shortcuts -->
					<KeyboardShortcutsInfo />
				</section>

				<!-- Section: Support -->
				<div class="divider my-1 opacity-10"></div>
				<section>
					<SupportSection />
				</section>
			</div>

			<div class="border-t border-pink-100 pt-3 text-center">
				<p class="text-xs text-gray-500">TalkType • Made with 💜</p>
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

	/* Theme-specific styles are now in child components */

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
