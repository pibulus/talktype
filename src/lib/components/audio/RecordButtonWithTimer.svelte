<script>
	import { ANIMATION, CTA_PHRASES, COPY_MESSAGES, getRandomFromArray } from '$lib/constants';

	// Props
	export let recording = false;
	export let transcribing = false;
	export let clipboardSuccess = false;
	export let recordingDuration = 0;
	export let isPremiumUser = false;
	export let buttonLabel = CTA_PHRASES[0];
	export let progress = 0; // For transcription progress

	// Element refs
	let recordButtonElement;

	// Handlers
	export function animateButtonPress() {
		if (recordButtonElement) {
			recordButtonElement.classList.remove('button-press');
			void recordButtonElement.offsetWidth; // Force reflow
			recordButtonElement.classList.add('button-press');
			setTimeout(() => {
				if (recordButtonElement) {
					recordButtonElement.classList.remove('button-press');
				}
			}, ANIMATION.BUTTON.PRESS_DURATION);
		}
	}

	function handleKeyDown(event) {
		// Space or Enter key to toggle recording when focused
		if ((event.key === 'Enter' || event.key === ' ') && !transcribing) {
			event.preventDefault(); // Prevent default space/enter behavior
			dispatch('click');
		}
	}

	// Generate a random success message for the clipboard
	function getRandomCopyMessage() {
		return getRandomFromArray(COPY_MESSAGES);
	}

	// Calculate time remaining
	function getTimeRemaining() {
		const timeLimit = isPremiumUser
			? ANIMATION.RECORDING.PREMIUM_LIMIT
			: ANIMATION.RECORDING.FREE_LIMIT;
		return timeLimit - recordingDuration;
	}

	// Reactive variables for timer states
	$: timeRemaining = getTimeRemaining();
	$: isWarning = timeRemaining <= ANIMATION.RECORDING.WARNING_THRESHOLD;
	$: isDanger = timeRemaining <= ANIMATION.RECORDING.DANGER_THRESHOLD;

	// Format timer display (MM:SS)
	function formatTime(seconds) {
		const minutes = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${minutes}:${secs.toString().padStart(2, '0')}`;
	}

	// Event handling
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
</script>

{#if transcribing}
	<div
		class="progress-container relative mx-auto h-[64px] w-[75%] max-w-[420px] overflow-hidden rounded-full bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 shadow-xl sm:h-[64px] sm:w-[85%]"
		role="progressbar"
		aria-label="Transcription progress"
		aria-valuenow={progress}
		aria-valuemin="0"
		aria-valuemax="100"
		style="min-width: 280px; border: 2px solid rgba(219, 39, 119, 0.2); box-shadow: 0 10px 30px -5px rgba(219, 39, 119, 0.25), 0 0 0 1px rgba(219, 39, 119, 0.05);"
	>
		<!-- Liquid fill with gooey effect -->
		<div
			class="liquid-fill absolute inset-0 flex items-center justify-center"
			style="width: {progress}%; min-width: {progress > 0 ? '20px' : '0'}; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);"
		>
			<!-- Gradient liquid -->
			<div class="liquid-gradient absolute inset-0"></div>
			<!-- Bubble effects -->
			<div class="bubble bubble-1"></div>
			<div class="bubble bubble-2"></div>
			<div class="bubble bubble-3"></div>
			<!-- Glossy overlay -->
			<div class="glossy-overlay absolute inset-0"></div>
		</div>
		<!-- Wave surface animation -->
		<div 
			class="wave-surface absolute left-0 h-full" 
			style="width: {progress}%; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);"
		>
			<div class="wave"></div>
		</div>
		<!-- Loading text on top -->
		<div class="absolute inset-0 flex items-center justify-center">
			<span class="loading-text z-30 text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 drop-shadow-sm">
				{progress < 30 ? 'Processing...' : progress < 60 ? 'Thinking...' : progress < 90 ? 'Almost there...' : 'Finalizing...'}
			</span>
		</div>
	</div>
{:else}
	<button
		bind:this={recordButtonElement}
		class="record-button duration-400 w-[75%] rounded-full transition-all ease-out sm:w-[85%] {clipboardSuccess
			? 'notification-pulse border border-purple-200 bg-purple-50 text-black'
			: 'text-black'} mx-auto max-w-[420px] px-6 py-5 text-center text-xl font-bold shadow-md focus:outline focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 sm:px-8 sm:py-5 sm:text-xl md:text-2xl {!recording &&
		buttonLabel === 'Start Recording' &&
		!clipboardSuccess
			? 'pulse-subtle'
			: ''} {recording ? 'recording-active' : ''} {isWarning && recording
			? 'recording-warning'
			: ''} {isDanger && recording ? 'recording-danger' : ''}"
		style="min-width: 280px; min-height: 64px; transform-origin: center center; position: relative; {recording
			? `--progress: ${Math.min((recordingDuration / (isPremiumUser ? ANIMATION.RECORDING.PREMIUM_LIMIT : ANIMATION.RECORDING.FREE_LIMIT)) * 100, 100)}%`
			: ''}"
		on:click={() => dispatch('click')}
		on:mouseenter={() => dispatch('preload')}
		on:keydown={handleKeyDown}
		disabled={transcribing}
		aria-label={recording ? 'Stop Recording' : 'Start Recording'}
		aria-pressed={recording}
		aria-busy={transcribing}
	>
		<!-- Main button text -->
		<span
			class="cta-text relative inline-block whitespace-nowrap transition-all duration-300 ease-out"
			style="letter-spacing: 0.02em;"
		>
			<!-- Clipboard success message -->
			<span
				class="absolute inset-0 flex transform items-center justify-center transition-all duration-300 ease-out {clipboardSuccess
					? 'scale-100 opacity-100'
					: 'scale-95 opacity-0'}"
				style="visibility: {clipboardSuccess ? 'visible' : 'hidden'};"
			>
				<span class="flex items-center justify-center gap-1">
					<svg
						class="mr-1 h-4 w-4 text-purple-500"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
						style="pointer-events: none;"
					>
						<path
							d="M12,2 C7.6,2 4,5.6 4,10 L4,17 C4,18.1 4.9,19 6,19 L8,19 L8,21 C8,21.6 8.4,22 9,22 C9.3,22 9.5,21.9 9.7,21.7 L12.4,19 L18,19 C19.1,19 20,18.1 20,17 L20,10 C20,5.6 16.4,2 12,2 Z"
							fill="currentColor"
							opacity="0.8"
						/>
						<circle cx="9" cy="10" r="1.2" fill="white" />
						<circle cx="15" cy="10" r="1.2" fill="white" />
					</svg>
					{getRandomCopyMessage()}
				</span>
			</span>

			<!-- Button label with integrated timer -->
			<span
				class="transform transition-all duration-300 ease-out {clipboardSuccess
					? 'scale-90 opacity-0'
					: 'scale-100 opacity-100'}"
				style="visibility: {clipboardSuccess ? 'hidden' : 'visible'};"
			>
				<span class="button-content relative z-10">
					<!-- Main label - the button text is on top of the progress bar -->
					<span class="relative flex items-center justify-center">
						<span
							class="cta__label relative z-10 rounded-lg px-1 py-0.5 {recording
								? 'text-shadow-recording'
								: ''}"
							style="font-size: clamp(1rem, 0.5vw + 0.9rem, 1.25rem); letter-spacing: .02em;"
						>
							{buttonLabel}
						</span>
						<span class="sr-only">
							{#if recording}
								{formatTime(recordingDuration)} of {formatTime(ANIMATION.RECORDING.FREE_LIMIT)}
							{/if}
						</span>
					</span>
				</span>
			</span>
		</span>
	</button>
{/if}

<style>
	/* Base button styling - mostly from original component */
	.record-button {
		position: relative;
		overflow: hidden;
		text-shadow: 0 1px 1px rgba(255, 255, 255, 0.5);
		background-size: 100% 100%;
		background-position: 0% 0%;
		transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
		transition-property: transform, box-shadow, background-image, background-position;

		/* Enhanced default gradient */
		background-image: linear-gradient(to right, rgba(251, 191, 36, 1), rgba(245, 158, 11, 0.96));

		/* Better default shadow */
		box-shadow:
			0 4px 6px -1px rgba(251, 191, 36, 0.2),
			0 2px 4px -1px rgba(0, 0, 0, 0.1),
			inset 0 1px 0 rgba(255, 255, 255, 0.15);
	}

	/* Shimmer effect for the button - commented out as not displaying correctly
  .record-button::before {
    content: "";
    position: absolute;
    top: 0;
    left: -50%;
    width: 25%;
    height: 100%;
    background: linear-gradient(
      to right, 
      rgba(255, 255, 255, 0) 0%, 
      rgba(255, 255, 255, 0.1) 50%, 
      rgba(255, 255, 255, 0) 100%
    );
    transform: skewX(-25deg);
    animation: shimmer 3s infinite;
    filter: blur(5px);
    opacity: 0.7;
    pointer-events: none;
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-100%) skewX(-25deg); }
    100% { transform: translateX(500%) skewX(-25deg); }
  }
  */

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
	.button-press {
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
		animation: button-breathe 3.5s ease-in-out infinite;
		transform-origin: center;
	}

	/* Liquid gooey loading animations */
	.liquid-gradient {
		background: linear-gradient(
			135deg,
			rgba(236, 72, 153, 0.9) 0%,
			rgba(168, 85, 247, 0.9) 50%,
			rgba(99, 102, 241, 0.9) 100%
		);
		animation: liquid-shift 3s ease-in-out infinite;
		filter: blur(0.5px);
	}

	@keyframes liquid-shift {
		0%, 100% {
			transform: translateX(0) scale(1);
		}
		50% {
			transform: translateX(2px) scale(1.02);
		}
	}

	/* Bubble effects for liquid feel */
	.bubble {
		position: absolute;
		background: radial-gradient(circle, rgba(255, 255, 255, 0.8), transparent);
		border-radius: 50%;
		opacity: 0;
	}

	.bubble-1 {
		width: 20px;
		height: 20px;
		bottom: 10%;
		left: 20%;
		animation: bubble-rise 3s ease-in-out infinite;
	}

	.bubble-2 {
		width: 15px;
		height: 15px;
		bottom: 5%;
		left: 50%;
		animation: bubble-rise 3s ease-in-out infinite 1s;
	}

	.bubble-3 {
		width: 10px;
		height: 10px;
		bottom: 15%;
		left: 80%;
		animation: bubble-rise 3s ease-in-out infinite 2s;
	}

	@keyframes bubble-rise {
		0% {
			opacity: 0;
			transform: translateY(0) scale(0.5);
		}
		20% {
			opacity: 0.7;
		}
		80% {
			opacity: 0.3;
			transform: translateY(-30px) scale(1.2);
		}
		100% {
			opacity: 0;
			transform: translateY(-40px) scale(1.5);
		}
	}

	/* Wave surface animation */
	.wave-surface {
		position: absolute;
		top: 0;
		overflow: hidden;
	}

	.wave {
		position: absolute;
		top: -2px;
		right: -2px;
		width: 10px;
		height: 100%;
		background: linear-gradient(90deg, 
			transparent,
			rgba(255, 255, 255, 0.4),
			transparent
		);
		animation: wave-motion 1.5s ease-in-out infinite;
		filter: blur(2px);
	}

	@keyframes wave-motion {
		0%, 100% {
			transform: translateY(-2px) scaleY(1.1);
		}
		50% {
			transform: translateY(2px) scaleY(0.9);
		}
	}

	/* Glossy overlay for candy effect */
	.glossy-overlay {
		background: linear-gradient(
			180deg,
			rgba(255, 255, 255, 0.5) 0%,
			transparent 50%,
			rgba(0, 0, 0, 0.1) 100%
		);
		opacity: 0.6;
	}

	.loading-text {
		animation: pulse-text 2s ease-in-out infinite;
		letter-spacing: 0.05em;
	}

	@keyframes pulse-text {
		0%, 100% {
			opacity: 0.8;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.02);
		}
	}

	@keyframes button-breathe {
		0%,
		100% {
			box-shadow: 0 0 12px 2px rgba(251, 191, 36, 0.35);
			transform: scale(1);
		}
		50% {
			box-shadow: 0 0 20px 6px rgba(251, 191, 36, 0.5);
			transform: scale(1.02);
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

	/* Progress bar styling */
	.progress-container {
		position: relative;
		overflow: hidden;
		transition: all 0.3s ease;
	}

	.progress-bar {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		transition: width 0.3s ease;
		animation: pulse-glow 1.5s infinite ease-in-out;
	}

	@keyframes pulse-glow {
		0% {
			box-shadow: inset 0 0 5px rgba(255, 190, 60, 0.5);
		}
		50% {
			box-shadow: inset 0 0 15px rgba(255, 190, 60, 0.8);
		}
		100% {
			box-shadow: inset 0 0 5px rgba(255, 190, 60, 0.5);
		}
	}

	/* Whole-button progress indicator */
	.recording-active {
		position: relative;
		overflow: hidden;

		/* More visible progress gradient */
		background: linear-gradient(
			to right,
			rgb(251, 191, 36) 0%,
			rgb(251, 191, 36) var(--progress, 0%),
			rgba(251, 191, 36, 0.3) calc(var(--progress, 0%) + 1%),
			rgba(245, 158, 11, 0.15) 100%
		);

		box-shadow:
			0 4px 15px -1px rgba(251, 191, 36, 0.35),
			inset 0 0 10px rgba(251, 191, 36, 0.2),
			0 0 20px rgba(251, 191, 36, 0.2);
		border: 1px solid rgba(251, 191, 36, 0.3);
		/* Smoother & faster transitions for clearer state changes */
		transition:
			background 0.3s ease-out,
			box-shadow 0.3s ease-out,
			border 0.3s ease-out,
			transform 0.2s ease;
	}
	
	/* Add a pseudo-element for the progress bar effect */
	.recording-active::before {
		content: "";
		position: absolute;
		top: 0;
		left: 0;
		bottom: 0;
		width: var(--progress, 0%);
		background: linear-gradient(
			to right,
			rgba(251, 191, 36, 0.9),
			rgba(252, 211, 77, 0.9)
		);
		transition: width 0.3s ease-out;
		z-index: 0;
	}
	
	/* Ensure text stays above the progress bar */
	.recording-active .cta-text {
		position: relative;
		z-index: 1;
	}

	/* Animated edge for progress indicator - commented out as not displaying correctly
  .recording-active::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: calc(var(--progress, 0%) - 1%);
    width: 2%;
    background: linear-gradient(to right, 
      rgba(255, 255, 255, 0), 
      rgba(255, 255, 255, 0.4), 
      rgba(255, 255, 255, 0)
    );
    opacity: 0.8;
    filter: blur(3px);
    animation: pulse-edge 1.5s infinite alternate ease-in-out;
    pointer-events: none;
  }
  
  @keyframes pulse-edge {
    0% { opacity: 0.3; }
    100% { opacity: 0.8; }
  }
  */

	/* Warning state with visible progress */
	.recording-warning {
		background: linear-gradient(
			to right,
			rgba(251, 146, 60, 0.15) 0%,
			rgba(251, 146, 60, 0.15) 100%
		);
	}
	
	.recording-warning::before {
		background: linear-gradient(
			to right,
			rgba(251, 146, 60, 0.9),
			rgba(254, 178, 108, 0.9)
		);
	}

	/* Danger state with visible progress */
	.recording-danger {
		background: linear-gradient(
			to right,
			rgba(239, 68, 68, 0.15) 0%,
			rgba(239, 68, 68, 0.15) 100%
		);
		animation: pulse-danger 1s ease-in-out infinite;
	}
	
	.recording-danger::before {
		background: linear-gradient(
			to right,
			rgba(239, 68, 68, 0.9),
			rgba(248, 113, 113, 0.9)
		);
	}
	
	@keyframes pulse-danger {
		0%, 100% {
			box-shadow:
				0 4px 15px -1px rgba(239, 68, 68, 0.35),
				inset 0 0 10px rgba(239, 68, 68, 0.2),
				0 0 20px rgba(239, 68, 68, 0.2);
		}
		50% {
			box-shadow:
				0 4px 20px -1px rgba(239, 68, 68, 0.5),
				inset 0 0 15px rgba(239, 68, 68, 0.3),
				0 0 30px rgba(239, 68, 68, 0.3);
		}
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
			0 1px 2px rgba(0, 0, 0, 0.2),
			0 0 1px rgba(0, 0, 0, 0.1);
		font-weight: 700;
		letter-spacing: 0.01em;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.animate-fadeIn {
		animation: fadeIn 0.3s ease-in-out;
	}

	/* Subtle pulse animation for danger state */
	@keyframes pulse-subtle {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.8;
			transform: scale(1.02);
		}
	}

	.animate-pulse-subtle {
		animation: pulse-subtle 1.2s ease-in-out infinite;
	}

	/* Responsive adjustments for mobile */
	@media (max-width: 640px) {
		.button-content {
			font-size: 0.95em;
		}

		.timer-display {
			font-size: 0.9em;
		}
	}
</style>
