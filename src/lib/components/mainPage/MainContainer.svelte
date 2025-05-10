<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import GhostContainer from './GhostContainer.svelte';
	import ContentContainer from './ContentContainer.svelte';
	import FooterComponent from './FooterComponent.svelte';
	import { geminiService } from '$lib/services/geminiService';
	import { themeService } from '$lib/services/theme';
	import { modalService } from '$lib/services/modals';
	import { firstVisitService, isFirstVisit } from '$lib/services/first-visit';
	import { pwaService, deferredInstallPrompt, showPwaInstallPrompt } from '$lib/services/pwa';
	import { isRecording as recordingStore } from '$lib/services';
	import { PageLayout } from '$lib/components/layout';
	import { fade } from 'svelte/transition';
	import { StorageUtils } from '$lib/services/infrastructure/storageUtils';
	import { STORAGE_KEYS } from '$lib/constants';

	// Import modals lazily
	import { AboutModal, ExtensionModal, IntroModal } from './modals';

	// Lazy load settings modal - only import when needed
	let SettingsModal;
	let loadingSettingsModal = false;

	// PWA Install Prompt component - lazy loaded
	let PwaInstallPrompt;
	let loadingPwaPrompt = false;

	// Track speech model preloading state
	let speechModelPreloaded = false;

	// State variables to pass to children
	let isProcessing = false;

	// Debug Helper
	function debug(message) {
		// Uncomment the line below during development for verbose logging
		// console.log(`[MainContainer] ${message}`);
	}

	// Modal functions
	function showAboutModal() {
		debug('showAboutModal called');
		modalService.openModal('about_modal');
	}

	function showExtensionModal() {
		debug('showExtensionModal called');
		modalService.openModal('extension_modal');
	}

	async function openSettingsModal() {
		debug('openSettingsModal called');

		// First, ensure any open dialogs are closed
		if (modalService.isModalOpen()) {
			debug('Another modal was open, closing it first.');
			modalService.closeModal();
			await new Promise((resolve) => setTimeout(resolve, 50));
		}

		// Check if we're already loading the modal
		if (loadingSettingsModal) {
			debug('SettingsModal is already loading, aborting.');
			return;
		}

		// Dynamically import the SettingsModal component if not already loaded
		if (!SettingsModal) {
			loadingSettingsModal = true;
			debug('Lazy loading SettingsModal component...');

			try {
				// Import the component dynamically
				const module = await import('./settings/SettingsModal.svelte');
				SettingsModal = module.default;
				debug('SettingsModal component loaded successfully');
			} catch (err) {
				console.error('Error loading SettingsModal:', err);
				debug(`Error loading SettingsModal: ${err.message}`);
				loadingSettingsModal = false;
				return; // Don't proceed if loading failed
			} finally {
				loadingSettingsModal = false; // Ensure this is always reset
			}
		}

		// Open the settings modal
		modalService.openModal('settings_modal');
	}

	function closeSettingsModal() {
		debug('closeSettingsModal called');
		modalService.closeModal();
	}

	function closeModal() {
		modalService.closeModal();
	}

	// Function to preload speech model for faster initial response
	function preloadSpeechModel() {
		if (!speechModelPreloaded && browser) {
			debug('Preloading speech model for faster response');
			speechModelPreloaded = true; // Assume success initially

			// Make sure the current prompt style is set before preloading
			if (browser) {
				const savedStyle = StorageUtils.getItem(STORAGE_KEYS.PROMPT_STYLE);
				if (savedStyle) {
					debug(`Setting prompt style from localStorage: ${savedStyle}`);
					geminiService.setPromptStyle(savedStyle);
				}
			}

			// Log available prompt styles
			const availableStyles = geminiService.getAvailableStyles();
			debug(`Available prompt styles: ${availableStyles.join(', ')}`);

			geminiService
				.preloadModel()
				.then(() => {
					debug('Speech model preloaded successfully.');
				})
				.catch((err) => {
					// Just log the error, don't block UI
					console.error('Error preloading speech model:', err);
					debug(`Error preloading speech model: ${err.message}`);
					// Reset so we can try again
					speechModelPreloaded = false;
				});
		} else if (speechModelPreloaded) {
			debug('Speech model already preloaded or preloading.');
		}
	}

	// Event handlers for recording state changes
	function handleRecordingStart() {
		isProcessing = false;
	}

	function handleRecordingStop() {
		// No need to set isRecording - it's handled by the store
	}

	function handleProcessingStart() {
		isProcessing = true;
	}

	function handleProcessingEnd() {
		isProcessing = false;
	}

	// Handle toggle recording from ghost
	function handleToggleRecording() {
		debug('Toggle recording triggered from ghost');

		if ($recordingStore) {
			// ghostContainer.stopWobbleAnimation(); // Removed - Wobble handled internally
			contentContainer.stopRecording();
		} else {
			// ghostContainer.startWobbleAnimation(); // Removed - Wobble handled internally
			contentContainer.startRecording();
		}
	}

	// Function to trigger ghost click
	function triggerGhostClick() {
		debug('Triggering ghost click after intro modal close');
		// Forward to the toggle recording handler
		handleToggleRecording();
	}

	// Handle transcription completed event for PWA prompt
	async function handleTranscriptionCompleted(event) {
		if (!browser) return;

		const newCount = event.detail.count;
		debug(`🔔 Transcription completed event received. Count: ${newCount}`);

		// The PWA service handles most of the logic, but we need to lazy-load the component
		if ($showPwaInstallPrompt && !PwaInstallPrompt) {
			loadingPwaPrompt = true;
			debug('📱 Lazy loading PWA install prompt component...');

			try {
				// Import the component dynamically
				const module = await import('./pwa/PwaInstallPrompt.svelte');
				PwaInstallPrompt = module.default;
				debug('📱 PWA install prompt component loaded successfully');
			} catch (err) {
				console.error('Error loading PWA install prompt:', err);
				debug(`Error loading PWA install prompt: ${err.message}`);
			} finally {
				loadingPwaPrompt = false;
			}
		}
	}

	// Closes the PWA install prompt
	function closePwaInstallPrompt() {
		debug('ℹ️ PWA install prompt dismissed.');
		// Update the store value through the service
		pwaService.dismissPrompt();
	}

	// Component references
	let ghostContainer;
	let contentContainer;

	// Lifecycle hooks
	onMount(() => {
		// Pre-load the SettingsModal component after a short delay
		setTimeout(async () => {
			if (!SettingsModal && !loadingSettingsModal) {
				try {
					loadingSettingsModal = true;
					debug('Pre-loading SettingsModal component');
					const module = await import('./settings/SettingsModal.svelte');
					SettingsModal = module.default;
					loadingSettingsModal = false;
					debug('SettingsModal component pre-loaded successfully');
				} catch (err) {
					console.error('Error pre-loading SettingsModal:', err);
					loadingSettingsModal = false;
				}
			}
		}, 1000);

		// Check for auto-record setting and start recording if enabled
		if (browser && StorageUtils.getBooleanItem(STORAGE_KEYS.AUTO_RECORD, false)) {
			// Wait minimal time for component initialization
			setTimeout(() => {
				if (contentContainer && !$recordingStore) {
					debug('Auto-record enabled, attempting to start recording immediately');
					try {
						contentContainer.startRecording();
						ghostContainer.startWobbleAnimation();
						debug('Auto-record: Called startRecording()');
					} catch (err) {
						debug(`Auto-record: Error starting recording: ${err.message}`);
					}
				} else {
					debug('Auto-record: Conditions not met (no component or already recording).');
				}
			}, 500); // Reduced delay - just enough for component initialization
		} else {
			debug('Auto-record not enabled or not in browser.');
		}

		// Listen for settings changes
		if (browser) {
			window.addEventListener('talktype-setting-changed', (event) => {
				if (event.detail && event.detail.setting === 'autoRecord') {
					debug(`Setting changed event: autoRecord = ${event.detail.value}`);
					// No immediate action needed, setting will apply on next page load/refresh
				}

				if (event.detail && event.detail.setting === 'promptStyle') {
					debug('Prompt style setting changed:', event.detail.value);
					// Update the prompt style in the service
					geminiService.setPromptStyle(event.detail.value);
				}
			});
			debug('Added listener for settings changes.');
		}

		// IntroModal now handles first visit check internally
	});
</script>

<PageLayout>
	<GhostContainer
		bind:this={ghostContainer}
		isRecording={$recordingStore}
		{isProcessing}
		on:toggleRecording={handleToggleRecording}
	/>
	<ContentContainer
		bind:this={contentContainer}
		ghostComponent={ghostContainer}
		{speechModelPreloaded}
		onPreloadRequest={preloadSpeechModel}
		on:recordingstart={handleRecordingStart}
		on:recordingstop={handleRecordingStop}
		on:processingstart={handleProcessingStart}
		on:processingend={handleProcessingEnd}
		on:transcriptionCompleted={handleTranscriptionCompleted}
	/>
	<svelte:fragment slot="footer-buttons">
		<FooterComponent
			on:showAbout={showAboutModal}
			on:showSettings={openSettingsModal}
			on:showExtension={showExtensionModal}
		/>
	</svelte:fragment>
</PageLayout>

<!-- Modals -->
<AboutModal {closeModal} />
<ExtensionModal {closeModal} />
<IntroModal
	{closeModal}
	markIntroAsSeen={() => firstVisitService.markIntroAsSeen()}
	{triggerGhostClick}
	ghostComponent={ghostContainer}
/>

<!-- Settings Modal - lazy loaded -->
{#if SettingsModal}
	<!-- Pass the close function down to the component -->
	<svelte:component this={SettingsModal} on:close={closeSettingsModal} />
{/if}

<!-- PWA Install Prompt -->
{#if $showPwaInstallPrompt && PwaInstallPrompt}
	<div transition:fade={{ duration: 300 }}>
		<svelte:component
			this={PwaInstallPrompt}
			installPromptEvent={$deferredInstallPrompt}
			on:closeprompt={closePwaInstallPrompt}
		/>
	</div>
{/if}
