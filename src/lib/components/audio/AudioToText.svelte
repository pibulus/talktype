<!--
  AudioToText Orchestrator - Simplified main component
  Coordinates child components for recording and transcription functionality
-->
<script>
	import { onMount, onDestroy } from 'svelte';
	import RecordingControls from './RecordingControls.svelte';
	import TranscriptDisplay from './TranscriptDisplay.svelte';
	import RecordingStatus from './RecordingStatus.svelte';
	import TranscriptionEffects from './TranscriptionEffects.svelte';
	import ModelInitializer from '../whisper/ModelInitializer.svelte';
	import { memoize } from '$lib/utils/performanceUtils';
	import {
		initializeServices,
		// Stores
		isRecording,
		transcriptionText,
		errorMessage,
		hasPermissionError,
		uiActions
	} from '$lib/services';
	import { whisperStatus } from '../../services/transcription/whisper/whisperService';

	// Props - simplified interface
	export let ghostComponent = null;
	export let onPreloadRequest = null;
	export let isPremiumUser = false;

	// Service instances
	let unsubscribers = [];
	let modelInitializer;
	let modelReady = false;
	
	// Subscribe to whisper status to track when model is ready
	$: modelReady = $whisperStatus.isLoaded;

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
				return 'text-xs sm:text-sm md:text-base';
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
				setTimeout(() => {
					uiActions.setClipboardSuccess(false);
				}, 2000);
			} catch (err) {
				console.error('Failed to copy to clipboard:', err);
			}
		}
		// Forward other events to child components as needed
	}

	// Lifecycle hooks
	onMount(() => {
		// Initialize services
		initializeServices({ debug: false });

		// Subscribe to permission denied state to show error modal
		const permissionUnsub = hasPermissionError.subscribe((denied) => {
			if (denied) {
				// Show permission error modal
				uiActions.setPermissionError(true);
			}
		});

		// Add to unsubscribe list
		unsubscribers.push(permissionUnsub);
	});

	// Clean up subscriptions and services
	onDestroy(() => {
		// Unsubscribe from all subscriptions
		unsubscribers.forEach((unsub) => unsub());
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

	// Handle when model is required
	function handleModelRequired() {
		if (modelInitializer) {
			modelInitializer.promptForModel();
		}
	}

	function handleModelReady() {
		modelReady = true;
	}
</script>

<!-- Model Initializer (handles download UI) -->
<ModelInitializer bind:this={modelInitializer} onModelReady={handleModelReady} />

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
			onModelRequired={handleModelRequired}
			on:recordingStateChanged
			on:error
			on:preload
		/>

		<!-- Dynamic content area - only render when there's content -->
		{#if $isRecording || $transcriptionText || $errorMessage}
			<div
				class="content-wrapper relative mb-10 mt-2 flex w-full flex-col items-center transition-all duration-300 ease-in-out"
			>
				<!-- Transcript Display -->
				{#if $transcriptionText && !$isRecording}
					<TranscriptDisplay
						transcript={$transcriptionText}
						{responsiveFontSize}
						on:copy={handleTranscriptEvent}
						on:share={handleTranscriptEvent}
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
