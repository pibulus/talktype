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
		isPaused,
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
	import { promptStyle, privacyMode } from '$lib';

	// Props
	export let ghostComponent = null;
	export let isLiveTranscriptMode = false;

	// Local state
	let services;
	let recordingControlsService;
	let currentCta = CTA_PHRASES[0];

	// Only the idle CTA now. The recording-time readout that replaced "All done"
	// is computed inside RecordButtonWithTimer, which already has the elapsed
	// and remaining figures — no need to thread them back out to here.
	$: buttonLabel = currentCta;

	// On short desktop viewports the hero (ghost + title + button) fills the
	// screen and the waveform card lands below the fold — the user gets zero
	// visual feedback that the mic hears them. Once the card mounts, nudge it
	// into view with the minimal scroll ('nearest'), after its appear animation.
	let visualizerSection;
	let visualizerRevealTimer = null;
	$: if ($isRecording && !isLiveTranscriptMode && visualizerSection) {
		scheduleVisualizerReveal();
	}

	function scheduleVisualizerReveal() {
		if (visualizerRevealTimer) return;
		visualizerRevealTimer = setTimeout(() => {
			visualizerRevealTimer = null;
			try {
				const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
				visualizerSection?.scrollIntoView({
					behavior: reduceMotion ? 'auto' : 'smooth',
					block: 'end'
				});
			} catch {
				// Scrolling is a nicety — never let it break recording.
			}
		}, 420);
	}

	onDestroy(() => clearTimeout(visualizerRevealTimer));

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
	$: waitingOnOfflineDownload = $isTranscribing && $whisperStatus.isLoading;
	$: activeStyle = $promptStyle;
	$: isStyledTake = $privacyMode !== 'true' && activeStyle && activeStyle !== 'standard';
	$: transcribingLabel =
		waitingOnOfflineDownload && $whisperStatus.statusText
			? $whisperStatus.statusText
			: isStyledTake
				? activeStyle === 'pirate'
					? 'Translating to Pirate...'
					: activeStyle === 'victorian'
						? 'Brewing Victorian...'
						: 'Polishing style...'
				: 'Processing';
	// The label already reports Whisper's real percentage — drive the bar from the
	// same number so it doesn't creep along on the generic ramp saying something else.
	$: transcribeProgress = waitingOnOfflineDownload
		? $whisperStatus.progress
		: $transcriptionProgress;
	onDestroy(() => clearTimeout(offlineNoticeTimer));

	onMount(() => {
		// Initialize services
		services = initializeServices();

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

	async function handlePauseToggle() {
		if (!recordingControlsService) return;
		try {
			await recordingControlsService.togglePause();
		} catch (error) {
			console.error('Pause toggle failed:', error);
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

	export async function pauseRecording() {
		if (recordingControlsService) {
			return recordingControlsService.pauseRecording();
		}
		return false;
	}

	export async function resumeRecording() {
		if (recordingControlsService) {
			return recordingControlsService.resumeRecording();
		}
		return false;
	}

	export async function togglePause() {
		if (recordingControlsService) {
			return recordingControlsService.togglePause();
		}
		return false;
	}
</script>

<!-- Recording controls wrapper -->
<div class="recording-controls-wrapper w-full">
	<!-- Recording button/progress bar section -->
	<div class="button-section relative flex flex-col items-center justify-center pb-4 pt-2">
		<div class="button-container mx-auto flex w-full max-w-[500px] justify-center">
			<RecordButtonWithTimer
				recording={$isRecording}
				paused={$isPaused}
				transcribing={$isTranscribing}
				clipboardSuccess={$uiState.clipboardSuccess}
				recordingDuration={$recordingDuration}
				progress={transcribeProgress}
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
		{#if $isRecording}
			<div class="mt-3 flex items-center justify-center">
				<button
					type="button"
					class="pause-toggle-btn group flex items-center gap-1.5 rounded-full border-2 border-pink-200 bg-white/95 px-4 py-1.5 text-xs font-black text-gray-800 shadow-sm transition-all duration-150 hover:border-pink-400 hover:bg-pink-50 active:scale-95 {$isPaused
						? 'border-amber-400 bg-amber-50 text-amber-900 ring-2 ring-amber-200 ring-offset-1'
						: ''}"
					on:click|stopPropagation={handlePauseToggle}
					aria-label={$isPaused ? 'Resume recording' : 'Pause recording'}
				>
					{#if $isPaused}
						<span class="text-sm transition-transform duration-150 group-hover:scale-110">▶️</span>
						<span>Resume take</span>
					{:else}
						<span class="text-sm transition-transform duration-150 group-hover:scale-110">⏸️</span>
						<span>Pause take</span>
					{/if}
				</button>
			</div>
		{/if}
	</div>

	<!-- Audio visualizer -->
	{#if $isRecording && !isLiveTranscriptMode}
		<!-- mb-28 clears the fixed footer so scrollIntoView can fully reveal the card -->
		<div
			class="visualizer-section mb-28 mt-6 flex w-full justify-center"
			aria-hidden="true"
			bind:this={visualizerSection}
		>
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
		/* scrollIntoView respects this (unlike margin) — keeps the card clear
		   of the fixed footer when the reveal scroll runs. */
		scroll-margin-bottom: 7rem;
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
