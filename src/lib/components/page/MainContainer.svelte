<script>
	import { onMount, tick } from 'svelte';
	import { shouldWarnMicReprompt } from '$lib/services/audio/micPermission.js';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import GhostContainer from './GhostContainer.svelte';
	import ContentContainer from './ContentContainer.svelte';
	import FooterComponent from './FooterComponent.svelte';
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
	import { uiActions } from '$lib/services';
	import { analytics } from '$lib/services/analytics.js';

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

	// Retired in favor of the family PwaInstallCard (chassis kernel, rendered in
	// +layout.svelte). Flip to true to restore the old in-app prompt.
	const LEGACY_PWA_PROMPT_ENABLED = false;

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
			// Try again after a short delay — clearing any pending retry first so
			// rapid taps can't stack multiple toggle timers.
			if (ghostClickRetryTimeout) clearTimeout(ghostClickRetryTimeout);
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
		analytics.extensionModalOpened();
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

	// Handle transcription completed event for PWA prompt and local transcript history
	async function handleTranscriptionCompleted(event) {
		if (!browser) return;

		const transcript = getHistoryTranscript(event.detail.transcript);

		// Always persist locally — offline AND cloud, free AND supporter. The
		// user's own words are never lost. Free tier is trimmed to the most recent
		// N inside saveTranscript; supporters keep unlimited + vault backup.
		if (transcript) {
			try {
				await saveTranscriptToHistory(transcript);
			} catch (err) {
				console.error('Failed to save transcript:', err);
			}
		}

		// The PWA service handles most of the logic, but we need to lazy-load the component
		if ($showPwaInstallPrompt && !PwaInstallPrompt) {
			await loadPwaInstallPrompt();
		}
	}

	async function openSupporterModal(source = 'manual') {
		if (!SupporterModal && !(await loadSupporterModal())) return;
		analytics.supporterModalOpened({ source });
		openDialogAfterRender('supporter_modal');
	}

	async function handleSupporterUnlocked() {
		await checkPassportNotes();
	}

	// Closes the PWA install prompt
	function closePwaInstallPrompt() {
		// Update the store value through the service
		pwaService.dismissPrompt();
	}

	// Open history modal — free users read their kept transcripts too (the
	// user's words are never locked); supporter perks are gated inside the modal.
	async function openHistoryModal() {
		void checkPassportNotes();
		if (!TranscriptHistoryModal && !(await loadTranscriptHistoryModal())) return;
		openDialogAfterRender('history_modal');
	}

	// Component references
	let ghostContainer;
	let contentContainer;

	// Event listener cleanup
	let toggleRecordingListener;
	let supporterModalListener;
	let autoRecordTimeout;
	let ghostClickRetryTimeout;
	let autoStartGestureCleanup;
	let autoStartVisibilityCleanup;
	let autoStartAttemptId = 0;

	function getAutoStartSource() {
		if (!browser) return null;

		const params = new URLSearchParams(window.location.search);
		// `?autostart=1` is an alias for `?action=record` (fable-pwa-autostart POC)
		// so external deep links (shortcuts, notifications, iOS Shortcuts "Open URL")
		// can use either form.
		if (params.get('action') === 'record' || params.get('autostart') === '1') {
			return params.get('source') === 'notification' ? 'notification' : 'launch-shortcut';
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

	function shouldIgnoreAutoStartGesture(event) {
		if (event?.type === 'keydown' && !AUTO_START_ACTIVATION_KEYS.has(event.key)) {
			return true;
		}

		return !!event?.target?.closest?.(
			'dialog, a, button, input, textarea, select, [role="button"]'
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

		if (autoStartGestureCleanup) return;

		const retry = (event) => {
			if (shouldIgnoreAutoStartGesture(event)) {
				return;
			}
			clearAutoStartGestureRetry();
			void attemptAutoStart(source, { allowGestureRetry: false });
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
			const attemptId = ++autoStartAttemptId;
			const startPromise = contentContainer.startRecording({ source });
			startPromise
				.then(async (started) => {
					if (attemptId !== autoStartAttemptId || started !== true) return;
					await tick();
					if (get(recordingStore)) {
						clearAutoStartGestureRetry();
						clearAutoStartVisibilityRetry();
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

			supporterModalListener = (event) => openSupporterModal(event.detail?.source || 'manual');
			window.addEventListener('talktype:open-supporter-modal', supporterModalListener);
		}

		(async () => {
			void checkPassportNotes();

			// iOS forgets mic grants between PWA launches (WebKit, unfixable) —
			// pre-warn returning users so the re-prompt isn't mistaken for a bug.
			void shouldWarnMicReprompt().then((warn) => {
				if (!warn || destroyed) return;
				window.dispatchEvent(
					new CustomEvent('talktype:toast', {
						detail: {
							message: "iPhone asks for the mic again each visit — tap Allow and we're rolling.",
							type: 'info'
						}
					})
				);
			});

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
			firstVisitService.cancelPendingIntroModal();
			modalService.cleanup();
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

<!-- PWA Install Prompt — retired; see LEGACY_PWA_PROMPT_ENABLED above. The old
     pwaService system stays intact in services. -->
{#if LEGACY_PWA_PROMPT_ENABLED && $showPwaInstallPrompt && PwaInstallPrompt}
	<div transition:fade={{ duration: 300 }}>
		<svelte:component
			this={PwaInstallPrompt}
			installPromptEvent={$deferredInstallPrompt}
			on:closeprompt={closePwaInstallPrompt}
		/>
	</div>
{/if}
