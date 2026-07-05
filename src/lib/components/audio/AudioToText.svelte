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
		uiState,
		uiActions,
		transcriptionService
	} from '$lib/services';
	import {
		transcriptionActions,
		transcriptionCompletedEvent
	} from '$lib/services/infrastructure/stores';
	import { waveformData } from '$lib/services/infrastructure';
	import { getAudioDisplayLevel } from '$lib/utils/audioLevel.js';
	import { liveMode, privacyMode } from '$lib';
	import { transcriptionStore } from '$lib/stores/transcriptionStore';
	import { offlineModelController } from '$lib/services/transcription/offlineModelController.js';

	const dispatch = createEventDispatcher();

	// Props - simplified interface
	export let ghostComponent = null;
	// Service instances
	let unsubscribers = [];

	$: liveTranscriptMode = $liveMode === 'true' && $privacyMode !== 'true';

	// Live Mode's "Listening..." gap: before the first Deepgram partial lands
	// there is no moving proof the mic hears anything. Feed a tiny meter with
	// the real analyser level; null data (blind analyser) gets a gentle pulse.
	$: showListeningMeter = liveTranscriptMode && $isRecording && !$transcriptionText;
	$: listeningLevel = showListeningMeter
		? $waveformData === null
			? null
			: getAudioDisplayLevel($waveformData)
		: 0;
	const METER_BAR_SCALES = [0.55, 0.85, 1, 0.85, 0.55];

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
				return 'text-lg sm:text-xl md:text-2xl';
			} else if (wordCount <= 15) {
				return 'text-base sm:text-lg md:text-xl';
			} else {
				return 'text-base md:text-lg';
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
				let method = 'gemini';
				if (browser) {
					try {
						method = localStorage.getItem(STORAGE_KEYS.LAST_TRANSCRIPTION_METHOD) || 'gemini';
					} catch {
						// Storage blocked (private mode) — keep the default so the
						// completed transcript still reaches the history pipeline.
					}
				}

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
			isLiveTranscriptMode={liveTranscriptMode}
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
						copyNeedsGesture={$uiState.copyNeedsGesture}
						on:copy={handleTranscriptEvent}
						on:edit={handleTranscriptEvent}
						on:focus={handleTranscriptEvent}
					/>
				{/if}

				{#if showListeningMeter}
					<div
						class="listening-meter {listeningLevel === null ? 'is-breathing' : ''}"
						aria-hidden="true"
					>
						{#each METER_BAR_SCALES as scale, i (i)}
							<span
								class="listening-meter-bar"
								style="height: {listeningLevel === null
									? 40
									: Math.max(
											14,
											Math.min(100, 14 + listeningLevel * scale)
										)}%; animation-delay: {i * 0.12}s"
							></span>
						{/each}
					</div>
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

	/* Tiny live-level meter for the pre-first-partial "Listening..." window */
	.listening-meter {
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: 4px;
		height: 26px;
		margin-top: 0.5rem;
	}

	.listening-meter-bar {
		width: 5px;
		border-radius: 9999px;
		background: linear-gradient(to top, #fbbf24, #f472b6);
		opacity: 0.85;
		transition: height 0.14s ease-out;
	}

	/* Analyser is blind (suspended context) — breathe instead of lying flat */
	.listening-meter.is-breathing .listening-meter-bar {
		animation: listening-breathe 1.4s ease-in-out infinite;
	}

	@keyframes listening-breathe {
		0%,
		100% {
			transform: scaleY(0.6);
		}
		50% {
			transform: scaleY(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.listening-meter.is-breathing .listening-meter-bar {
			animation: none;
		}
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
