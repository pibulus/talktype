<script>
	import { createEventDispatcher, onDestroy, tick } from 'svelte';
	import { ANIMATION, getRandomFromArray } from '$lib/constants';
	import TranscribingState from './states/TranscribingState.svelte';
	import { getRecordButtonState } from './recordButtonState.js';
	import { uiActions } from '$lib/services';

	const dispatch = createEventDispatcher();

	// Props
	export let recording = false;
	export let transcribing = false;
	export let clipboardSuccess = false;
	export let recordingDuration = 0;
	export let maxDuration = 300; // Default 5 minutes
	// Default to the app's real thresholds so a caller that forgets to wire
	// these props can't silently drift from production behavior.
	export let warningThreshold = ANIMATION.RECORDING.WARNING_THRESHOLD;
	export let dangerThreshold = ANIMATION.RECORDING.DANGER_THRESHOLD;
	export let buttonLabel = 'Say hi';
	export let successMessages = ['Copied!'];
	export let progress = 0; // For transcription progress
	export let transcribingLabel = 'Processing';
	// One-shot offline-model feedback, e.g. { text: 'Offline ready', tone: 'ok' | 'error' }.
	// A discreet pulse above the button; cleared by the parent. Never fights the timer fill.
	export let offlineNotice = null;

	// Element refs
	let recordButtonElement;
	let transcribingWrapper;
	let animationTimeout = null;
	let copyMessage = getCopySuccessMessage();
	let previousClipboardSuccess = false;

	function clearAnimationTimeout() {
		if (animationTimeout) {
			clearTimeout(animationTimeout);
			animationTimeout = null;
		}
	}

	// Cleanup on destroy
	onDestroy(() => {
		clearAnimationTimeout();
	});

	$: buttonState = getRecordButtonState({
		recording,
		recordingDuration,
		maxDuration,
		warningThreshold,
		dangerThreshold
	});
	$: showClipboardSuccess = clipboardSuccess && !recording;
	$: showOfflineNotice = Boolean(offlineNotice?.text) && !recording && !transcribing;
	$: showAmbientPulse = !recording && !showClipboardSuccess;
	$: buttonStyle = `transform-origin: center center; position: relative; --progress: ${buttonState.progressPercentage.toFixed(2)}%; --progress-ratio: ${buttonState.progressRatio.toFixed(4)};`;

	$: {
		if (clipboardSuccess && !previousClipboardSuccess) {
			copyMessage = getCopySuccessMessage();
		}
		previousClipboardSuccess = clipboardSuccess;
	}

	// Announce limit-approach to screen readers on threshold crossings only —
	// the button's aria-label carries the running time, but a label change is
	// not announced while pressed, so the edges need a live-region nudge.
	let wasWarning = false;
	let wasDanger = false;
	$: {
		if (recording) {
			if (buttonState.isDanger && !wasDanger) {
				uiActions.setScreenReaderMessage(
					`Recording stops in ${buttonState.timeRemaining} seconds.`
				);
			} else if (buttonState.isWarning && !wasWarning) {
				uiActions.setScreenReaderMessage(
					`${buttonState.timeRemaining} seconds of recording time left.`
				);
			}
			wasWarning = buttonState.isWarning;
			wasDanger = buttonState.isDanger;
		} else {
			wasWarning = false;
			wasDanger = false;
		}
	}

	// Keep keyboard focus anchored when the button swaps to the transcribing
	// bar and back — otherwise focus silently drops to <body> mid-flow.
	let restoreFocusToButton = false;
	$: void handleTranscribingFocusSwap(transcribing);

	async function handleTranscribingFocusSwap(isTranscribing) {
		if (typeof document === 'undefined') return;

		if (isTranscribing) {
			restoreFocusToButton = document.activeElement === recordButtonElement;
			if (restoreFocusToButton) {
				await tick();
				transcribingWrapper?.focus({ preventScroll: true });
			}
		} else if (restoreFocusToButton) {
			restoreFocusToButton = false;
			await tick();
			recordButtonElement?.focus({ preventScroll: true });
		}
	}

	// Handlers
	export function animateButtonPress() {
		if (recordButtonElement) {
			clearAnimationTimeout();

			recordButtonElement.classList.remove('button-press');
			void recordButtonElement.offsetWidth; // Force reflow
			recordButtonElement.classList.add('button-press');
			animationTimeout = setTimeout(() => {
				if (recordButtonElement) {
					recordButtonElement.classList.remove('button-press');
				}
				animationTimeout = null;
			}, ANIMATION.BUTTON.PRESS_DURATION);
		}
	}

	function getCopySuccessMessage() {
		return getRandomFromArray(successMessages?.length ? successMessages : ['Copied']) || 'Copied';
	}
</script>

{#if transcribing}
	<div
		bind:this={transcribingWrapper}
		tabindex="-1"
		class="transcribing-focus-anchor"
		aria-label="Transcribing"
	>
		<TranscribingState {progress} label={transcribingLabel} />
	</div>
{:else}
	{#if showOfflineNotice}
		<div
			class="offline-notice {offlineNotice.tone === 'error' ? 'is-error' : 'is-ok'}"
			role="status"
			aria-live="polite"
		>
			{offlineNotice.text}
		</div>
	{/if}
	<button
		bind:this={recordButtonElement}
		class="record-button w-[90%] rounded-full sm:w-[85%] {showAmbientPulse
			? 'pulse-subtle'
			: ''} {showClipboardSuccess
			? 'notification-pulse border border-purple-200 bg-purple-50'
			: ''} mx-auto flex h-[64px] min-w-[280px] max-w-[420px] items-center justify-center px-6 text-center text-xl font-bold text-black shadow-md focus:outline focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 sm:px-8 sm:text-xl md:text-2xl {recording
			? 'recording-active'
			: ''} {buttonState.isWarning ? 'recording-warning' : ''} {buttonState.isDanger
			? 'recording-danger'
			: ''}"
		style={buttonStyle}
		on:click={() => dispatch('click')}
		aria-label={recording ? `Stop recording. ${buttonState.durationLabel}` : 'Start Recording'}
		aria-pressed={recording}
	>
		{#if recording}
			<span class="recording-progress-track" aria-hidden="true">
				<span class="recording-progress-fill"></span>
				<span class="recording-progress-head"></span>
			</span>
		{/if}

		<!-- Main button text -->
		{#if showClipboardSuccess}
			<span class="button-content relative z-10 flex items-center justify-center gap-1">
				<svg
					class="h-4 w-4 text-purple-500"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
					aria-hidden="true"
					focusable="false"
				>
					<path
						d="M12,2 C7.6,2 4,5.6 4,10 L4,17 C4,18.1 4.9,19 6,19 L8,19 L8,21 C8,21.6 8.4,22 9,22 C9.3,22 9.5,21.9 9.7,21.7 L12.4,19 L18,19 C19.1,19 20,18.1 20,17 L20,10 C20,5.6 16.4,2 12,2 Z"
						fill="currentColor"
						opacity="0.8"
					/>
					<circle cx="9" cy="10" r="1.2" fill="white" />
					<circle cx="15" cy="10" r="1.2" fill="white" />
				</svg>
				{copyMessage}
			</span>
		{:else}
			<span class="button-content relative z-10">
				<span class="relative flex items-center justify-center">
					<span
						class="cta__label relative z-10 rounded-lg px-1 py-0.5 {recording
							? 'text-shadow-recording'
							: ''}"
						style="font-size: clamp(1rem, 0.5vw + 0.9rem, 1.25rem); letter-spacing: 0;"
					>
						{buttonLabel}
					</span>
				</span>
			</span>
		{/if}
	</button>
{/if}

<style>
	/* Discreet one-shot offline-model notice — floats just above the button,
	   pulses in, then the parent clears it. Pastel-punk, never blocks the timer. */
	.offline-notice {
		position: absolute;
		left: 50%;
		bottom: calc(100% + 8px);
		transform: translateX(-50%);
		z-index: 5;
		white-space: nowrap;
		border-radius: 9999px;
		padding: 0.25rem 0.7rem;
		font-size: 0.8rem;
		font-weight: 900;
		letter-spacing: 0;
		box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
		pointer-events: none;
		animation: offline-notice-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.offline-notice.is-ok {
		border: 1px solid rgba(45, 212, 191, 0.5);
		background: rgba(240, 253, 250, 0.96);
		color: #0f766e;
	}

	.offline-notice.is-error {
		border: 1px solid rgba(251, 113, 133, 0.55);
		background: rgba(255, 241, 242, 0.96);
		color: #be123c;
	}

	@keyframes offline-notice-in {
		from {
			opacity: 0;
			transform: translate(-50%, 6px) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translate(-50%, 0) scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.offline-notice {
			animation-duration: 100ms;
		}
	}

	/* Base button styling */
	.record-button {
		position: relative;
		overflow: hidden;
		isolation: isolate;
		text-shadow: 0 1px 1px rgba(255, 255, 255, 0.5);
		background-size: 100% 100%;
		background-position: 0% 0%;
		transition:
			transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1),
			box-shadow 0.3s cubic-bezier(0.25, 0.1, 0.25, 1),
			background-image 0.3s cubic-bezier(0.25, 0.1, 0.25, 1),
			background-position 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);

		/* Enhanced default gradient */
		background-image: linear-gradient(to right, rgba(251, 191, 36, 1), rgba(245, 158, 11, 0.96));

		/* Better default shadow */
		box-shadow:
			0 4px 6px -1px rgba(251, 191, 36, 0.2),
			0 2px 4px -1px rgba(0, 0, 0, 0.1),
			inset 0 1px 0 rgba(255, 255, 255, 0.15);
	}

	.record-button::before {
		content: '';
		position: absolute;
		inset: 4px;
		z-index: 1;
		border-radius: inherit;
		pointer-events: none;
		background:
			radial-gradient(circle at 50% 18%, rgba(255, 255, 255, 0.68), transparent 42%),
			linear-gradient(90deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0));
		opacity: 0.34;
		transform: scale(0.985);
		animation: button-surface-breathe 4.8s ease-in-out infinite;
	}

	/* Focus state */
	.record-button:focus {
		outline: none;
		box-shadow:
			0 0 0 3px rgba(251, 191, 36, 0.4),
			0 1px 3px rgba(0, 0, 0, 0.1);
	}

	/* Enhanced focus ring for keyboard navigation */
	.record-button:focus-visible {
		outline: 3px solid #ffd65c;
		outline-offset: 2px;
	}

	/* Hover state */
	.record-button:hover:not(:disabled) {
		transform: translateY(-1px) scale(1.02);
		box-shadow:
			0 6px 10px -2px rgba(251, 191, 36, 0.25),
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			inset 0 1px 0 rgba(255, 255, 255, 0.2);
	}

	/* Non-recording hover effect */
	.record-button:not(.recording-active):hover:not(:disabled) {
		background-image: linear-gradient(to right, rgba(252, 211, 77, 1), rgba(251, 191, 36, 1));
	}

	/* Active/pressed state */
	.record-button:active:not(:disabled) {
		transform: translateY(1px) scale(0.98);
		box-shadow:
			0 2px 4px -1px rgba(251, 191, 36, 0.15),
			0 1px 2px -1px rgba(0, 0, 0, 0.1),
			inset 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	/* Non-recording active effect */
	.record-button:not(.recording-active):active:not(:disabled) {
		background-image: linear-gradient(to right, rgba(245, 158, 11, 1), rgba(234, 88, 12, 0.95));
	}

	/* Button press animation */
	:global(.button-press) {
		animation: button-press 0.4s cubic-bezier(0.25, 0.1, 0.25, 1);
	}

	@keyframes button-press {
		0% {
			transform: scale(1);
		}
		35% {
			transform: scale(0.98);
			background-color: #f59e0b;
			box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
		}
		75% {
			transform: scale(1.01);
			background-color: #fbbf24;
		}
		100% {
			transform: scale(1);
			background-color: #fbbf24;
		}
	}

	/* Subtle breathing glow for button */
	.pulse-subtle {
		animation: button-shadow-breathe 4.8s ease-in-out infinite;
		transform-origin: center;
	}

	@keyframes button-shadow-breathe {
		0%,
		100% {
			box-shadow:
				0 4px 6px -1px rgba(251, 191, 36, 0.2),
				0 2px 4px -1px rgba(0, 0, 0, 0.1),
				0 0 8px 1px rgba(251, 191, 36, 0.14);
		}
		50% {
			box-shadow:
				0 4px 7px -1px rgba(251, 191, 36, 0.22),
				0 2px 4px -1px rgba(0, 0, 0, 0.1),
				0 0 12px 2px rgba(251, 191, 36, 0.2);
		}
	}

	@keyframes button-surface-breathe {
		0%,
		100% {
			opacity: 0.24;
			transform: scale(0.985);
		}
		50% {
			opacity: 0.56;
			transform: scale(1.035);
		}
	}

	/* Notification pulse animation */
	.notification-pulse {
		animation: notification-glow 2.5s ease-in-out infinite;
		transform-origin: center;
		box-shadow:
			0 0 15px 3px rgba(139, 92, 246, 0.2),
			0 0 5px 1px rgba(139, 92, 246, 0.1);
		background-image: linear-gradient(
			to bottom,
			rgba(250, 245, 255, 0.9),
			rgba(237, 233, 254, 0.9)
		);
		border: 1px solid rgba(167, 139, 250, 0.3);
	}

	@keyframes notification-glow {
		0%,
		100% {
			box-shadow:
				0 0 10px 1px rgba(139, 92, 246, 0.2),
				0 0 3px 0px rgba(139, 92, 246, 0.1);
			transform: scale(1);
		}
		50% {
			box-shadow:
				0 0 18px 4px rgba(139, 92, 246, 0.3),
				0 0 8px 2px rgba(139, 92, 246, 0.15);
			transform: scale(1.003);
		}
	}

	.transcribing-focus-anchor {
		outline: none;
		width: 100%;
	}

	/* Whole-button progress indicator */
	.recording-active {
		position: relative;
		overflow: hidden;
		--record-progress-fill: linear-gradient(90deg, #fbbf24 0%, #fb923c 68%, #f472b6 100%);
		--record-progress-track: linear-gradient(
			90deg,
			rgba(254, 243, 199, 0.94),
			rgba(251, 191, 36, 0.3)
		);
		background-image: linear-gradient(135deg, rgba(254, 243, 199, 0.98), rgba(251, 191, 36, 0.5));
		box-shadow:
			0 8px 18px -8px rgba(251, 146, 60, 0.44),
			0 0 0 1px rgba(251, 191, 36, 0.34),
			inset 0 1px 0 rgba(255, 255, 255, 0.42);
		border: 1px solid rgba(251, 191, 36, 0.4);
		transition:
			box-shadow 0.3s ease-out,
			border-color 0.3s ease-out,
			transform 0.2s ease;
	}

	.recording-active::before {
		background:
			radial-gradient(circle at 50% 20%, rgba(255, 255, 255, 0.78), transparent 38%),
			linear-gradient(90deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0));
		opacity: 0.42;
	}

	/* Keep the "I'm listening" life alive during recording — the idle state
	   breathes, so the active state shouldn't go static. */
	.recording-active:not(.recording-danger) {
		animation: recording-glow-breathe 2.6s ease-in-out infinite;
	}

	@keyframes recording-glow-breathe {
		0%,
		100% {
			box-shadow:
				0 8px 18px -8px rgba(251, 146, 60, 0.44),
				0 0 0 1px rgba(251, 191, 36, 0.34),
				0 0 10px 1px rgba(251, 146, 60, 0.16),
				inset 0 1px 0 rgba(255, 255, 255, 0.42);
		}
		50% {
			box-shadow:
				0 8px 20px -8px rgba(251, 146, 60, 0.52),
				0 0 0 1px rgba(251, 191, 36, 0.4),
				0 0 18px 4px rgba(251, 146, 60, 0.26),
				inset 0 1px 0 rgba(255, 255, 255, 0.46);
		}
	}

	.recording-progress-track {
		position: absolute;
		inset: 0;
		z-index: 0;
		overflow: hidden;
		border-radius: inherit;
		background: var(--record-progress-track);
	}

	.recording-progress-track::after {
		content: '';
		position: absolute;
		inset: 2px;
		border-radius: inherit;
		border: 1px solid rgba(255, 255, 255, 0.38);
		pointer-events: none;
	}

	.recording-progress-fill {
		position: absolute;
		inset: 0;
		transform: scaleX(var(--progress-ratio, 0));
		transform-origin: left center;
		background: var(--record-progress-fill);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.28),
			0 0 18px rgba(251, 146, 60, 0.28);
		transition:
			transform 340ms cubic-bezier(0.22, 1, 0.36, 1),
			background 220ms ease-out;
	}

	.recording-progress-head {
		position: absolute;
		top: 11px;
		bottom: 11px;
		left: clamp(14px, var(--progress, 0%), calc(100% - 14px));
		width: 2px;
		transform: translateX(-50%);
		border-radius: 9999px;
		background: linear-gradient(
			180deg,
			rgba(255, 255, 255, 0),
			rgba(255, 255, 255, 0.8) 24%,
			rgba(255, 255, 255, 0.8) 76%,
			rgba(255, 255, 255, 0)
		);
		box-shadow:
			0 0 9px rgba(255, 255, 255, 0.58),
			0 0 12px rgba(244, 114, 182, 0.24);
		transition: left 340ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	/* Warning/danger gradients */
	.recording-warning {
		--record-progress-fill: linear-gradient(90deg, #fb923c 0%, #f97316 55%, #fb7185 100%);
		--record-progress-track: linear-gradient(
			90deg,
			rgba(255, 237, 213, 0.94),
			rgba(251, 146, 60, 0.28)
		);
		box-shadow:
			0 8px 18px -8px rgba(249, 115, 22, 0.48),
			0 0 0 1px rgba(251, 146, 60, 0.42),
			inset 0 1px 0 rgba(255, 255, 255, 0.38);
	}

	.recording-danger {
		--record-progress-fill: linear-gradient(90deg, #f97316 0%, #fb7185 58%, #ec4899 100%);
		--record-progress-track: linear-gradient(
			90deg,
			rgba(255, 228, 230, 0.96),
			rgba(251, 113, 133, 0.3)
		);
		box-shadow:
			0 8px 18px -8px rgba(251, 113, 133, 0.56),
			0 0 0 1px rgba(251, 113, 133, 0.46),
			inset 0 1px 0 rgba(255, 255, 255, 0.36);
	}

	.button-content {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	/* Enhanced text visibility when recording */
	.text-shadow-recording {
		text-shadow:
			0 1px 0 rgba(255, 255, 255, 0.28),
			0 1px 8px rgba(255, 255, 255, 0.18);
		font-weight: 700;
		letter-spacing: 0;
	}

	/* Responsive adjustments for mobile */
	@media (max-width: 640px) {
		.button-content {
			font-size: 0.95em;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pulse-subtle,
		:global(.button-press),
		.notification-pulse,
		.record-button::before,
		.recording-active {
			animation: none !important;
		}

		.recording-progress-fill,
		.recording-progress-head {
			transition-duration: 120ms;
		}
	}
</style>
