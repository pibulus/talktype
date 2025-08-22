<!--
  RecordingControls component - handles the recording button and controls
  Focused responsibility: user interaction with recording functionality
-->
<script>
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import RecordButtonWithTimer from './RecordButtonWithTimer.svelte';
	import AudioVisualizer from './AudioVisualizer.svelte';
	import { createRecordingControlsService } from '$lib/services/audio/recordingControlsService';
	import {
		initializeServices,
		isRecording,
		isTranscribing,
		recordingDuration,
		transcriptionText,
		transcriptionProgress,
		uiState,
		uiActions
	} from '$lib/services';
	import { CTA_PHRASES } from '$lib/constants';

	const dispatch = createEventDispatcher();

	// Props
	export let ghostComponent = null;
	export let onPreloadRequest = null;
	export let isPremiumUser = false;
	export let onModelRequired = () => {};
	export let modelReady = false;

	// Local state
	let services;
	let recordingControlsService;
	let currentCta = CTA_PHRASES[0];

	// Reactive button label computation
	$: buttonLabel = $isRecording ? 'Stop Recording' : $transcriptionText ? currentCta : currentCta;

	onMount(() => {
		// Initialize services
		services = initializeServices({ debug: false });

		// Create recording controls service
		recordingControlsService = createRecordingControlsService({
			audioService: services.audioService,
			transcriptionService: services.transcriptionService,
			hapticService: services.hapticService,
			pwaService: services.pwaService,
			uiActions,
			stores: {
				isRecording,
				transcriptionText
			}
		});

		// Set ghost component reference
		if (ghostComponent) {
			recordingControlsService.setGhostComponent(ghostComponent);
		}

		// Set preload handler
		if (onPreloadRequest) {
			recordingControlsService.setPreloadHandler(onPreloadRequest);
		}
	});

	onDestroy(() => {
		if (recordingControlsService) {
			recordingControlsService.cleanup();
		}
	});

	async function handleRecordingToggle() {
		console.log('[RecordingControls] handleRecordingToggle called, isRecording:', $isRecording);
		
		if (!recordingControlsService) {
			console.log('[RecordingControls] No recording service available');
			return;
		}

		// Check if model is ready first (only when starting recording)
		if (!modelReady && !$isRecording) {
			console.log('[RecordingControls] Model not ready, requesting initialization');
			// Tell parent to show model initialization UI
			onModelRequired();
			return;
		}

		try {
			console.log('[RecordingControls] Calling toggleRecording...');
			await recordingControlsService.toggleRecording();

			// Update CTA if we have transcription text
			if ($transcriptionText && !$isRecording) {
				currentCta = recordingControlsService.getCurrentCta();
			}

			// Dispatch events for parent components
			dispatch('recordingStateChanged', {
				isRecording: $isRecording,
				hasTranscription: !!$transcriptionText
			});
		} catch (error) {
			console.error('Recording toggle failed:', error);
			dispatch('error', { message: error.message });
		}
	}

	function handlePreload() {
		if (recordingControlsService) {
			recordingControlsService.preloadSpeechModel();
		}
		dispatch('preload');
	}

	// Export functions for external access
	export async function startRecording() {
		if (recordingControlsService) {
			await recordingControlsService.startRecording();
		}
	}

	export async function stopRecording() {
		if (recordingControlsService) {
			await recordingControlsService.stopRecording();
		}
	}

	export async function toggleRecording() {
		await handleRecordingToggle();
	}
</script>

<!-- Recording controls wrapper -->
<div class="recording-controls-wrapper w-full">
	<!-- Recording button/progress bar section -->
	<div class="button-section relative flex w-full justify-center pb-4 pt-2">
		<div class="button-container mx-auto flex w-full max-w-[500px] justify-center">
			<RecordButtonWithTimer
				recording={$isRecording}
				transcribing={$isTranscribing}
				clipboardSuccess={$uiState.clipboardSuccess}
				recordingDuration={$recordingDuration}
				progress={$transcriptionProgress}
				{isPremiumUser}
				{buttonLabel}
				on:click={handleRecordingToggle}
				on:preload={handlePreload}
			/>
		</div>
	</div>

	<!-- Audio visualizer - only show when recording -->
	{#if $isRecording}
		<div class="visualizer-section mt-6 flex w-full justify-center">
			<div class="wrapper-container flex w-full justify-center">
				<div
					class="visualizer-wrapper mx-auto w-[90%] max-w-[500px] animate-fadeIn rounded-[2rem] border-[1.5px] border-pink-100 bg-white/95 p-4 shadow-lg sm:w-full"
					style="box-shadow: 0 10px 25px -5px rgba(249, 168, 212, 0.3), 0 8px 10px -6px rgba(249, 168, 212, 0.2), 0 0 15px rgba(249, 168, 212, 0.15);"
				>
					<AudioVisualizer />
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Recording controls wrapper */
	.recording-controls-wrapper {
		position: relative;
		width: 100%;
	}

	/* Button section styling */
	.button-section {
		position: relative;
		z-index: 30;
		background: transparent;
	}

	/* Visualizer section styling */
	.visualizer-section {
		position: relative;
		z-index: 10;
	}

	/* Common animation for fading elements in */
	.animate-fadeIn {
		animation: localFadeIn 0.8s ease-out forwards;
	}

	@keyframes localFadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Media queries for mobile responsiveness */
	@media (max-width: 768px) {
		.button-container {
			width: 90%;
			max-width: 90vw;
			margin: 0 auto;
		}

		/* Ensure minimum width even on very small screens */
		.wrapper-container {
			min-width: 280px;
			display: flex;
			justify-content: center;
		}
	}
</style>
