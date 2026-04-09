<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import GhostContainer from './GhostContainer.svelte';
	import ContentContainer from './ContentContainer.svelte';
	import FooterComponent from './FooterComponent.svelte';
	import { geminiService } from '$lib/services/geminiService';
	import { modalService } from '$lib/services/modals';
	import { firstVisitService, isFirstVisit } from '$lib/services/first-visit';
	import { pwaService, deferredInstallPrompt, showPwaInstallPrompt } from '$lib/services/pwa';
	import { isRecording as recordingStore } from '$lib/services';
	import { PageLayout } from '$lib/components/layout';
	import { fade } from 'svelte/transition';
	import { StorageUtils } from '$lib/services/infrastructure/storageUtils';
	import { STORAGE_KEYS } from '$lib/constants';
	import { userPreferences } from '$lib/services';

	import { AboutModal, ExtensionModal, IntroModal } from '../modals';
	import { saveTranscript } from '$lib/services/storage/transcriptStorage';

	let Settings;
	let loadingSettings = false;

	let TranscriptHistoryModal;
	let loadingHistoryModal = false;

	let SupporterModal;
	let loadingSupporterModal = false;

	// Initialize transcription after a short delay
	let hasInitializedTranscription = false;

	let PwaInstallPrompt;
	let loadingPwaPrompt = false;

	let speechModelPreloaded = false;
	let isProcessing = false;
	function debug(message) {
		// console.log(`[MainContainer] ${message}`);
	}

	async function openSettingsModal() {
		debug('openSettingsModal called');

		// Check if we're already loading the modal
		if (loadingSettings) {
			debug('Settings is already loading, aborting.');
			return;
		}

		// Dynamically import the Settings component if not already loaded
		if (!Settings) {
			loadingSettings = true;
			debug('Lazy loading Settings component...');

			try {
				// Import the component dynamically
				const module = await import('../Settings.svelte');
				Settings = module.default;
				debug('Settings component loaded successfully');
			} catch (err) {
				console.error('Error loading Settings:', err);
				debug(`Error loading Settings: ${err.message}`);
				loadingSettings = false;
				return; // Don't proceed if loading failed
			} finally {
				loadingSettings = false; // Ensure this is always reset
			}
		}

		// Open the modal directly like About modal does
		// Small delay to ensure component is mounted
		setTimeout(() => {
			const modal = document.getElementById('settings_modal');
			if (modal) {
				modal.showModal();
			}
		}, 10);
	}

	function closeSettingsModal() {
		debug('closeSettingsModal called');
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

	// Handle toggle recording from ghost via custom event
	function handleToggleRecording() {
		debug('Toggle recording triggered via custom event');

		// Add null check for contentContainer
		if (!contentContainer) {
			console.warn('[MainContainer] contentContainer not ready yet');
			// Try again after a short delay
			ghostClickRetryTimeout = setTimeout(() => {
				if (contentContainer) {
					contentContainer.toggleRecording();
				} else {
					console.error('[MainContainer] contentContainer still not available!');
				}
			}, 100);
			return;
		}

		contentContainer.toggleRecording();
	}

	// Function to trigger ghost click
	function triggerGhostClick() {
		debug('Triggering ghost click after intro modal close');
		// Forward to the toggle recording handler
		handleToggleRecording();
	}

	// Modal control functions
	function showAboutModal() {
		const modal = document.getElementById('about_modal');
		if (modal) {
			modal.showModal();
		}
	}

	function showExtensionModal() {
		const modal = document.getElementById('extension_modal');
		if (modal) {
			modal.showModal();
		}
	}

	function closeModal() {
		// General close modal function
		const modals = document.querySelectorAll('dialog[open]');
		modals.forEach((modal) => modal.close());
	}

	// Handle transcription completed event for PWA prompt and local transcript history
	async function handleTranscriptionCompleted(event) {
		if (!browser) return;

		const newCount = event.detail.count;
		debug(`🔔 Transcription completed event received. Count: ${newCount}`);

		if (event.detail.transcript && $userPreferences.isSupporter) {
			try {
				await saveTranscript({
					text: event.detail.transcript.text,
					audioBlob: event.detail.transcript.audioBlob,
					duration: event.detail.transcript.duration || 0,
					promptStyle: event.detail.transcript.promptStyle || 'standard',
					method: event.detail.transcript.method || 'gemini'
				});
				debug('💾 Transcript saved to history');
			} catch (err) {
				console.error('Failed to save transcript:', err);
			}
		}

		// The PWA service handles most of the logic, but we need to lazy-load the component
		if ($showPwaInstallPrompt && !PwaInstallPrompt) {
			loadingPwaPrompt = true;
			debug('📱 Lazy loading PWA install prompt component...');

			try {
				// Import the component dynamically
				const module = await import('../pwa/PwaInstallPrompt.svelte');
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

	async function openSupporterModal() {
		if (loadingSupporterModal) return;

		if (!SupporterModal) {
			loadingSupporterModal = true;
			try {
				const module = await import('../modals/SupporterModal.svelte');
				SupporterModal = module.default;
			} catch (err) {
				console.error('Error loading supporter modal:', err);
				return;
			} finally {
				loadingSupporterModal = false;
			}
		}

		setTimeout(() => {
			const modal = document.getElementById('supporter_modal');
			if (modal) {
				modal.showModal();
			}
		}, 10);
	}

	// Closes the PWA install prompt
	function closePwaInstallPrompt() {
		debug('ℹ️ PWA install prompt dismissed.');
		// Update the store value through the service
		pwaService.dismissPrompt();
	}

	// Open history modal
	async function openHistoryModal() {
		if (!$userPreferences.isSupporter) {
			window.dispatchEvent(
				new CustomEvent('talktype:toast', {
					detail: {
						message: 'Supporter mode unlocks transcript history, downloads, and export.',
						type: 'info'
					}
				})
			);
			openSupporterModal();
			return;
		}

		if (loadingHistoryModal) return;

		debug('Opening history modal');

		if (!TranscriptHistoryModal) {
			loadingHistoryModal = true;
			try {
				const module = await import('../history/TranscriptHistoryModal.svelte');
				TranscriptHistoryModal = module.default;
				debug('History modal loaded successfully');
			} catch (err) {
				console.error('Error loading history modal:', err);
				loadingHistoryModal = false;
				return;
			} finally {
				loadingHistoryModal = false;
			}
		}

		setTimeout(() => {
			const modal = document.getElementById('history_modal');
			if (modal) {
				modal.showModal();
			}
		}, 10);
	}

	// Component references
	let ghostContainer;
	let contentContainer;

	// Event listener cleanup
	let settingsListener;
	let toggleRecordingListener;
	let supporterModalListener;
	let autoRecordTimeout;
	let ghostClickRetryTimeout;

	// Lifecycle hooks
	onMount(async () => {
		// Settings modal is now truly lazy-loaded only when needed - no preloading

		// Set up direct listener for ghost toggle recording event
		if (browser) {
			toggleRecordingListener = () => handleToggleRecording();
			window.addEventListener('talktype:toggle-recording', toggleRecordingListener);
			debug('Added listener for talktype:toggle-recording custom event');

			supporterModalListener = () => openSupporterModal();
			window.addEventListener('talktype:open-supporter-modal', supporterModalListener);
		}

		// Check for auto-record setting and start recording if enabled
		if (browser && StorageUtils.getBooleanItem(STORAGE_KEYS.AUTO_RECORD, false)) {
			// Wait minimal time for component initialization
			autoRecordTimeout = setTimeout(() => {
				if (contentContainer && !$recordingStore) {
					debug('Auto-record enabled, attempting to start recording immediately');
					try {
						contentContainer.startRecording();
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
			settingsListener = (event) => {
				if (event.detail && event.detail.setting === 'autoRecord') {
					debug(`Setting changed event: autoRecord = ${event.detail.value}`);
					// No immediate action needed, setting will apply on next page load/refresh
				}

				if (event.detail && event.detail.setting === 'promptStyle') {
					debug('Prompt style setting changed:', event.detail.value);
					// Update the prompt style in the service
					geminiService.setPromptStyle(event.detail.value);
				}
			};
			window.addEventListener('talktype-setting-changed', settingsListener);
			debug('Added listener for settings changes.');
		}

		// Check if first visit to show intro
		await firstVisitService.showIntroModal();

		// Return cleanup function
		return () => {
			if (browser && settingsListener) {
				window.removeEventListener('talktype-setting-changed', settingsListener);
				debug('Removed settings change listener');
			}
			if (browser && toggleRecordingListener) {
				window.removeEventListener('talktype:toggle-recording', toggleRecordingListener);
				debug('Removed toggle recording listener');
			}
			if (browser && supporterModalListener) {
				window.removeEventListener('talktype:open-supporter-modal', supporterModalListener);
			}
			if (autoRecordTimeout) {
				clearTimeout(autoRecordTimeout);
			}
			if (ghostClickRetryTimeout) {
				clearTimeout(ghostClickRetryTimeout);
			}
		};
	});
</script>

<PageLayout>
	<GhostContainer bind:this={ghostContainer} isRecording={$recordingStore} {isProcessing} />
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
			on:showHistory={openHistoryModal}
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
/>

<!-- Settings Modal - lazy loaded -->
{#if Settings}
	<!-- Pass the close function down to the component -->
	<svelte:component this={Settings} closeModal={closeSettingsModal} />
{/if}

<!-- Transcript History Modal - lazy loaded -->
{#if TranscriptHistoryModal}
	<svelte:component this={TranscriptHistoryModal} {closeModal} />
{/if}

{#if SupporterModal}
	<svelte:component this={SupporterModal} {closeModal} />
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
