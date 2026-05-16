<script>
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import GhostContainer from './GhostContainer.svelte';
	import ContentContainer from './ContentContainer.svelte';
	import FooterComponent from './FooterComponent.svelte';
	import { geminiService } from '$lib/services/geminiService';
	import { modalService } from '$lib/services/modals';
	import { firstVisitService } from '$lib/services/first-visit';
	import { pwaService, deferredInstallPrompt, showPwaInstallPrompt } from '$lib/services/pwa';
	import {
		isRecording as recordingStore,
		isTranscribing as transcribingStore
	} from '$lib/services';
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

	let PwaInstallPrompt;

	let isProcessing = false;
	function debug() {
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

		openDialogAfterRender('settings_modal');
	}

	function closeSettingsModal() {
		debug('closeSettingsModal called');
		modalService.closeModal();
	}

	function openDialogAfterRender(modalId) {
		setTimeout(() => {
			modalService.openModal(modalId);
		}, 10);
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

		if ($transcribingStore && !$recordingStore) {
			debug('Ignoring ghost click while transcription is in progress');
			return;
		}

		// Add null check for contentContainer
		if (!contentContainer) {
			console.warn('[MainContainer] contentContainer not ready yet');
			// Try again after a short delay
			ghostClickRetryTimeout = setTimeout(() => {
				if (contentContainer && !$transcribingStore) {
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
		modalService.openModal('about_modal');
	}

	function showExtensionModal() {
		modalService.openModal('extension_modal');
	}

	function closeModal() {
		modalService.closeModal();
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
			debug('📱 Lazy loading PWA install prompt component...');

			try {
				// Import the component dynamically
				const module = await import('../pwa/PwaInstallPrompt.svelte');
				PwaInstallPrompt = module.default;
				debug('📱 PWA install prompt component loaded successfully');
			} catch (err) {
				console.error('Error loading PWA install prompt:', err);
				debug(`Error loading PWA install prompt: ${err.message}`);
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

		openDialogAfterRender('supporter_modal');
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

		openDialogAfterRender('history_modal');
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
	let autoStartGestureCleanup;
	let autoStartVisibilityCleanup;

	function getAutoStartSource() {
		if (!browser) return null;

		const params = new URLSearchParams(window.location.search);
		if (params.get('action') === 'record') {
			return 'launch-shortcut';
		}

		if (StorageUtils.getBooleanItem(STORAGE_KEYS.AUTO_RECORD, false)) {
			return 'auto-start';
		}

		return null;
	}

	function hasOpenDialog() {
		return browser && !!document.querySelector('dialog[open]');
	}

	function clearAutoStartGestureRetry() {
		if (autoStartGestureCleanup) {
			autoStartGestureCleanup();
			autoStartGestureCleanup = null;
		}
	}

	function clearAutoStartVisibilityRetry() {
		if (autoStartVisibilityCleanup) {
			autoStartVisibilityCleanup();
			autoStartVisibilityCleanup = null;
		}
	}

	function scheduleAutoStartRetry(source, options, delay) {
		if (autoRecordTimeout) {
			clearTimeout(autoRecordTimeout);
		}
		autoRecordTimeout = setTimeout(() => {
			attemptAutoStart(source, options);
		}, delay);
	}

	function armAutoStartOnGesture(source) {
		if (!browser || autoStartGestureCleanup) return;

		const retry = () => {
			clearAutoStartGestureRetry();
			scheduleAutoStartRetry(source, { allowGestureRetry: false }, 0);
		};

		window.addEventListener('pointerup', retry, true);
		window.addEventListener('keydown', retry, true);
		autoStartGestureCleanup = () => {
			window.removeEventListener('pointerup', retry, true);
			window.removeEventListener('keydown', retry, true);
		};
	}

	function armAutoStartOnVisibility(source) {
		if (!browser || autoStartVisibilityCleanup) return;

		const retry = () => {
			if (document.visibilityState !== 'visible') return;
			clearAutoStartVisibilityRetry();
			scheduleAutoStartRetry(source, { allowGestureRetry: true }, 150);
		};

		document.addEventListener('visibilitychange', retry);
		autoStartVisibilityCleanup = () => {
			document.removeEventListener('visibilitychange', retry);
		};
	}

	async function attemptAutoStart(source, { allowGestureRetry = true } = {}) {
		if (!browser || !source) return false;

		await tick();

		if (!contentContainer) {
			scheduleAutoStartRetry(source, { allowGestureRetry }, 100);
			return false;
		}

		if ($recordingStore || $transcribingStore) {
			return false;
		}

		if (document.visibilityState !== 'visible') {
			armAutoStartOnVisibility(source);
			return false;
		}

		if (hasOpenDialog()) {
			scheduleAutoStartRetry(source, { allowGestureRetry }, 300);
			return false;
		}

		try {
			const started = await contentContainer.startRecording({ source });
			await tick();
			if (started !== true || !get(recordingStore)) {
				scheduleAutoStartRetry(source, { allowGestureRetry }, 100);
				return false;
			}
			clearAutoStartGestureRetry();
			clearAutoStartVisibilityRetry();
			return true;
		} catch (err) {
			debug(`Auto-start failed: ${err?.message || err}`);
			if (allowGestureRetry) {
				armAutoStartOnGesture(source);
			}
			return false;
		}
	}

	// Lifecycle hooks
	onMount(() => {
		let destroyed = false;

		// Settings modal is now truly lazy-loaded only when needed - no preloading

		// Set up direct listener for ghost toggle recording event
		if (browser) {
			toggleRecordingListener = () => handleToggleRecording();
			window.addEventListener('talktype:toggle-recording', toggleRecordingListener);
			debug('Added listener for talktype:toggle-recording custom event');

			supporterModalListener = () => openSupporterModal();
			window.addEventListener('talktype:open-supporter-modal', supporterModalListener);
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

		(async () => {
			// Check if first visit to show intro
			const introWasShown = await firstVisitService.showIntroModal();
			if (destroyed) return;

			const autoStartSource = getAutoStartSource();
			if (autoStartSource) {
				const startDelay = introWasShown ? 450 : 250;
				scheduleAutoStartRetry(autoStartSource, { allowGestureRetry: true }, startDelay);
			} else {
				debug('Auto-start not requested.');
			}
		})();

		// Return cleanup function
		return () => {
			destroyed = true;

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
			clearAutoStartGestureRetry();
			clearAutoStartVisibilityRetry();
		};
	});
</script>

<PageLayout>
	<GhostContainer
		bind:this={ghostContainer}
		isRecording={$recordingStore}
		isProcessing={isProcessing || $transcribingStore}
		clickable={!$transcribingStore}
	/>
	<ContentContainer
		bind:this={contentContainer}
		ghostComponent={ghostContainer}
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
