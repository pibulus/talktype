<!--
  RecordingControls component - handles the recording button and controls
  Focused responsibility: user interaction with recording functionality
-->
<script>
	import { onMount, onDestroy } from 'svelte';
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
		userPreferences,
		uiState,
		uiActions
	} from '$lib/services';
	import { CTA_PHRASES, ANIMATION, COPY_MESSAGES } from '$lib/constants';
	import { whisperStatus } from '$lib/services/transcription/whisper/whisperService';

	// Props
	export let ghostComponent = null;
	export let isLiveTranscriptMode = false;

	// Local state
	let services;
	let recordingControlsService;
	let currentCta = CTA_PHRASES[0];

	// Reactive button label computation
	$: buttonLabel = $isRecording ? 'All done' : currentCta;

	// One-shot offline-model notice above the record button. Fires a discreet
	// pulse when the offline model finishes loading or fails — then auto-clears.
	let offlineNotice = null;
	let offlineNoticeTimer = null;
	let wasWhisperLoading = false;
	function flashOfflineNotice(text, tone) {
		offlineNotice = { text, tone };
		clearTimeout(offlineNoticeTimer);
		offlineNoticeTimer = setTimeout(() => {
			offlineNotice = null;
		}, 2800);
	}
	$: {
		const s = $whisperStatus;
		// Detect the loading → done/error edge (only when a load was actually running).
		if (wasWhisperLoading && !s.isLoading) {
			if (s.error) flashOfflineNotice('Offline download failed — tap to retry', 'error');
			else if (s.isLoaded) flashOfflineNotice('Offline ready', 'ok');
		}
		wasWhisperLoading = s.isLoading;
	}

	// While transcription is waiting on the offline model, surface Whisper's
	// real status text ("Downloading model 42%") instead of a generic label.
	$: transcribingLabel =
		$isTranscribing && $whisperStatus.isLoading && $whisperStatus.statusText
			? $whisperStatus.statusText
			: 'Processing';
	onDestroy(() => clearTimeout(offlineNoticeTimer));

	onMount(() => {
		// Initialize services
		services = initializeServices({ debug: false });

		// Create recording controls service
		recordingControlsService = createRecordingControlsService({
			audioService: services.audioService,
			transcriptionService: services.transcriptionService,
			hapticService: services.hapticService,
			soundService: services.soundService,
			pwaService: services.pwaService,
			uiActions,
			stores: {
				isRecording,
				isTranscribing,
				transcriptionText
			}
		});

		// Set ghost component reference
		if (ghostComponent) {
			recordingControlsService.setGhostComponent(ghostComponent);
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
		} catch (error) {
			console.error('Recording toggle failed:', error);
		}
	}

	// Export functions for external access
	export async function startRecording(options = {}) {
		if (recordingControlsService) {
			await recordingControlsService.startRecording(options);
			return true;
		}
		return false;
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
				maxDuration={$userPreferences.isSupporter
					? ANIMATION.RECORDING.SUPPORTER_LIMIT
					: ANIMATION.RECORDING.FREE_LIMIT}
				warningThreshold={ANIMATION.RECORDING.WARNING_THRESHOLD}
				dangerThreshold={ANIMATION.RECORDING.DANGER_THRESHOLD}
				successMessages={COPY_MESSAGES}
				{offlineNotice}
				{buttonLabel}
				{transcribingLabel}
				on:click={handleRecordingToggle}
			/>
		</div>
	</div>

	<!-- Audio visualizer -->
	{#if $isRecording && !isLiveTranscriptMode}
		<div class="visualizer-section mt-6 flex w-full justify-center" aria-hidden="true">
			<div class="wrapper-container flex w-full justify-center">
				<div
					class="visualizer-wrapper visualizer-appear mx-auto w-[90%] max-w-[500px] rounded-[2rem] border-[1.5px] border-pink-100 bg-white/95 p-4 shadow-lg sm:w-full"
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

	.visualizer-appear {
		/* Slight delay so the button label swap lands first — two simultaneous
		   layout events read as a jolt; staggered reads as choreography. */
		animation: recording-visualizer-appear 0.7s ease-out 0.12s both;
	}

	@keyframes recording-visualizer-appear {
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
