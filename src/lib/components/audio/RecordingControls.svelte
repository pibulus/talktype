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
		uiState,
		uiActions
	} from '$lib/services';
	import { CTA_PHRASES } from '$lib/constants';

	const dispatch = createEventDispatcher();

	// Props
	export let ghostComponent = null;
	export let onPreloadRequest = null;
	export let isPremiumUser = false;

	// Local state
	let services;
	let recordingControlsService;
	let currentCta = CTA_PHRASES[0];

	// Reactive button label computation
	$: buttonLabel = $isRecording ? 'Stop Recording' : $transcriptionText ? currentCta : currentCta;

	// Progress value for the button - animated from 0 to 100 when transcribing
	let progressValue = 0;
	$: if ($isTranscribing) {
		progressValue = 0;
		const progressInterval = setInterval(() => {
			progressValue = Math.min(progressValue + 10, 90); // Animate to 90%, leave room for completion
			if (!$isTranscribing || progressValue >= 90) {
				clearInterval(progressInterval);
				if (!$isTranscribing) progressValue = 100; // Complete when done
			}
		}, 200);
	} else {
		progressValue = 0;
	}

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
		if (!recordingControlsService) return;

		try {
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

<!-- Recording button/progress bar section -->
<div
	class="button-section relative sticky top-0 z-20 flex w-full justify-center bg-transparent pb-6 pt-2 sm:pb-7 md:pb-8"
>
	<div class="button-container mx-auto flex w-full max-w-[500px] justify-center">
		<RecordButtonWithTimer
			recording={$isRecording}
			transcribing={$isTranscribing}
			clipboardSuccess={$uiState.clipboardSuccess}
			recordingDuration={$recordingDuration}
			progress={progressValue}
			{isPremiumUser}
			{buttonLabel}
			on:click={handleRecordingToggle}
			on:preload={handlePreload}
		/>
	</div>
</div>

<!-- Audio visualizer - only show when recording -->
{#if $isRecording}
	<div class="visualizer-container relative mt-4 flex w-full justify-center">
		<div class="wrapper-container flex w-full justify-center">
			<div
				class="visualizer-wrapper mx-auto w-[90%] max-w-[500px] animate-fadeIn rounded-[2rem] border-[1.5px] border-pink-100 bg-white/80 p-4 backdrop-blur-md sm:w-full"
				style="box-shadow: 0 10px 25px -5px rgba(249, 168, 212, 0.3), 0 8px 10px -6px rgba(249, 168, 212, 0.2), 0 0 15px rgba(249, 168, 212, 0.15);"
			>
				<AudioVisualizer />
			</div>
		</div>
	</div>
{/if}

<style>
	/* Make the button section sticky to prevent jumping */
	.button-section {
		position: sticky;
		top: 0;
		z-index: 20;
		padding-bottom: 1rem;
		background: transparent;
	}

	/* Visualizer container for absolute positioning */
	.visualizer-container {
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
