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
	import { transcriptionState, uiActions, userPreferences } from '$lib/services';

	import { AboutModal, ExtensionModal, IntroModal } from '../modals';
	import { saveTranscript } from '$lib/services/storage/transcriptStorage';
	import { autoBackupHistoryToVault } from '$lib/services/storage/vaultAutoBackup.js';
	import { checkPassportNotes } from '$lib/services/storage/passportNotesCheck.js';

	const AUTO_START_PERMISSION_SETTLE_MS = 1500;
	const AUTO_START_ACTIVATION_KEYS = new Set(['Enter', ' ']);

	let Settings;
	let TranscriptHistoryModal;
	let SupporterModal;
	let PwaInstallPrompt;
	let latestUnsavedTranscript = null;
	let isSavingUnlockTranscript = false;

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

	function getHistoryTranscript(transcript, textOverride = '') {
		const text = (textOverride || transcript?.text || '').trim();
		if (!text) return null;

		return {
			text,
			audioBlob: transcript?.audioBlob || null,
			duration: transcript?.duration || 0,
			promptStyle: transcript?.promptStyle || 'standard',
			method: transcript?.method || 'gemini'
		};
	}

	async function saveTranscriptToHistory(transcript) {
		await saveTranscript(transcript);
		void autoBackupHistoryToVault();
	}

	async function saveVisibleTranscriptAfterUnlock() {
		if (!browser || isSavingUnlockTranscript || !latestUnsavedTranscript) return;

		const currentText = get(transcriptionState).text;
		const transcript = getHistoryTranscript(latestUnsavedTranscript, currentText);
		if (!transcript) return;

		isSavingUnlockTranscript = true;
		try {
			await saveTranscriptToHistory(transcript);
			latestUnsavedTranscript = null;
		} catch (err) {
			console.error('Failed to save visible transcript after supporter unlock:', err);
		} finally {
			isSavingUnlockTranscript = false;
		}
	}

	// Handle transcription completed event for PWA prompt and local transcript history
	async function handleTranscriptionCompleted(event) {
		if (!browser) return;

		const transcript = getHistoryTranscript(event.detail.transcript);

		if (transcript && $userPreferences.isSupporter) {
			try {
				await saveTranscriptToHistory(transcript);
				latestUnsavedTranscript = null;
			} catch (err) {
				console.error('Failed to save transcript:', err);
			}
		} else if (transcript) {
			latestUnsavedTranscript = transcript;
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

	async function handleSupporterUnlocked() {
		await checkPassportNotes();
		await saveVisibleTranscriptAfterUnlock();
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

		void checkPassportNotes();
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
	let autoStartNeedsGesture = false;
	let pendingAutoStartSource = null;
	let autoStartAttemptId = 0;

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

	function clearAutoStartGesturePrompt() {
		autoStartNeedsGesture = false;
		pendingAutoStartSource = null;
	}

	function shouldIgnoreAutoStartGesture(event) {
		if (event?.type === 'keydown' && !AUTO_START_ACTIVATION_KEYS.has(event.key)) {
			return true;
		}

		return !!event?.target?.closest?.(
			'[data-auto-start-prompt], dialog, a, button, input, textarea, select, [role="button"]'
		);
	}

	function withAutoStartTimeout(promise) {
		let timeoutId;
		const timeoutPromise = new Promise((resolve) => {
			timeoutId = setTimeout(
				() => resolve('needs-gesture-timeout'),
				AUTO_START_PERMISSION_SETTLE_MS
			);
		});

		return Promise.race([promise, timeoutPromise]).finally(() => {
			clearTimeout(timeoutId);
		});
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
		if (!browser) return;

		autoStartNeedsGesture = true;
		pendingAutoStartSource = source;

		if (autoStartGestureCleanup) return;

		const retry = (event) => {
			if (shouldIgnoreAutoStartGesture(event)) {
				return;
			}
			const retrySource = pendingAutoStartSource || source;
			clearAutoStartGestureRetry();
			clearAutoStartGesturePrompt();
			void attemptAutoStart(retrySource, { allowGestureRetry: false });
		};

		window.addEventListener('pointerup', retry, true);
		window.addEventListener('keydown', retry, true);
		autoStartGestureCleanup = () => {
			window.removeEventListener('pointerup', retry, true);
			window.removeEventListener('keydown', retry, true);
		};
	}

	function handleAutoStartTap() {
		const source = pendingAutoStartSource || getAutoStartSource();
		clearAutoStartGestureRetry();
		clearAutoStartGesturePrompt();
		void attemptAutoStart(source, { allowGestureRetry: false });
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
			clearAutoStartGesturePrompt();
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
			const attemptId = ++autoStartAttemptId;
			const startPromise = contentContainer.startRecording({ source });
			startPromise
				.then(async (started) => {
					if (attemptId !== autoStartAttemptId || started !== true) return;
					await tick();
					if (get(recordingStore)) {
						clearAutoStartGestureRetry();
						clearAutoStartVisibilityRetry();
						clearAutoStartGesturePrompt();
					}
				})
				.catch(() => {});

			const started = await withAutoStartTimeout(startPromise);
			if (started === 'needs-gesture-timeout') {
				if (allowGestureRetry && !get(recordingStore) && !get(transcribingStore)) {
					uiActions.clearErrorMessage();
					uiActions.setPermissionError(false);
					armAutoStartOnGesture(source);
				}
				return false;
			}
			await tick();
			if (started !== true || !get(recordingStore)) {
				scheduleAutoStartRetry(source, { allowGestureRetry }, 100);
				return false;
			}
			clearAutoStartGestureRetry();
			clearAutoStartVisibilityRetry();
			clearAutoStartGesturePrompt();
			return true;
		} catch {
			if (allowGestureRetry) {
				uiActions.clearErrorMessage();
				uiActions.setPermissionError(false);
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
			void checkPassportNotes();

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
			clearAutoStartGesturePrompt();
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
	{#if autoStartNeedsGesture && !$recordingStore && !$transcribingStore}
		<button
			type="button"
			class="auto-start-prompt mt-1"
			data-auto-start-prompt
			on:click|preventDefault|stopPropagation={handleAutoStartTap}
			aria-label="Tap to start recording"
		>
			tap to start
		</button>
	{/if}
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
<IntroModal {closeModal} markIntroAsSeen={() => firstVisitService.markIntroAsSeen()} />

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
	<svelte:component this={SupporterModal} {closeModal} on:unlocked={handleSupporterUnlocked} />
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

<style>
	.auto-start-prompt {
		display: inline-flex;
		min-height: 56px;
		width: min(92vw, 360px);
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		border: 1px solid rgba(249, 168, 212, 0.58);
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 237, 248, 0.94));
		box-shadow:
			0 16px 34px rgba(249, 168, 212, 0.28),
			0 0 0 6px rgba(255, 255, 255, 0.74);
		color: #111827;
		font-size: 1.15rem;
		font-weight: 800;
		letter-spacing: 0;
		touch-action: manipulation;
		animation: auto-start-squish 1.8s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
	}

	.auto-start-prompt:focus-visible {
		outline: 3px solid rgba(245, 158, 11, 0.88);
		outline-offset: 4px;
	}

	.auto-start-prompt:active {
		transform: scale(0.98);
	}

	@keyframes auto-start-squish {
		0%,
		100% {
			transform: scale(1);
		}
		42% {
			transform: scale(1.035);
		}
		58% {
			transform: scale(0.99);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.auto-start-prompt {
			animation: none;
		}
	}
</style>
