<!--
  This is the main component for audio recording and transcription.
  It handles recording, transcription, clipboard operations, and UI feedback.
-->
<script>
	import { geminiService } from '$lib/services/geminiService';
	import { promptStyle } from '$lib';
	import { onMount, onDestroy } from 'svelte';
	import AudioVisualizer from './AudioVisualizer.svelte';
	import { ANIMATION, SERVICE_EVENTS } from '$lib/constants';
	import { initializeServices, AudioEvents, AudioStates, TranscriptionEvents } from '$lib/services';

	// Helper variable to check if we're in a browser environment
	const browser = typeof window !== 'undefined';

	// Service instances
	let services;
	let unsubscribers = [];

	// Component state
	let recording = false;
	let transcript = '';
	let errorMessage = '';
	let transcribing = false;
	let clipboardSuccess = false;
	let clipboardTimer;
	let transcriptionProgress = 0;
	let animationFrameId;
	let editableTranscript;
	let showPermissionError = false;
	let permissionErrorTimer;
	let recordingDuration = 0;
	let recordingTimer;
	let isPremiumUser = false; // Change this to true to enable premium features

	// DOM element references
	let eyesElement;
	let ghostIconElement;
	let copyEyesElement;
	let recordButtonElement;
	let progressContainerElement;

	// These will be set from the parent component
	export let parentEyesElement = null;
	export let parentGhostIconElement = null;
	export let isModelPreloaded = false;
	export let onPreloadRequest = null;

	// Prompt style subscription
	let currentPromptStyle;
	const unsubscribePromptStyle = promptStyle.subscribe((value) => {
		currentPromptStyle = value;
	});

	// Accessibility state management
	let screenReaderStatus = ''; // For ARIA announcements
	let copyButtonRef; // Reference to the copy button

	// Smart tooltip management
	let showCopyTooltip = false;
	let tooltipHoverCount = 0;
	let hasUsedCopyButton = false;
	const MAX_TOOLTIP_HOVER_COUNT = 3; // Only show tooltip the first 3 times on hover

	// Fun copy confirmation messages with friendly emojis
	const copyMessages = [
		'Copied to clipboard! ✨',
		'Boom! In your clipboard! 🎉',
		'Text saved to clipboard! 👍',
		'Snagged that for you! 🙌',
		'All yours now! 💫',
		'Copied and ready to paste! 📋',
		'Captured in clipboard! ✅',
		'Text copied successfully! 🌟',
		'Got it! Ready to paste! 🚀',
		'Your text is saved! 💖',
		'Copied with magic! ✨',
		'Text safely copied! 🔮',
		'Copied and good to go! 🎯',
		'Saved to clipboard! 🎊'
	];

	// Special message when document lost focus but was recovered
	const focusRecoveryMessage = 'Click in window first, then copy again! 🔍';

	// Attribution tags for different contexts (using Unicode italic for discretion)
	const simpleAttributionTag = '\n\n𝘛𝘳𝘢𝘯𝘴𝘤𝘳𝘪𝘣𝘦𝘥 𝘣𝘺 𝘛𝘢𝘭𝘬𝘛𝘺𝘱𝘦 👻';

	// Function to generate viral attribution with preview
	function getViralAttribution(text) {
		// Cleaner format with just the text and a discreet credit line (smaller and italicized)
		// Note: We can't use HTML in the share text, but we can use Unicode to indicate italics
		return `${text}\n\n𝘛𝘳𝘢𝘯𝘴𝘤𝘳𝘪𝘣𝘦𝘥 𝘣𝘺 𝘛𝘢𝘭𝘬𝘛𝘺𝘱𝘦 👻`;
	}

	function getRandomCopyMessage(useSpecialMessage = false) {
		// Simplified version that doesn't depend on browser APIs
		return copyMessages[Math.floor(Math.random() * copyMessages.length)];
	}

	// Check if Web Share API is available
	function isWebShareSupported() {
		return (
			browser &&
			typeof navigator !== 'undefined' &&
			navigator.share &&
			typeof navigator.share === 'function'
		);
	}

	// Ghost expression functions - add personality through blinking
	function ghostThinkingHard() {
		// Try using the element from the parent component first
		if (parentEyesElement) {
			parentEyesElement.classList.add('blink-thinking-hard');
		} else if (eyesElement) {
			eyesElement.classList.add('blink-thinking-hard');
		}
	}

	function ghostStopThinking() {
		// Try using the element from the parent component first
		if (parentEyesElement) {
			parentEyesElement.classList.remove('blink-thinking-hard');
		} else if (eyesElement) {
			eyesElement.classList.remove('blink-thinking-hard');
		}
	}

	function ghostReactToTranscript(textLength = 0) {
		if (!eyesElement) return;

		if (textLength > 20) {
			// For longer transcripts, do a "satisfied" double blink
			setTimeout(() => {
				eyesElement.classList.add('blink-once');
				setTimeout(() => {
					eyesElement.classList.remove('blink-once');
					setTimeout(() => {
						eyesElement.classList.add('blink-once');
						setTimeout(() => {
							eyesElement.classList.remove('blink-once');
						}, 150);
					}, 150);
				}, 150);
			}, 200);
		} else if (textLength > 0) {
			// For short transcripts, just do a single blink
			setTimeout(() => {
				eyesElement.classList.add('blink-once');
				setTimeout(() => {
					eyesElement.classList.remove('blink-once');
				}, 200);
			}, 200);
		}
	}

	// Export recording state and functions for external components
	export { recording, stopRecording, startRecording };

	// Function to preload the speech model before recording starts
	function preloadSpeechModel() {
		if (onPreloadRequest) {
			// Use the parent component's shared preload function
			onPreloadRequest();
		}
	}

	async function startRecording() {
		// Don't start if we're already recording (double check)
		if (services?.audioService?.isRecording()) return;

		// Try to preload the speech model if not already done
		preloadSpeechModel();

		// Reset UI state
		errorMessage = '';
		clipboardSuccess = false;

		// Initialize recording timer
		recordingDuration = 0;
		if (recordingTimer) clearInterval(recordingTimer);
		const startTime = Date.now();
		recordingTimer = setInterval(() => {
			const elapsed = Date.now() - startTime;
			recordingDuration = Math.floor(elapsed / 1000);

			// Auto-stop recording at time limit
			const timeLimit = isPremiumUser
				? ANIMATION.RECORDING.PREMIUM_LIMIT
				: ANIMATION.RECORDING.FREE_LIMIT;
			if (recordingDuration >= timeLimit) {
				stopRecording();
			}
		}, 1000);

		// Scroll to bottom when recording starts
		setTimeout(() => {
			if (typeof window !== 'undefined') {
				window.scrollTo({
					top: document.body.scrollHeight,
					behavior: 'smooth'
				});
			}
		}, 100);

		try {
			// Subtle pulse ghost icon when starting recording
			const icon = ghostIconElement || parentGhostIconElement;
			if (icon) {
				icon.classList.add('ghost-pulse');
				setTimeout(() => {
					icon.classList.remove('ghost-pulse');
				}, 500);
			}

			// Start recording using the AudioService
			await services.audioService.startRecording();

			// The state and UI updates will be handled by event subscriptions
		} catch (err) {
			console.error('❌ Error in startRecording:', err);
			errorMessage = `Recording error: ${err.message || 'Unknown error'}`;

			if (recordingTimer) {
				clearInterval(recordingTimer);
				recordingTimer = null;
			}
		}
	}

	async function stopRecording() {
		try {
			// Get current recording state
			if (!services?.audioService?.isRecording()) {
				return;
			}

			// Add wobble animation to ghost when recording stops
			const ghostIcon = ghostIconElement || parentGhostIconElement;
			if (ghostIcon) {
				// Add slight randomness to the wobble
				const wobbleClass = Math.random() > 0.5 ? 'ghost-wobble-left' : 'ghost-wobble-right';
				ghostIcon.classList.add(wobbleClass);
				setTimeout(() => {
					ghostIcon.classList.remove(wobbleClass);
				}, 600);
			}

			// Update UI state
			transcribing = true;

			// Stop recording and get the audio blob
			const audioBlob = await services.audioService.stopRecording();

			// Make the ghost look like it's thinking hard
			ghostThinkingHard();

			// Clear recording timer
			if (recordingTimer) {
				clearInterval(recordingTimer);
				recordingTimer = null;
			}

			// Add confetti celebration for successful transcription (randomly 1/7 times)
			if (audioBlob && audioBlob.size > 10000 && Math.floor(Math.random() * 7) === 0) {
				setTimeout(() => {
					showConfettiCelebration();
				}, 2000);
			}

			// Start transcription process if we have audio data
			if (audioBlob && audioBlob.size > 0) {
				await services.transcriptionService.transcribeAudio(audioBlob);

				// UI updates will be handled by event subscriptions

				// Schedule scroll to bottom when transcript is complete
				setTimeout(() => {
					if (typeof window !== 'undefined') {
						window.scrollTo({
							top: document.body.scrollHeight,
							behavior: 'smooth'
						});
					}
				}, 650);
			} else {
				// If no audio data, revert UI state
				transcribing = false;
				errorMessage = 'No audio recorded. Please try again.';
			}
		} catch (err) {
			console.error('❌ Error in stopRecording:', err);
			errorMessage = `Error processing recording: ${err.message || 'Unknown error'}`;
			transcribing = false;
		}
	}

	// Handle button press animation with classes
	function animateButtonPress() {
		if (recordButtonElement) {
			// Remove any existing animation classes and force a reflow
			recordButtonElement.classList.remove('button-press');
			void recordButtonElement.offsetWidth; // Force reflow

			// Apply the smoother press animation
			recordButtonElement.classList.add('button-press');
			setTimeout(() => {
				if (recordButtonElement) {
					recordButtonElement.classList.remove('button-press');
				}
			}, 400);
		}
	}
	function toggleRecording(event) {
		// Animate button press
		animateButtonPress();

		try {
			if (recording) {
				// Haptic feedback for stop - single pulse
				services.hapticService.stopRecording();

				stopRecording();
				// Screen reader announcement
				screenReaderStatus = 'Recording stopped.';
			} else {
				// Haptic feedback for start - double pulse
				services.hapticService.startRecording();

				// When using "New Recording" button, rotate to next phrase immediately
				if (transcript) {
					console.log('🧹 Clearing transcript for new recording');

					// Pick a random CTA phrase that's not the current one
					let newIndex;
					do {
						newIndex = Math.floor(Math.random() * (ctaPhrases.length - 1)) + 1; // Skip first one (Start Recording)
					} while (newIndex === currentCtaIndex);

					currentCtaIndex = newIndex;
					currentCta = ctaPhrases[currentCtaIndex];
					console.log(`🔥 Rotating to: "${currentCta}"`);

					// Then clear transcript
					transcript = '';
				}

				startRecording();
				// Screen reader announcement
				screenReaderStatus = 'Recording started. Speak now.';
			}
		} catch (err) {
			console.error('Recording operation failed:', err);

			// Show error message using existing toast system
			errorMessage = `Recording error: ${err.message || 'Unknown error'}`;

			// Haptic feedback for error
			services.hapticService.error();

			// Reset recording state if needed
			recording = false;

			// Update screen reader status
			screenReaderStatus = 'Recording failed. Please try again.';
		}
	}

	// Handle keyboard interaction for accessibility
	function handleKeyDown(event) {
		// Space or Enter key to toggle recording when focused
		if ((event.key === 'Enter' || event.key === ' ') && !transcribing) {
			event.preventDefault(); // Prevent default space/enter behavior
			toggleRecording(event);
		}
	}

	// Lifecycle hooks
	onMount(() => {
		// Initialize services
		services = initializeServices({ debug: false });

		// Set local references using parent elements if available
		eyesElement = parentEyesElement;
		ghostIconElement = parentGhostIconElement;

		// Subscribe to audio state changes
		unsubscribers.push(
			services.eventBus.on(AudioEvents.STATE_CHANGED, (data) => {
				console.log(`Audio state changed: ${data.previousState} -> ${data.currentState}`);

				// Update recording state based on audio service state
				recording = data.currentState === AudioStates.RECORDING;

				// Handle error states
				if (data.currentState === AudioStates.ERROR && data.error) {
					errorMessage = `Recording error: ${data.error.message || 'Unknown error'}`;
				}

				// Ghost expression for different states
				if (data.currentState === AudioStates.REQUESTING_PERMISSIONS) {
					// Ghost looks attentive
				} else if (data.currentState === AudioStates.PERMISSION_DENIED) {
					showPermissionError = true;
					if (eyesElement || parentEyesElement) {
						const eyes = eyesElement || parentEyesElement;
						eyes.classList.add('eyes-sad');
						setTimeout(() => {
							eyes.classList.remove('eyes-sad');
						}, 2000);
					}
				}
			})
		);

		// Subscribe to waveform data for visualizer
		unsubscribers.push(
			services.eventBus.on(AudioEvents.WAVEFORM_DATA, (data) => {
				// Data will be passed to AudioVisualizer component
				// (handled by Svelte's reactive bindings)
			})
		);

		// Subscribe to recording error events
		unsubscribers.push(
			services.eventBus.on(AudioEvents.RECORDING_ERROR, (data) => {
				errorMessage = `Recording error: ${data.error || 'Unknown error'}`;
				recording = false;
			})
		);

		// Subscribe to transcription progress
		unsubscribers.push(
			services.eventBus.on(TranscriptionEvents.TRANSCRIPTION_PROGRESS, (data) => {
				transcriptionProgress = data.progress;
			})
		);

		// Subscribe to transcription completion
		unsubscribers.push(
			services.eventBus.on(TranscriptionEvents.TRANSCRIPTION_COMPLETED, (data) => {
				transcript = data.text;
				transcribing = false;

				// React to transcript with ghost expression
				ghostReactToTranscript(data.text?.length || 0);

				// Automatically copy to clipboard when transcription finishes
				if (transcript) {
					services.transcriptionService.copyToClipboard(transcript);
				}
			})
		);
	});

	// Clean up subscriptions and services
	onDestroy(() => {
		// Unsubscribe from all events
		unsubscribers.forEach((unsub) => unsub());

		// Additional cleanup
		if (animationFrameId) cancelAnimationFrame(animationFrameId);
		if (clipboardTimer) clearTimeout(clipboardTimer);
		if (permissionErrorTimer) clearTimeout(permissionErrorTimer);
		if (recordingTimer) clearInterval(recordingTimer);
		if (unsubscribePromptStyle) unsubscribePromptStyle();

		// Ensure audio resources are released
		if (services?.audioService) {
			services.audioService.cleanup();
		}
	});

	// Add/remove recording class on ghost icon when recording state changes
	$: {
		if (typeof window !== 'undefined' && ghostIconElement) {
			if (recording) {
				ghostIconElement.classList.add('recording');
			} else {
				ghostIconElement.classList.remove('recording');
			}
		}
	}

	// Get the latest content from the editable div
	function getEditedTranscript() {
		return editableTranscript ? editableTranscript.innerText : transcript;
	}

	async function copyToClipboard() {
		try {
			// Get current text from editable div
			let textToCopy = getEditedTranscript();

			// Don't try to copy empty text
			if (!textToCopy || textToCopy.trim() === '') {
				console.log('📋 Nothing to copy - transcript is empty');
				return;
			}

			// Update tooltip usage tracking - hide tooltip after button is used
			hasUsedCopyButton = true;
			showCopyTooltip = false;

			// Simple tracking event
			console.log('🔄 TRACKING: user_action=copy_transcript');

			// Use the transcription service to copy
			const copySuccess = await services.transcriptionService.copyToClipboard(textToCopy);

			if (copySuccess) {
				clipboardSuccess = true;

				// Update screen reader status
				screenReaderStatus = 'Transcript copied to clipboard';

				// Auto-hide the clipboard success message
				if (clipboardTimer) clearTimeout(clipboardTimer);
				clipboardTimer = setTimeout(() => {
					clipboardSuccess = false;
				}, 2500);

				// Return focus to the copy button after operation
				if (copyButtonRef) {
					setTimeout(() => {
						copyButtonRef.focus();
					}, 100);
				}
			} else {
				// Show user-friendly error message for failed copy
				clipboardSuccess = true; // Use the success toast but with error message
				screenReaderStatus = 'Unable to copy. Please try clicking in the window first.';

				if (clipboardTimer) clearTimeout(clipboardTimer);
				clipboardTimer = setTimeout(() => {
					clipboardSuccess = false;
				}, 2500);
			}
		} catch (err) {
			console.error('❌ All clipboard methods failed:', err);

			// Error haptic feedback
			services.hapticService.error();

			// Show user-friendly error message
			clipboardSuccess = true; // Use the success toast but with error message
			screenReaderStatus = 'Unable to copy. Please try clicking in the window first.';

			if (clipboardTimer) clearTimeout(clipboardTimer);
			clipboardTimer = setTimeout(() => {
				clipboardSuccess = false;
			}, 2500);
		}
	}

	// Confetti celebration effect for successful transcription
	function showConfettiCelebration() {
		// Only run in browser environment
		if (!browser) return;

		// Create a container for the confetti
		const container = document.createElement('div');
		container.className = 'confetti-container';
		document.body.appendChild(container);

		// Number of confetti pieces
		const confettiCount = 70;
		const colors = ['#ff9cef', '#fde68a', '#a78bfa', '#f472b6', '#60a5fa'];

		// Create and animate confetti pieces
		for (let i = 0; i < confettiCount; i++) {
			const confetti = document.createElement('div');
			confetti.className = 'confetti-piece';

			// Random styling
			const size = Math.random() * 10 + 6; // Size between 6-16px
			const color = colors[Math.floor(Math.random() * colors.length)];

			// Shape variety (circle, square, triangle)
			const shape = Math.random() > 0.66 ? 'circle' : Math.random() > 0.33 ? 'triangle' : 'square';

			// Set styles
			confetti.style.width = `${size}px`;
			confetti.style.height = `${size}px`;
			confetti.style.background = color;
			confetti.style.borderRadius = shape === 'circle' ? '50%' : shape === 'triangle' ? '0' : '2px';
			if (shape === 'triangle') {
				confetti.style.background = 'transparent';
				confetti.style.borderBottom = `${size}px solid ${color}`;
				confetti.style.borderLeft = `${size / 2}px solid transparent`;
				confetti.style.borderRight = `${size / 2}px solid transparent`;
				confetti.style.width = '0';
				confetti.style.height = '0';
			}

			// Random position and animation duration
			const startPos = Math.random() * 100; // Position 0-100%
			const delay = Math.random() * 0.8; // Delay variation (0-0.8s)
			const duration = Math.random() * 2 + 2; // Animation duration (2-4s)
			const rotation = Math.random() * 720 - 360; // Rotation -360 to +360 degrees

			// Apply positions and animation styles
			const horizontalPos = Math.random() * 10 - 5; // Small horizontal variation
			confetti.style.left = `calc(${startPos}% + ${horizontalPos}px)`;
			const startOffset = Math.random() * 15 - 7.5; // Starting y-position variation
			confetti.style.top = `${startOffset}px`;
			confetti.style.animationDelay = `${delay}s`;
			confetti.style.animationDuration = `${duration}s`;

			// Choose a random easing function for variety
			const easing =
				Math.random() > 0.7
					? 'cubic-bezier(0.25, 0.1, 0.25, 1)'
					: Math.random() > 0.5
						? 'cubic-bezier(0.42, 0, 0.58, 1)'
						: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
			confetti.style.animationTimingFunction = easing;
			confetti.style.transform = `rotate(${rotation}deg)`;

			// Add to container
			container.appendChild(confetti);
		}

		// Remove container after animation completes
		setTimeout(() => {
			document.body.removeChild(container);
		}, 2500); // Slightly longer than the longest animation
	}

	// Use the hapticService for vibration instead of this function

	// Function to calculate responsive font size based on transcript length and device
	function getResponsiveFontSize(text) {
		if (!text) return 'text-base'; // Default size

		// Get viewport width for more responsive sizing
		let viewportWidth = 0;
		if (typeof window !== 'undefined') {
			viewportWidth = window.innerWidth;
		}

		// Smaller base sizes for mobile
		const isMobile = viewportWidth > 0 && viewportWidth < 640;

		const length = text.length;
		if (length < 50) return isMobile ? 'text-lg sm:text-xl md:text-2xl' : 'text-xl md:text-2xl'; // Very short text
		if (length < 150) return isMobile ? 'text-base sm:text-lg md:text-xl' : 'text-lg md:text-xl'; // Short text
		if (length < 300) return isMobile ? 'text-sm sm:text-base md:text-lg' : 'text-base md:text-lg'; // Medium text
		if (length < 500) return isMobile ? 'text-xs sm:text-sm md:text-base' : 'text-sm md:text-base'; // Medium-long text
		return isMobile ? 'text-xs sm:text-sm' : 'text-sm md:text-base'; // Long text
	}

	// Reactive font size based on transcript length
	$: responsiveFontSize = getResponsiveFontSize(transcript);

	// Array of fun CTA phrases for the button
	const ctaPhrases = [
		'Start Recording', // Always first
		'Click & Speak',
		'Talk Now',
		'Transcribe Me Baby',
		"Start Yer Yappin'",
		'Say the Thing',
		'Feed Words Now',
		'Just Say It',
		'Speak Up Friend',
		'Talk to Me',
		'Ready When You Are'
	];

	// Always start with "Start Recording"
	let currentCtaIndex = 0;
	let currentCta = ctaPhrases[currentCtaIndex];

	// Track if we need to update CTA after transcription
	let shouldUpdateCta = false;

	// Button label that changes based on state
	let buttonLabel;

	// Function to share transcript using Web Share API
	async function shareTranscript() {
		try {
			// Get the current text from the editable div
			const textToShare = getEditedTranscript();

			// Don't share empty text
			if (!textToShare || textToShare.trim() === '') {
				console.log('📤 Nothing to share - transcript is empty');
				return;
			}

			// Simple tracking event
			console.log('🔄 TRACKING: user_action=share_transcript');

			// Use the transcriptionService to share
			const success = await services.transcriptionService.shareTranscript(textToShare);

			if (success) {
				// Show success toast
				clipboardSuccess = true;
				screenReaderStatus = 'Transcript shared successfully';

				// Auto-hide the success message
				if (clipboardTimer) clearTimeout(clipboardTimer);
				clipboardTimer = setTimeout(() => {
					clipboardSuccess = false;
				}, 2500);
			}
		} catch (err) {
			console.error('❌ Error sharing transcript:', err);
			// Show error in toast
			errorMessage = 'Error sharing transcript. Please try copying instead.';

			// Error haptic feedback
			services.hapticService.error();
		}
	}

	// We've simplified the CTA rotation to happen directly in the toggleRecording function
	// This reactive block is just for logging changes to the CTA
	$: {
		if (!transcript && !recording && !transcribing) {
			console.log(`🎯 Current CTA phrase: "${currentCta}"`);
		}
	}

	// Button label computation - fixed to show CTA phrases
	$: {
		// Only three states: Recording, Ready for New Recording, or Waiting for First Recording
		if (recording) {
			buttonLabel = 'Stop Recording';
		} else if (transcript) {
			// This is where we want to show the rotating CTA phrases, not "New Recording"
			buttonLabel = currentCta;
			console.log(`🔄 Using CTA phrase instead of "New Recording": "${buttonLabel}"`);
		} else {
			buttonLabel = currentCta;
		}
	}
</script>

<!-- Main wrapper with proper containment to prevent layout issues -->
<div class="box-border w-full mx-auto main-wrapper">
	<!-- Shared container with proper centering for mobile -->
	<div class="flex flex-col items-center justify-center w-full mobile-centered-container">
		<!-- Recording button/progress bar section - sticky positioned for stability -->
		<div
			class="relative sticky top-0 z-20 flex justify-center w-full pt-2 pb-4 bg-transparent button-section"
		>
			<div class="button-container mx-auto flex w-full max-w-[500px] justify-center">
				{#if transcribing}
					<!-- Progress bar (transforms the button) - adjusted height for mobile -->
					<div
						bind:this={progressContainerElement}
						class="progress-container relative h-[72px] w-full max-w-[500px] overflow-hidden rounded-full bg-amber-200 shadow-md shadow-black/10 sm:h-[66px]"
						role="progressbar"
						aria-label="Transcription progress"
						aria-valuenow={transcriptionProgress}
						aria-valuemin="0"
						aria-valuemax="100"
					>
						<div
							class="flex items-center justify-center h-full transition-all duration-300 progress-bar bg-gradient-to-r from-amber-400 to-rose-300"
							style="width: {transcriptionProgress}%;"
						></div>
					</div>
				{:else}
					<!-- Recording button - improved for mobile and accessibility -->
					<button
						bind:this={recordButtonElement}
						class="record-button duration-400 w-[90%] rounded-full transition-all ease-out sm:w-full {clipboardSuccess
							? 'border border-purple-200 bg-purple-50 text-black'
							: 'bg-amber-400 text-black'} mx-auto max-w-[500px] px-6 py-6 text-center text-xl font-bold shadow-md hover:scale-105 hover:bg-amber-300 focus:outline focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 active:scale-95 active:bg-amber-500 active:shadow-inner sm:px-10 sm:py-5 {!recording &&
						buttonLabel === 'Start Recording' &&
						!clipboardSuccess
							? 'pulse-subtle'
							: ''} {clipboardSuccess ? 'notification-pulse' : ''}"
						style="min-width: 300px; min-height: 72px; transform-origin: center center;"
						on:click={toggleRecording}
						on:mouseenter={preloadSpeechModel}
						on:keydown={handleKeyDown}
						disabled={transcribing}
						aria-label={recording ? 'Stop Recording' : 'Start Recording'}
						aria-pressed={recording}
						aria-busy={transcribing}
					>
						<span
							class="cta-text relative inline-block min-h-[28px] whitespace-nowrap transition-all duration-300 ease-out"
						>
							<span
								class="absolute inset-0 flex transform items-center justify-center transition-all duration-300 ease-out {clipboardSuccess
									? 'scale-100 opacity-100'
									: 'scale-95 opacity-0'}"
								style="visibility: {clipboardSuccess ? 'visible' : 'hidden'};"
							>
								<span class="flex items-center justify-center gap-1">
									<svg
										class="w-4 h-4 mr-1 text-purple-500"
										viewBox="0 0 24 24"
										xmlns="http://www.w3.org/2000/svg"
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
							<span
								class="transform transition-all duration-300 ease-out {clipboardSuccess
									? 'scale-90 opacity-0'
									: 'scale-100 opacity-100'}"
								style="visibility: {clipboardSuccess ? 'hidden' : 'visible'};"
							>
								{buttonLabel}
							</span>
						</span>
					</button>
					<!-- Timer display only shows when recording -->
					{#if recording}
						<div class="mt-3 recording-timer-container">
							<div
								class="recording-timer-display {recordingDuration >=
								ANIMATION.RECORDING.FREE_LIMIT - ANIMATION.RECORDING.WARNING_THRESHOLD
									? 'warning'
									: ''} {recordingDuration >=
								ANIMATION.RECORDING.FREE_LIMIT - ANIMATION.RECORDING.DANGER_THRESHOLD
									? 'danger'
									: ''}"
								role="timer"
								aria-label="Recording time"
							>
								{Math.floor(recordingDuration / 60)}:{(recordingDuration % 60)
									.toString()
									.padStart(2, '0')}
							</div>
						</div>
					{/if}
				{/if}
			</div>
		</div>

		<!-- Dynamic content area with smooth animation and proper containment -->
		<div
			class="relative flex flex-col items-center w-full mt-2 mb-20 transition-all duration-300 ease-in-out position-wrapper"
		>
			<!-- Content container with controlled overflow -->
			<div class="flex flex-col items-center w-full content-container">
				<!-- Audio visualizer - properly positioned -->
				{#if recording}
					<div
						class="absolute top-0 left-0 flex justify-center w-full visualizer-container"
						on:animationend={() => {
							// Scroll to the bottom when visualizer appears
							if (typeof window !== 'undefined') {
								window.scrollTo({
									top: document.body.scrollHeight,
									behavior: 'smooth'
								});
							}
						}}
					>
						<div class="flex justify-center w-full wrapper-container">
							<div
								class="visualizer-wrapper mx-auto w-[90%] max-w-[500px] animate-fadeIn rounded-[2rem] border-[1.5px] border-pink-100 bg-white/80 p-4 backdrop-blur-md sm:w-full"
								style="box-shadow: 0 10px 25px -5px rgba(249, 168, 212, 0.3), 0 8px 10px -6px rgba(249, 168, 212, 0.2), 0 0 15px rgba(249, 168, 212, 0.15);"
							>
								<AudioVisualizer />
							</div>
						</div>
					</div>
				{/if}

				<!-- Transcript output - only visible when not recording and has transcript -->
				{#if transcript && !recording}
					<div
						class="w-full transcript-wrapper animate-fadeIn-from-top"
						on:animationend={() => {
							// Scroll to the bottom when transcript appears
							if (typeof window !== 'undefined') {
								window.scrollTo({
									top: document.body.scrollHeight,
									behavior: 'smooth'
								});
							}
						}}
					>
						<!-- Speech bubble with transcript -->
						<div class="flex justify-center w-full wrapper-container">
							<div
								class="transcript-box-wrapper relative mx-auto w-[90%] max-w-[500px] px-2 sm:w-full sm:px-3 md:px-0"
							>
								<!-- Ghost icon copy button positioned outside the transcript box -->
								<button
									class="copy-btn absolute -right-4 -top-4 z-[200] h-10 w-10 rounded-full bg-gradient-to-r from-pink-100 to-purple-50 p-1.5 shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 active:scale-95"
									on:click|preventDefault={copyToClipboard}
									on:mouseenter={() => {
										// Only show tooltip if user hasn't used the button yet
										// or hasn't hovered too many times
										if (
											typeof window !== 'undefined' &&
											window.innerWidth >= 640 &&
											!hasUsedCopyButton &&
											tooltipHoverCount < MAX_TOOLTIP_HOVER_COUNT
										) {
											showCopyTooltip = true;
											tooltipHoverCount++;
										}
									}}
									on:mouseleave={() => {
										showCopyTooltip = false;
									}}
									aria-label="Copy transcript to clipboard"
									bind:this={copyButtonRef}
								>
									<div class="relative w-full h-full">
										<!-- Ghost icon layers - same as main app icon but smaller -->
										<div class="absolute inset-0 w-full h-full icon-layers">
											<!-- Gradient background (bottom layer) -->
											<img
												src="/talktype-icon-bg-gradient.svg"
												alt=""
												class="absolute inset-0 w-full h-full"
												aria-hidden="true"
											/>
											<!-- Outline without eyes -->
											<img
												src="/assets/talktype-icon-base.svg"
												alt=""
												class="absolute inset-0 w-full h-full"
												aria-hidden="true"
											/>
											<!-- Just the eyes (for blinking) -->
											<img
												src="/assets/talktype-icon-eyes.svg"
												alt=""
												class="absolute inset-0 w-full h-full copy-eyes"
												aria-hidden="true"
											/>
										</div>
									</div>

									<!-- Smart tooltip - only shows for first few hovers - positioned at top right to avoid clipping -->
									{#if showCopyTooltip}
										<div
											class="copy-tooltip absolute right-0 top-12 z-[250] whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-medium text-purple-800 shadow-md"
										>
											Copy to clipboard
											<div
												class="tooltip-arrow absolute -top-1.5 right-4 h-3 w-3 rotate-45 bg-white"
											></div>
										</div>
									{/if}
								</button>

								<!-- Editable transcript box with controlled scrolling -->
								<div
									class="transcript-box animate-shadow-appear scrollbar-thin relative mx-auto my-4 box-border max-h-[60vh] w-full max-w-[90vw] overflow-y-auto whitespace-pre-line rounded-[2rem] border-[1.5px] border-pink-100 bg-white/95 px-4 py-4 font-mono leading-relaxed text-gray-800 shadow-xl transition-all duration-300 sm:px-6 sm:py-5"
								>
									<div
										class={`transcript-text ${responsiveFontSize} animate-text-appear`}
										contenteditable="true"
										role="textbox"
										aria-label="Transcript editor"
										aria-multiline="true"
										tabindex="0"
										aria-describedby="transcript-instructions"
										bind:this={editableTranscript}
										on:focus={() => {
											screenReaderStatus =
												'You can edit this transcript. Use keyboard to make changes.';
										}}
									>
										{transcript}
									</div>
									<!-- Subtle gradient mask to indicate scrollable content -->
									<div
										class="scroll-indicator-bottom pointer-events-none absolute bottom-0 left-0 right-0 h-6 rounded-b-[2rem] bg-gradient-to-t from-white/90 to-transparent"
									></div>

									<!-- Add padding at the bottom of transcript for the share button -->
									<div class="pb-16"></div>

									<!-- Simple share button at bottom middle - only visible when Web Share API is supported -->
									{#if isWebShareSupported()}
										<div
											class="absolute bottom-6 left-0 right-0 z-[200] flex w-full justify-center"
										>
											<button
												class="px-5 py-2 text-sm font-medium text-indigo-600 transition-all duration-200 rounded-full shadow-sm share-btn-text bg-gradient-to-r from-indigo-50 to-purple-100 hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 active:scale-95"
												on:click|preventDefault={shareTranscript}
												aria-label="Share transcript"
											>
												Share
											</button>
										</div>
									{/if}

									<!-- Hidden instructions for screen readers -->
									<div id="transcript-instructions" class="sr-only">
										Editable transcript. You can modify the text if needed.
									</div>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Error message -->
			{#if errorMessage}
				<p class="mt-4 font-medium text-center text-red-500 error-message">
					{errorMessage}
				</p>
			{/if}
		</div>
	</div>
</div>

<!-- Screen reader only status announcements -->
<div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
	{#if screenReaderStatus}
		{screenReaderStatus}
	{/if}
</div>

<!-- We've moved the toast into the button for a more space-efficient design -->

<!-- Permission error modal -->
{#if showPermissionError}
	<div
		class="flex justify-center w-full permission-error-container"
		on:click={() => (showPermissionError = false)}
		role="alertdialog"
		aria-labelledby="permission_error_title"
		aria-describedby="permission_error_description"
		aria-live="assertive"
	>
		<div class="permission-error-modal">
			<!-- Icon and title -->
			<div class="modal-header">
				<div class="error-icon">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="w-6 h-6"
					>
						<circle cx="12" cy="12" r="10"></circle>
						<line x1="12" y1="8" x2="12" y2="12"></line>
						<line x1="12" y1="16" x2="12.01" y2="16"></line>
					</svg>
				</div>
				<h3 id="permission_error_title">Microphone Access Denied</h3>
			</div>

			<!-- Permission error message -->
			<p id="permission_error_description">
				TalkType needs microphone access to transcribe your speech. Please update your browser
				settings to allow microphone access.
			</p>

			<!-- Solution steps -->
			<div class="error-steps">
				<div class="step">
					<div class="step-number">1</div>
					<p>Click the microphone or lock icon in your address bar</p>
				</div>
				<div class="step">
					<div class="step-number">2</div>
					<p>Select "Allow" for microphone access</p>
				</div>
				<div class="step">
					<div class="step-number">3</div>
					<p>Refresh the page and try again</p>
				</div>
			</div>

			<!-- Dismiss button -->
			<button class="dismiss-btn" on:click|stopPropagation={() => (showPermissionError = false)}>
				Got it
			</button>
		</div>
	</div>
{/if}

<style>
	@import '$lib/styles/audioToText.css';
</style>
