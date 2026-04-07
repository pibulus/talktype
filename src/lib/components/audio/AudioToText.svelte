<!--
  AudioToText Orchestrator - Simplified main component
  Coordinates child components for recording and transcription functionality
-->
<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import RecordingControls from './RecordingControls.svelte';
	import TranscriptDisplay from './TranscriptDisplay.svelte';
	import RecordingStatus from './RecordingStatus.svelte';
	import TranscriptionEffects from './TranscriptionEffects.svelte';
	import { memoize } from '$lib/utils/performanceUtils';
	import { STORAGE_KEYS, ANIMATION, SERVICE_EVENTS } from '$lib/constants';
	import {
		initializeServices,
		// Stores
		isRecording,
		isTranscribing,
		transcriptionText,
		errorMessage,
		hasPermissionError,
		recordingState,
		userPreferences,
		uiActions
	} from '$lib/services';
	import { transcriptionCompletedEvent } from '$lib/services/infrastructure/stores';
	import { analytics } from '$lib/services/analytics';
	import { liveMode } from '$lib';
	import { transcriptionStore } from '$lib/stores/transcriptionStore';
	import { whisperStatus } from '../../services/transcription/whisper/whisperService';

	const dispatch = createEventDispatcher();

	// Props - simplified interface
	export let ghostComponent = null;
	export let onPreloadRequest = null;
	export let isPremiumUser = false;

	// Service instances
	let unsubscribers = [];
	let activeTimeouts = [];
	let modelReady = false;

	// Subscribe to whisper status to track when model is ready
	$: modelReady = $whisperStatus.isLoaded;

	// Sync streaming text to global store
	$: if ($liveMode === 'true' && ($transcriptionStore.transcript || $transcriptionStore.interim)) {
		const fullText = ($transcriptionStore.transcript + ' ' + $transcriptionStore.interim).trim();
		if (fullText) {
			import('$lib/services/infrastructure/stores').then(({ transcriptionActions }) => {
				transcriptionActions.updateText(fullText);
			});
		}
	}

	// Component references
	let recordingControlsRef;

	// Memoized responsive font sizing based on text length
	const getResponsiveFontSize = memoize(
		(text) => {
			if (!text) return 'text-base';

			const wordCount = text.trim().split(/\s+/).length;

			// Use CSS-based responsive sizing rather than JS viewport detection
			if (wordCount <= 5) {
				return 'text-lg sm:text-xl md:text-2xl lg:text-3xl';
			} else if (wordCount <= 15) {
				return 'text-base sm:text-lg md:text-xl';
			} else if (wordCount <= 50) {
				return 'text-sm sm:text-base md:text-lg';
			} else {
				return 'text-sm sm:text-base md:text-lg';
			}
		},
		(text) => (text ? text.length : 0)
	); // Cache by text length

	// Reactive font size based on transcript length
	$: responsiveFontSize = getResponsiveFontSize($transcriptionText);

	// Handler for transcript component events
	async function handleTranscriptEvent(event) {
		const { type, detail } = event;

		// Handle copy to clipboard
		if (type === 'copy' && detail?.text) {
			try {
				await navigator.clipboard.writeText(detail.text);
				// Set clipboard success state
				uiActions.setClipboardSuccess(true);
				// Reset after 2 seconds
				const timeoutId = setTimeout(() => {
					uiActions.setClipboardSuccess(false);
				}, 2000);
				activeTimeouts.push(timeoutId);
				analytics.copyTranscript(detail.text.split(/\s+/).length);
			} catch (err) {
				console.error('Failed to copy to clipboard:', err);
			}
		}
		// Handle edit event
		if (type === 'edit' && detail?.text !== undefined) {
			import('$lib/services/infrastructure/stores').then(({ transcriptionActions }) => {
				transcriptionActions.updateText(detail.text);
			});
		}
		// Forward other events to child components as needed
	}

	// Track if user has interacted with the page
	let hasUserInteracted = false;
	let modelLoadStarted = false;

	// Start background model load after first user interaction OR after configured delay
	// This gives us the best of both worlds - fast initial page load but models ready when needed
	function startModelLoading() {
		if (modelLoadStarted) return;

		// Only download if privacy mode is enabled
		const privacyMode =
			typeof localStorage !== 'undefined' &&
			localStorage.getItem(STORAGE_KEYS.PRIVACY_MODE) === 'true';

		if (!privacyMode) {
			// console.log('⏭️ Privacy mode not enabled - skipping model download');
			return;
		}

		modelLoadStarted = true;

		// Start progressive model loading
		import('$lib/services/transcription/simpleHybridService').then(({ simpleHybridService }) => {
			// console.log('🚀 Starting progressive Whisper model download...');
			simpleHybridService.startBackgroundLoad();
		});
	}

	function handleFirstInteraction() {
		if (hasUserInteracted) return;
		hasUserInteracted = true;

		// Remove listeners after first interaction
		if (typeof window !== 'undefined') {
			window.removeEventListener('click', handleFirstInteraction);
			window.removeEventListener('touchstart', handleFirstInteraction);
			window.removeEventListener('keydown', handleFirstInteraction);
		}

		// Start loading immediately on interaction
		startModelLoading();
	}

	// Listen for privacy mode changes from Settings
	function handlePrivacyModeChange(event) {
		const { setting, value } = event.detail;
		if (setting === 'privacyMode' && value === true) {
			// console.log('🔒 Privacy mode enabled - starting model download immediately');
			startModelLoading();
		}
	}

	// Lifecycle hooks
	onMount(() => {
		// Initialize services
		initializeServices({ debug: false });

		// Listen for privacy mode toggle from Settings
		if (typeof window !== 'undefined') {
			window.addEventListener(SERVICE_EVENTS.SETTINGS.CHANGED, handlePrivacyModeChange);
		}

		// Wait for first user interaction before loading models
		// This prevents affecting Lighthouse/PageSpeed scores
		if (typeof window !== 'undefined') {
			window.addEventListener('click', handleFirstInteraction, { once: true });
			window.addEventListener('touchstart', handleFirstInteraction, { once: true });
			window.addEventListener('keydown', handleFirstInteraction, { once: true });

			// Also start loading after configured delay if no interaction
			// This ensures models are ready when user needs them
			const delayTimeoutId = setTimeout(() => {
				if (!modelLoadStarted) {
					// console.log(
					// 	`⏰ Auto-starting model load after ${ANIMATION.MODEL.AUTO_LOAD_DELAY / 1000}s delay`
					// );
					startModelLoading();
				}
			}, ANIMATION.MODEL.AUTO_LOAD_DELAY);
			activeTimeouts.push(delayTimeoutId);
		}

		// Subscribe to permission denied state to show error modal
		const permissionUnsub = hasPermissionError.subscribe((denied) => {
			if (denied) {
				// Show permission error modal
				uiActions.setPermissionError(true);
			}
		});

		// Add to unsubscribe list
		unsubscribers.push(permissionUnsub);

		// Subscribe to transcription completion to dispatch event for history saving
		const completionUnsub = transcriptionCompletedEvent.subscribe((text) => {
			if (text) {
				const recState = $recordingState;
				const prefs = $userPreferences;
				const method =
					typeof localStorage !== 'undefined'
						? localStorage.getItem(STORAGE_KEYS.LAST_TRANSCRIPTION_METHOD) || 'gemini'
						: 'gemini';

				dispatch('transcriptionCompleted', {
					count: 1,
					transcript: {
						text,
						audioBlob: recState.audioBlob || null,
						duration: recState.duration || 0,
						promptStyle: prefs.promptStyle || 'standard',
						method
					}
				});
			}
		});
		unsubscribers.push(completionUnsub);
	});

	// Clean up subscriptions and services
	onDestroy(() => {
		// Unsubscribe from all subscriptions
		unsubscribers.forEach((unsub) => unsub());

		// Clear all active timeouts
		activeTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
		activeTimeouts = [];

		// Remove event listeners
		if (typeof window !== 'undefined') {
			window.removeEventListener(SERVICE_EVENTS.SETTINGS.CHANGED, handlePrivacyModeChange);
			window.removeEventListener('click', handleFirstInteraction);
			window.removeEventListener('touchstart', handleFirstInteraction);
			window.removeEventListener('keydown', handleFirstInteraction);
		}
	});

	// Export functions for external components
	export function startRecording() {
		if (recordingControlsRef) {
			recordingControlsRef.startRecording();
		}
	}

	export function stopRecording() {
		if (recordingControlsRef) {
			recordingControlsRef.stopRecording();
		}
	}

	export function toggleRecording() {
		if (recordingControlsRef) {
			recordingControlsRef.toggleRecording();
		}
	}

	export const recording = isRecording; // Export the isRecording store

	function handleModelReady() {
		modelReady = true;
	}
</script>

<!-- Main wrapper - simplified orchestrator layout -->
<div class="main-wrapper mx-auto box-border w-full">
	<!-- Shared container with proper centering for mobile -->
	<div class="mobile-centered-container flex w-full flex-col items-center justify-center">
		<!-- Recording Controls Section -->
		<RecordingControls
			bind:this={recordingControlsRef}
			{ghostComponent}
			{onPreloadRequest}
			{isPremiumUser}
			{modelReady}
			on:recordingStateChanged
			on:error
			on:preload
		/>

		<!-- Dynamic content area - only render when there's content -->
		{#if $isRecording || $isTranscribing || $transcriptionText || $errorMessage}
			<div
				class="content-wrapper relative mb-10 mt-2 flex w-full flex-col items-center transition-all duration-300 ease-in-out"
			>
				<!-- Transcript Display -->
				{#if ($transcriptionText || $liveMode === 'true') && (!$isRecording || $liveMode === 'true')}
					<TranscriptDisplay
						transcript={$transcriptionText || ($isRecording ? 'Listening...' : '')}
						{responsiveFontSize}
						on:copy={handleTranscriptEvent}
						on:focus={handleTranscriptEvent}
					/>
				{/if}

				<!-- Status and Error Messages -->
				<RecordingStatus />
			</div>
		{/if}
	</div>
</div>

<!-- Transcription Effects (Confetti) -->
<TranscriptionEffects {ghostComponent} targetSelector=".ghost-icon-wrapper" />

<style>
	/* Main wrapper to ensure proper positioning */
	.main-wrapper {
		position: relative;
		z-index: 1;
		width: 100%;
		box-sizing: border-box;
	}

	/* Improved focus styles for keyboard navigation */
	:focus-visible {
		outline: 2px solid #f59e0b;
		outline-offset: 2px;
	}

	/* Apply box-sizing to all elements for consistent layout */
	* {
		box-sizing: border-box;
	}

	/* Mobile-centered container */
	.mobile-centered-container {
		width: 100%;
		max-width: 100vw;
		margin: 0 auto;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
</style>
