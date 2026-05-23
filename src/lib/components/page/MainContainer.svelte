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
	import { autoBackupHistoryToVault } from '$lib/services/storage/vaultAutoBackup.js';

	let Settings;
	let TranscriptHistoryModal;
	let SupporterModal;
	let PwaInstallPrompt;

	function createComponentLoader(importComponent, assignComponent, label) {
		let pending = null;

		return async () => {
			if (pending) return pending;

			pending = importComponent()
				.then((module) => {
					assignComponent(module.default);
					return true;
				})
				.catch((err) => {
					console.error(`Error loading ${label}:`, err);
					return false;
				})
				.finally(() => {
					pending = null;
				});

			return pending;
		};
	}

	const loadSettings = createComponentLoader(
		() => import('../Settings.svelte'),
		(component) => (Settings = component),
		'Settings'
	);

	const loadTranscriptHistoryModal = createComponentLoader(
		() => import('../history/TranscriptHistoryModal.svelte'),
		(component) => (TranscriptHistoryModal = component),
		'history modal'
	);

	const loadSupporterModal = createComponentLoader(
		() => import('../modals/SupporterModal.svelte'),
		(component) => (SupporterModal = component),
		'supporter modal'
	);

	const loadPwaInstallPrompt = createComponentLoader(
		() => import('../pwa/PwaInstallPrompt.svelte'),
		(component) => (PwaInstallPrompt = component),
		'PWA install prompt'
	);

	async function openSettingsModal() {
		if (!Settings && !(await loadSettings())) return;
		openDialogAfterRender('settings_modal');
	}

	function closeSettingsModal() {
		modalService.closeModal();
	}

	function openDialogAfterRender(modalId) {
		setTimeout(() => {
			modalService.openModal(modalId);
		}, 10);
	}

	// Handle toggle recording from ghost via custom event
	function handleToggleRecording() {
		if ($transcribingStore && !$recordingStore) {
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

		if (event.detail.transcript && $userPreferences.isSupporter) {
			try {
				await saveTranscript({
					text: event.detail.transcript.text,
					audioBlob: event.detail.transcript.audioBlob,
					duration: event.detail.transcript.duration || 0,
					promptStyle: event.detail.transcript.promptStyle || 'standard',
					method: event.detail.transcript.method || 'gemini'
				});
				void autoBackupHistoryToVault();
			} catch (err) {
				console.error('Failed to save transcript:', err);
			}
		}

		// The PWA service handles most of the logic, but we need to lazy-load the component
		if ($showPwaInstallPrompt && !PwaInstallPrompt) {
			await loadPwaInstallPrompt();
		}
	}

	async function openSupporterModal() {
		if (!SupporterModal && !(await loadSupporterModal())) return;
		openDialogAfterRender('supporter_modal');
	}

	// Closes the PWA install prompt
	function closePwaInstallPrompt() {
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

		if (!TranscriptHistoryModal && !(await loadTranscriptHistoryModal())) return;
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
		} catch {
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

			supporterModalListener = () => openSupporterModal();
			window.addEventListener('talktype:open-supporter-modal', supporterModalListener);
		}

		// Listen for settings changes
		if (browser) {
			settingsListener = (event) => {
				if (event.detail && event.detail.setting === 'promptStyle') {
					// Update the prompt style in the service
					geminiService.setPromptStyle(event.detail.value);
				}
			};
			window.addEventListener('talktype-setting-changed', settingsListener);
		}

		(async () => {
			// Check if first visit to show intro
			const introWasShown = await firstVisitService.showIntroModal();
			if (destroyed) return;

			const autoStartSource = getAutoStartSource();
			if (autoStartSource) {
				const startDelay = introWasShown ? 450 : 250;
				scheduleAutoStartRetry(autoStartSource, { allowGestureRetry: true }, startDelay);
			}
		})();

		// Return cleanup function
		return () => {
			destroyed = true;

			if (browser && settingsListener) {
				window.removeEventListener('talktype-setting-changed', settingsListener);
			}
			if (browser && toggleRecordingListener) {
				window.removeEventListener('talktype:toggle-recording', toggleRecordingListener);
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
		isProcessing={$transcribingStore}
		clickable={!$transcribingStore}
	/>
	<ContentContainer
		bind:this={contentContainer}
		ghostComponent={ghostContainer}
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
