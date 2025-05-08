<!--
  This is the main component for audio recording and transcription.
  It handles recording, transcription, clipboard operations, and UI feedback.
-->
<script>
	import { geminiService } from '$lib/services/geminiService';
	import { promptStyle, theme } from '$lib';
	import { onMount, onDestroy } from 'svelte';
	import AudioVisualizer from './AudioVisualizer.svelte';
	import RecordButtonWithTimer from './RecordButtonWithTimer.svelte';
	import TranscriptDisplay from './TranscriptDisplay.svelte';
	import PermissionError from './PermissionError.svelte';
	import { ANIMATION, CTA_PHRASES, ATTRIBUTION, getRandomFromArray } from '$lib/constants';
	import { Confetti } from '$lib/components/ui';
	
	// State for confetti animation
	let showConfetti = false;
	let confettiTarget = '.ghost-icon-wrapper'; // Target the ghost icon so confetti explodes from behind it
	let confettiColors = ANIMATION.CONFETTI.COLORS; // Default colors
	
	// Function to get theme-specific confetti colors
	function getThemeConfettiColors() {
		// Get current theme from the store
		let currentTheme;
		const unsubscribe = theme.subscribe(value => {
			currentTheme = value;
		});
		unsubscribe();
		
		// Use theme-specific colors if available
		if (currentTheme && ANIMATION.CONFETTI.THEME_COLORS[currentTheme]) {
			return ANIMATION.CONFETTI.THEME_COLORS[currentTheme];
		}
		
		// Fallback to default colors
		return ANIMATION.CONFETTI.COLORS;
	}
	
	import {
		initializeServices,
		audioService,
		transcriptionService,
		pwaService,
		// Stores
		isRecording,
		isTranscribing,
		transcriptionProgress,
		transcriptionText, // Kept for display and general debug, but not for completion trigger
		recordingDuration,
		errorMessage,
		uiState,
		audioState,
		hasPermissionError,
		transcriptionCompletedEvent, // <-- Import the new event store
		// Actions
		audioActions,
		transcriptionActions,
		uiActions
	} from '$lib/services';
	import { get } from 'svelte/store';

	// Helper variable to check if we're in a browser environment
	const browser = typeof window !== 'undefined';

	// Service instances
	let services;
	let unsubscribers = [];

	// DOM element references
	let progressContainerElement;

	// Local component state
	let showCopyTooltip = false;
	let screenReaderStatus = ''; // For ARIA announcements
	let isPremiumUser = false; // Change this to true to enable premium features

	// These will be set from the parent component
	export let isModelPreloaded = false;
	export let onPreloadRequest = null;

	// Ghost component reference
	export let ghostComponent = null;

	// Prompt style subscription
	let currentPromptStyle;
	const unsubscribePromptStyle = promptStyle.subscribe((value) => {
		currentPromptStyle = value;
	});

	// Export recording state and functions for external components
	export const recording = isRecording; // Export the isRecording store
	export { stopRecording, startRecording };

	// PWA Installation State Tracking - now using pwaService

	// Export PWA installation state functions through the service
	const shouldShowPWAPrompt = () => pwaService.shouldShowPwaPrompt();
	const recordPWAPromptShown = () => pwaService.recordPromptShown();
	const markPWAAsInstalled = () => pwaService.markAsInstalled();
	const isRunningAsPWA = () => pwaService.checkIfRunningAsPwa();

	export { shouldShowPWAPrompt, recordPWAPromptShown, markPWAAsInstalled, isRunningAsPWA };

	/**
	 * Increment transcription count and dispatch an event.
	 * Delegates to PWA service for actual storage.
	 */
	function incrementTranscriptionCount() {
		if (!browser) return;

		try {
			const newCount = pwaService.incrementTranscriptionCount();

			// Dispatch event to parent
			dispatchEvent(new CustomEvent('transcriptionCompleted', { detail: { count: newCount } }));
		} catch (error) {
			console.error('Error incrementing transcription count:', error);
		}
	}
	// End of PWA tracking

	// Function to preload the speech model before recording starts
	function preloadSpeechModel() {
		if (onPreloadRequest) {
			onPreloadRequest();
		}
	}

	async function startRecording() {
		// Don't start if we're already recording
		if ($isRecording) return;

		// Try to preload the speech model if not already done
		preloadSpeechModel();

		// Reset UI state
		uiActions.clearErrorMessage();

		// We don't need to set up recording timer manually anymore
		// The store takes care of it

		// Scroll to bottom when recording starts
		setTimeout(() => {
			if (typeof window !== 'undefined') {
				window.scrollTo({
					top: document.body.scrollHeight,
					behavior: 'smooth'
				});
			}
		}, ANIMATION.RECORDING.SCROLL_DELAY);

		try {
			// Subtle pulse ghost icon when starting recording
			if (ghostComponent && typeof ghostComponent.pulse === 'function') {
				ghostComponent.pulse();
			}

			// Start recording using the AudioService
			await audioService.startRecording();

			// State is tracked through stores now
		} catch (err) {
			console.error('❌ Error in startRecording:', err);
			uiActions.setErrorMessage(`Recording error: ${err.message || 'Unknown error'}`);
		}
	}

	async function stopRecording() {
		try {
			// Get current recording state
			if (!$isRecording) {
				return;
			}

			// Add wobble animation to ghost when recording stops
			if (ghostComponent && typeof ghostComponent.forceWobble === 'function') {
				ghostComponent.forceWobble();
				// Make the ghost look like it's thinking hard
				if (typeof ghostComponent.startThinking === 'function') {
					ghostComponent.startThinking();
				}
			}

			// Stop recording and get the audio blob
			const audioBlob = await audioService.stopRecording();

			// Log AudioBlob size
			console.log('[DEBUG] AudioBlob size:', audioBlob ? audioBlob.size : 'null');

			// Confetti celebration moved to transcription completion event as a random Easter egg

			// Start transcription process if we have audio data
			if (audioBlob && audioBlob.size > 0) {
				await transcriptionService.transcribeAudio(audioBlob);

				// Schedule scroll to bottom when transcript is complete
				setTimeout(() => {
					if (typeof window !== 'undefined') {
						window.scrollTo({
							top: document.body.scrollHeight,
							behavior: 'smooth'
						});
					}
				}, ANIMATION.RECORDING.POST_RECORDING_SCROLL_DELAY);

				// Increment the transcription count for PWA prompt
				if (browser && 'requestIdleCallback' in window) {
					window.requestIdleCallback(() => incrementTranscriptionCount());
				} else {
					setTimeout(incrementTranscriptionCount, 0);
				}
			} else {
				// If no audio data, revert UI state
				console.log('[DEBUG] AudioBlob was null or size was 0. No transcription attempted.');
				transcriptionActions.updateProgress(0);
				uiActions.setErrorMessage('No audio recorded. Please try again.');
			}
		} catch (err) {
			console.error('❌ Error in stopRecording:', err);
			uiActions.setErrorMessage(`Error processing recording: ${err.message || 'Unknown error'}`);
		}
	}

	function toggleRecording() {
		try {
			// Prioritize the store state for more consistent behavior
			const currentlyRecording = get(isRecording);

			if (currentlyRecording) {
				// Haptic feedback for stop - single pulse
				if (services && services.hapticService) {
					services.hapticService.stopRecording();
				}

				stopRecording();
				// Screen reader announcement
				uiActions.setScreenReaderMessage('Recording stopped.');
			} else {
				// Haptic feedback for start - double pulse
				if (services && services.hapticService) {
					services.hapticService.startRecording();
				}

				// When using "New Recording" button, rotate to next phrase immediately
				if ($transcriptionText) {
					console.log('🧹 Clearing transcript for new recording');

					// Pick a random CTA phrase that's not the current one
					let newIndex;
					do {
						newIndex = Math.floor(Math.random() * (CTA_PHRASES.length - 1)) + 1; // Skip first one (Start Recording)
					} while (newIndex === currentCtaIndex);

					currentCtaIndex = newIndex;
					currentCta = CTA_PHRASES[currentCtaIndex];
					console.log(`🔥 Rotating to: "${currentCta}"`);

					// Then clear transcript
					transcriptionActions.completeTranscription('');
				}

				startRecording();
				// Screen reader announcement
				uiActions.setScreenReaderMessage('Recording started. Speak now.');
			}
		} catch (err) {
			console.error('Recording operation failed:', err);

			// Show error message using existing toast system
			uiActions.setErrorMessage(`Recording error: ${err.message || 'Unknown error'}`);

			// Haptic feedback for error - with null check
			if (services && services.hapticService) {
				services.hapticService.error();
			}

			// Update screen reader status
			uiActions.setScreenReaderMessage('Recording failed. Please try again.');
		}
	}

	// Function to calculate responsive font size based on transcript length, word count, and device
	function getResponsiveFontSize(text) {
		if (!text) return 'text-base'; // Default size

		// Get viewport width for more responsive sizing
		let viewportWidth = 0;
		if (typeof window !== 'undefined') {
			viewportWidth = window.innerWidth;
		}

		// Smaller base sizes for mobile
		const isMobile = viewportWidth > 0 && viewportWidth < 640;
		const isDesktop = viewportWidth >= 1024;

		// Calculate both character length and word count
		const charLength = text.length;
		const wordCount = text.trim().split(/\s+/).length;
		
		// Typography best practices suggest that readability is impacted by both 
		// total length and average word length
		const avgWordLength = charLength / (wordCount || 1); // Avoid division by zero
		
		console.log(`Dynamic sizing: ${wordCount} words, ${charLength} chars, ${avgWordLength.toFixed(1)} avg length`);
		
		// Extremely short text (5 words or less): Use larger font, especially on desktop
		if (wordCount <= 5) {
			const size = isMobile 
				? 'text-xl sm:text-2xl md:text-3xl' 
				: isDesktop 
					? 'text-2xl md:text-3xl lg:text-4xl' 
					: 'text-2xl md:text-3xl';
			console.log(`Using size for ≤5 words: ${size}`);
			return size;
		}
		
		// Very short text: 6-10 words or under 50 chars
		if (wordCount < 10 || charLength < 50) {
			const size = isMobile ? 'text-lg sm:text-xl md:text-2xl' : 'text-xl md:text-2xl';
			console.log(`Using size for 6-10 words: ${size}`);
			return size;
		}
		
		// Short text: 11-25 words or under 150 chars with normal word length
		if ((wordCount < 25 || charLength < 150) && avgWordLength < 8) {
			const size = isMobile ? 'text-base sm:text-lg md:text-xl' : 'text-lg md:text-xl';
			console.log(`Using size for 11-25 words: ${size}`);
			return size;
		}
		
		// Medium text: 26-50 words or under 300 chars
		if (wordCount < 50 || charLength < 300) {
			const size = isMobile ? 'text-sm sm:text-base md:text-lg' : 'text-base md:text-lg';
			console.log(`Using size for 26-50 words: ${size}`);
			return size;
		}
		
		// Medium-long text: 51-100 words or under 500 chars
		if (wordCount < 100 || charLength < 500) {
			const size = isMobile ? 'text-xs sm:text-sm md:text-base' : 'text-sm md:text-base';
			console.log(`Using size for 51-100 words: ${size}`);
			return size;
		}
		
		// Long text: Over 100 words or 500+ chars
		// Use smaller text for better readability on longer content
		const size = isMobile ? 'text-xs sm:text-sm' : 'text-sm md:text-base';
		console.log(`Using size for >100 words: ${size}`);
		return size;
	}

	// Reactive font size based on transcript length
	$: responsiveFontSize = getResponsiveFontSize($transcriptionText);

	// CTA rotation
	let currentCtaIndex = 0;
	let currentCta = CTA_PHRASES[currentCtaIndex];

	// Button label computation - fixed to show CTA phrases
	$: buttonLabel = $isRecording ? 'Stop Recording' : $transcriptionText ? currentCta : currentCta;

	// Handler for transcript component events
	function handleTranscriptEvent(event) {
		const { type, detail } = event;

		if (type === 'copy') {
			// Use the transcript text from the detail property instead of calling a method on event.target
			const transcriptText = detail?.text || $transcriptionText;
			transcriptionService.copyToClipboard(transcriptText);
		} else if (type === 'share') {
			const transcriptText = detail?.text || $transcriptionText;
			transcriptionService.shareTranscript(transcriptText);
		} else if (type === 'focus') {
			uiActions.setScreenReaderMessage(detail.message);
		}
	}

	// State changes for transcript completion
	function handleTranscriptCompletion(textToProcess) { // <-- Accept text as a parameter
		console.log('[DEBUG] handleTranscriptCompletion() called with textToProcess:', textToProcess);

		// Only attempt to use ghost component if it exists
		if (ghostComponent && typeof ghostComponent.reactToTranscript === 'function') {
			// React to transcript with ghost expression based on length
			ghostComponent.reactToTranscript(textToProcess?.length || 0); // Use parameter

			// Stop thinking animation
			if (typeof ghostComponent.stopThinking === 'function') {
				ghostComponent.stopThinking();
			}
		}

		// Automatically copy to clipboard when transcription finishes
		if (textToProcess) { // <-- Use the passed-in parameter
			// Show confetti celebration as a random Easter egg (1/7 chance)
			if (Math.floor(Math.random() * 7) === 0) {
				// Update confetti colors based on current theme
				confettiColors = getThemeConfettiColors();
				console.log('[DEBUG] Using theme-specific confetti colors:', confettiColors);
				showConfetti = true;
				// Reset after animation completes
				setTimeout(() => {
					showConfetti = false;
				}, ANIMATION.CONFETTI.ANIMATION_DURATION + 500);
			}
			
			// Copy to clipboard with small delay to ensure UI updates
			setTimeout(() => {
				transcriptionService.copyToClipboard(textToProcess); // <-- Use parameter
				console.log("Auto-copying transcript to clipboard");
			}, 100); // Faster copying
		} else {
			console.log('[DEBUG] Inside handleTranscriptCompletion: textToProcess is FALSY.');
		}
	}

	// Lifecycle hooks
	onMount(() => {
		// Initialize services
		services = initializeServices({ debug: false });

		// Ghost element is now handled through the component reference

		// Existing subscription to transcriptionText for general debugging (no longer calls handleTranscriptCompletion)
		const transcriptUnsub = transcriptionText.subscribe((text) => {
			console.log('[DEBUG] (Raw transcriptionText update) Text:', text, 'IsTranscribing:', $isTranscribing);
			// NOTE: The call to handleTranscriptCompletion() has been removed from here.
		});

		// New subscription to the dedicated transcriptionCompletedEvent
		const transcriptionCompletedUnsub = transcriptionCompletedEvent.subscribe(completedText => {
			if (completedText) {
				// This event fires only when transcription is truly complete and text is available.
				// $isTranscribing should be false by now.
				console.log('[DEBUG] transcriptionCompletedEvent fired in component with text:', completedText);
				handleTranscriptCompletion(completedText); // <-- Pass completedText to the handler
			}
		});

		// Subscribe to permission denied state to show error modal
		const permissionUnsub = hasPermissionError.subscribe((denied) => {
			if (denied) {
				// Show permission error modal
				uiActions.setPermissionError(true);

				// Add sad eyes animation through the Ghost component
				if (ghostComponent) {
					// We could add a sadEyes() method to the Ghost component
					// but we'll keep it simple for now
				}
			}
		});

		// Subscribe to time limit reached event
		const audioStateUnsub = audioState.subscribe((state) => {
			if (state.timeLimit === true) {
				console.log('🔴 Time limit reached, stopping recording automatically');
				// Auto-stop recording when time limit is reached
				if (get(isRecording)) {
					// Small timeout to let the UI update first
					setTimeout(() => {
						stopRecording();
					}, 100);
				}
			}
		});

		// Add to unsubscribe list
		unsubscribers.push(transcriptUnsub, transcriptionCompletedUnsub, permissionUnsub, audioStateUnsub);

		// Check if the app is running as a PWA after a short delay
		if (browser) {
			setTimeout(async () => {
				const isPwa = await pwaService.checkIfRunningAsPwa();
				if (isPwa) {
					console.log('📱 App is running as PWA');
				}
			}, 100);
		}
	});

	// Clean up subscriptions and services
	onDestroy(() => {
		// Unsubscribe from all subscriptions
		unsubscribers.forEach((unsub) => unsub());

		// Ensure audio resources are released
		audioService.cleanup();

		// Unsubscribe from prompt style
		if (unsubscribePromptStyle) unsubscribePromptStyle();
	});

	// Recording state is now handled by the Ghost component via props

	// Use reactive declarations for progress updates instead of DOM manipulation
	$: progressValue = $transcriptionProgress;
</script>

<!-- Main wrapper with proper containment to prevent layout issues -->
<div class="main-wrapper mx-auto box-border w-full">
	<!-- Shared container with proper centering for mobile -->
	<div class="mobile-centered-container flex w-full flex-col items-center justify-center">
		<!-- Recording button/progress bar section - sticky positioned for stability -->
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
					on:click={toggleRecording}
					on:preload={preloadSpeechModel}
				/>
			</div>
		</div>

		<!-- Dynamic content area with smooth animation and proper containment -->
		<div
			class="position-wrapper relative mb-10 mt-2 flex w-full flex-col items-center transition-all duration-300 ease-in-out"
		>
			<!-- Content container with controlled overflow -->
			<div class="content-container flex w-full flex-col items-center">
				<!-- Audio visualizer - properly positioned -->
				{#if $isRecording}
					<div
						class="visualizer-container absolute left-0 top-0 flex w-full justify-center"
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

				<!-- Transcript output - only visible when not recording and has transcript -->
				{#if $transcriptionText && !$isRecording}
					<TranscriptDisplay
						transcript={$transcriptionText}
						{showCopyTooltip}
						{responsiveFontSize}
						on:copy={handleTranscriptEvent}
						on:share={handleTranscriptEvent}
						on:focus={handleTranscriptEvent}
					/>
				{/if}
			</div>

			<!-- Error message -->
			{#if $errorMessage}
				<p class="error-message mt-4 text-center font-medium text-red-500">
					{$errorMessage}
				</p>
			{/if}
		</div>
	</div>
</div>

<!-- Confetti component - display centered to the transcript box when triggered -->
{#if showConfetti}
  <Confetti 
    targetSelector={confettiTarget} 
    colors={confettiColors}
    on:complete={() => showConfetti = false} 
  />
{/if}

<!-- Screen reader only status announcements -->
<div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
	{#if $uiState.screenReaderMessage}
		{$uiState.screenReaderMessage}
	{/if}
</div>

<!-- Permission error modal -->
{#if $uiState.showPermissionError}
	<PermissionError on:close={() => uiActions.setPermissionError(false)} />
{/if}

<style>
	/* Main wrapper to ensure proper positioning */
.main-wrapper {
	position: relative;
	z-index: 1;
	width: 100%;
	box-sizing: border-box;
}

/* Position wrapper to create a stable layout without shifts */
.position-wrapper {
	min-height: 120px; /* Ensure there's enough space for content */
	max-height: calc(100vh - 260px); /* Increased height capacity */
	display: flex;
	flex-direction: column;
	align-items: center;
	position: relative; /* Ensure proper positioning context */
	overflow: hidden; /* Prevent any overflow from causing page scroll */
	transition: all 0.3s ease-in-out; /* Smooth transition when content changes */
	contain: paint layout; /* Stronger containment for better performance */
	padding-bottom: 24px; /* Additional space at bottom for transcript */
}

/* Content container for transcripts and visualizers */
.content-container {
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	position: relative; /* For absolute positioned children */
}

/* Wrapper container for consistent max-width across components */
.wrapper-container {
	width: 100%;
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

/* Screen reader only class */
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border-width: 0;
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

/* Make the button section sticky to prevent jumping */
.button-section {
	position: sticky;
	top: 0;
	z-index: 20;
	padding-bottom: 1rem; /* Increased from 0.75rem */
	background: transparent;
}

/* Media queries for mobile responsiveness */
@media (max-width: 768px) {
	.button-container {
		width: 90%;
		max-width: 90vw; /* Prevent overflow */
		margin: 0 auto; /* Center horizontally */
	}

	/* Adjust spacing for mobile */
	.position-wrapper {
		margin-top: 0.75rem;
		margin-bottom: 2.5rem; /* More space (40px) for footer on mobile */
		padding: 0 8px 32px; /* Add side padding and bottom padding */
		max-height: calc(100vh - 200px); /* Control height on mobile */
		overflow: hidden; /* Prevent page scroll from content */
	}

	/* Make the visualizer more compact on mobile */
	.visualizer-container {
		top: -5px;
		display: flex;
		justify-content: center;
		width: 100%;
	}

	/* Ensure minimum width even on very small screens */
	.wrapper-container {
		min-width: 280px;
		display: flex;
		justify-content: center;
	}
}

/* Even smaller screens */
@media (max-width: 380px) {
	/* Ensure proper spacing on tiny screens */
	.position-wrapper {
		margin-top: 0.5rem;
		margin-bottom: 2rem;
		padding: 0 4px 24px;
		max-height: calc(100vh - 190px); /* More compact on very small screens */
		overflow: hidden;
	}
}
</style>