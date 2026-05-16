<!--
  AudioToText Orchestrator - Simplified main component
  Coordinates child components for recording and transcription functionality
-->
<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import RecordingControls from './RecordingControls.svelte';
	import TranscriptDisplay from './TranscriptDisplay.svelte';
	import RecordingStatus from './RecordingStatus.svelte';
	import TranscriptionEffects from './TranscriptionEffects.svelte';
	import { memoize } from '$lib/utils/performanceUtils';
	import { STORAGE_KEYS } from '$lib/constants';
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
		uiActions,
		transcriptionService
	} from '$lib/services';
	import {
		transcriptionActions,
		transcriptionCompletedEvent
	} from '$lib/services/infrastructure/stores';
	import { liveMode, privacyMode } from '$lib';
	import { transcriptionStore } from '$lib/stores/transcriptionStore';
	import { offlineModelController } from '$lib/services/transcription/offlineModelController.js';
	import { whisperStatus } from '../../services/transcription/whisper/whisperService';

	const dispatch = createEventDispatcher();

	// Props - simplified interface
	export let ghostComponent = null;
	// Service instances
	let unsubscribers = [];
	let modelReady = false;

	// Subscribe to whisper status to track when model is ready
	$: modelReady = $whisperStatus.isLoaded;
	$: liveTranscriptMode = $liveMode === 'true' && $privacyMode !== 'true';

	// Sync streaming text to global store
	$: if (liveTranscriptMode && ($transcriptionStore.transcript || $transcriptionStore.interim)) {
		const fullText = ($transcriptionStore.transcript + ' ' + $transcriptionStore.interim).trim();
		if (fullText) {
			transcriptionActions.updateText(fullText);
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
			await transcriptionService.copyToClipboard(detail.text);
		}
		// Handle edit event
		if (type === 'edit' && detail?.text !== undefined) {
			transcriptionActions.updateText(detail.text);
		}
		// Forward other events to child components as needed
	}

	// Lifecycle hooks
	onMount(() => {
		// Initialize services
		initializeServices({ debug: false });

		offlineModelController.start();

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
				const method = browser
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

		offlineModelController.cleanup();
	});

	// Export functions for external components
	export function startRecording(options = {}) {
		if (recordingControlsRef) {
			return recordingControlsRef.startRecording(options);
		}
		return false;
	}

	export function stopRecording() {
		if (recordingControlsRef) {
			return recordingControlsRef.stopRecording();
		}
	}

	export function toggleRecording() {
		if (recordingControlsRef) {
			return recordingControlsRef.toggleRecording();
		}
	}

	export const recording = isRecording; // Export the isRecording store
</script>

<!-- Main wrapper - simplified orchestrator layout -->
<div class="main-wrapper mx-auto box-border w-full">
	<!-- Shared container with proper centering for mobile -->
	<div class="mobile-centered-container flex w-full flex-col items-center justify-center">
		<!-- Recording Controls Section -->
		<RecordingControls
			bind:this={recordingControlsRef}
			{ghostComponent}
			{modelReady}
			on:recordingStateChanged
			on:error
		/>

		<!-- Dynamic content area - only render when there's content -->
		{#if $isRecording || $isTranscribing || $transcriptionText || $errorMessage}
			<div
				class="content-wrapper relative mb-10 mt-2 flex w-full flex-col items-center transition-all duration-300 ease-in-out"
			>
				<!-- Transcript Display -->
				{#if ($transcriptionText || liveTranscriptMode) && (!$isRecording || liveTranscriptMode)}
					<TranscriptDisplay
						transcript={$transcriptionText || ($isRecording ? 'Listening...' : '')}
						{responsiveFontSize}
						editable={!$isRecording && !$isTranscribing}
						on:copy={handleTranscriptEvent}
						on:edit={handleTranscriptEvent}
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
