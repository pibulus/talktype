<!--
  This is the main component for audio recording and transcription.
  It handles recording, transcription, clipboard operations, and UI feedback.
-->
<script>
	import { geminiService } from '$lib/services/geminiService';
	import { onMount, createEventDispatcher } from 'svelte'; // Import createEventDispatcher
	import AudioVisualizer from './AudioVisualizer.svelte';

	// Helper variable to check if we're in a browser environment
	const browser = typeof window !== 'undefined';

	// Initialize the event dispatcher
	const dispatch = createEventDispatcher();

	let recording = false;
	let mediaRecorder;
	let audioChunks = [];
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

	// DOM element references (Removed animation-related ones)
	let copyButtonRef; // Reference to the copy button

	// These will be set from the parent component (Removed animation-related ones)
	export let isModelPreloaded = false;
	export let onPreloadRequest = null;

	// Accessibility state management
	let screenReaderStatus = ''; // For ARIA announcements

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
	const simpleAttributionTag = "\n\n𝘛𝘳𝘢𝘯𝘴𝘤𝘳𝘪𝘣𝘦𝘥 𝘣𝘺 𝘛𝘢𝘭𝘬𝘛𝘺𝘱𝘦 👻";

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
		return browser &&
			   typeof navigator !== 'undefined' &&
			   navigator.share &&
			   typeof navigator.share === 'function';
	}

	// IMPORTANT: All ghost animation functions have been completely removed.

	// Export recording state and functions for external components
	export {
		recording,
		stopRecording,
		startRecording,
		// PWA installation state functions
		shouldShowPWAPrompt,
		recordPWAPromptShown,
		markPWAAsInstalled,
		isRunningAsPWA
	};

	// Function to preload the speech model before recording starts
	function preloadSpeechModel() {
		if (onPreloadRequest) {
			// Use the parent component's shared preload function
			onPreloadRequest();
		}
	}

	// --- Transcription Count & PWA Installation State Tracking ---
	const TRANSCRIPTION_COUNT_KEY = 'talktype-transcription-count';
	const PWA_PROMPT_SHOWN_KEY = 'talktype-pwa-prompt-shown';
	const PWA_PROMPT_COUNT_KEY = 'talktype-pwa-prompt-count';
	const PWA_LAST_PROMPT_DATE_KEY = 'talktype-pwa-last-prompt-date';
	const PWA_INSTALLED_KEY = 'talktype-pwa-installed';

	/**
	 * Retrieves the current transcription count from localStorage.
	 * Returns 0 if not found or not in a browser environment.
	 * @returns {number} The current transcription count.
	 */
	function getTranscriptionCount() {
		if (!browser) {
			return 0; // Not in browser, cannot access localStorage
		}
		try {
			const countStr = localStorage.getItem(TRANSCRIPTION_COUNT_KEY);
			const count = parseInt(countStr || '0', 10);
			return isNaN(count) ? 0 : count;
		} catch (error) {
			console.error('Error reading transcription count from localStorage:', error);
			return 0; // Return 0 on error
		}
	}

	/**
	 * Increments the transcription count in localStorage and dispatches an event.
	 * Only runs in a browser environment.
	 */
	function incrementTranscriptionCount() {
		if (!browser) {
			return; // Not in browser, cannot access localStorage
		}
		try {
			const currentCount = getTranscriptionCount();
			const newCount = currentCount + 1;
			localStorage.setItem(TRANSCRIPTION_COUNT_KEY, newCount.toString());
			console.log(`📈 Transcription count incremented to: ${newCount}`);

			// Dispatch event to notify parent component about the completed transcription
			dispatch('transcriptionCompleted', { count: newCount });

		} catch (error) {
			console.error('Error incrementing transcription count in localStorage:', error);
		}
	}

	/**
	 * Checks if the PWA installation prompt should be shown.
	 * Bases decision on transcription count, time since last prompt, and installation status.
	 * @returns {boolean} Whether the PWA installation prompt should be shown.
	 */
	function shouldShowPWAPrompt() {
		if (!browser) {
			return false; // Not in browser, cannot check installation state
		}

		try {
			// Check if the app is already installed as a PWA
			const isInstalled = localStorage.getItem(PWA_INSTALLED_KEY) === 'true';
			if (isInstalled) {
				return false; // Don't show prompt if already installed
			}

			// Get the transcription count
			const transcriptionCount = getTranscriptionCount();

			// Check if we've shown the prompt before
			const hasShownPrompt = localStorage.getItem(PWA_PROMPT_SHOWN_KEY) === 'true';

			// Get how many times we've shown the prompt
			const promptCount = parseInt(localStorage.getItem(PWA_PROMPT_COUNT_KEY) || '0', 10);

			// Get the date when we last showed the prompt
			const lastPromptDate = localStorage.getItem(PWA_LAST_PROMPT_DATE_KEY);

			// If we've never shown the prompt before, show it after 3 transcriptions
			if (!hasShownPrompt && transcriptionCount >= 3) {
				return true;
			}

			// If we've shown the prompt 1-2 times before, check if enough time has passed
			// and enough new transcriptions have happened
			if (hasShownPrompt && promptCount < 3) {
				const daysSinceLastPrompt = lastPromptDate
					? Math.floor((Date.now() - new Date(lastPromptDate).getTime()) / (1000 * 60 * 60 * 24))
					: 0;

				// Show again after at least 3 days and 5 more transcriptions
				if (daysSinceLastPrompt >= 3 && transcriptionCount >= 5) {
					return true;
				}
			}

			// If we've shown the prompt 3 or more times, be more conservative
			if (promptCount >= 3) {
				const daysSinceLastPrompt = lastPromptDate
					? Math.floor((Date.now() - new Date(lastPromptDate).getTime()) / (1000 * 60 * 60 * 24))
					: 0;

				// Show again after at least 14 days (2 weeks) and 10 more transcriptions
				if (daysSinceLastPrompt >= 14 && transcriptionCount >= 10) {
					return true;
				}
			}

			return false;
		} catch (error) {
			console.error('Error checking if PWA prompt should be shown:', error);
			return false; // Default to not showing on error
		}
	}

	/**
	 * Records that the PWA installation prompt was shown.
	 * Updates the prompt count, shown status, and last prompt date.
	 */
	function recordPWAPromptShown() {
		if (!browser) {
			return;
		}

		try {
			// Mark that we've shown the prompt
			localStorage.setItem(PWA_PROMPT_SHOWN_KEY, 'true');

			// Get and increment the prompt count
			const promptCount = parseInt(localStorage.getItem(PWA_PROMPT_COUNT_KEY) || '0', 10);
			localStorage.setItem(PWA_PROMPT_COUNT_KEY, (promptCount + 1).toString());

			// Record the current date
			localStorage.setItem(PWA_LAST_PROMPT_DATE_KEY, new Date().toISOString());

			console.log(`📱 PWA installation prompt shown (count: ${promptCount + 1})`);
		} catch (error) {
			console.error('Error recording PWA prompt shown:', error);
		}
	}

	/**
	 * Marks the PWA as installed in localStorage.
	 * This prevents further installation prompts.
	 */
	function markPWAAsInstalled() {
		if (!browser) {
			return;
		}

		try {
			localStorage.setItem(PWA_INSTALLED_KEY, 'true');
			console.log('📱 PWA marked as installed');
		} catch (error) {
			console.error('Error marking PWA as installed:', error);
		}
	}

	/**
	 * Checks if the app is running as an installed PWA.
	 * @returns {boolean} Whether the app is running as an installed PWA.
	 */
	function isRunningAsPWA() {
		if (!browser) {
			return false;
		}

		try {
			// Different ways to detect if running as PWA
			const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
			const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
			const isMinimalUi = window.matchMedia('(display-mode: minimal-ui)').matches;
			const isInPWA = navigator.standalone || // iOS
				isStandalone || isFullscreen || isMinimalUi;

			// If we detect it's a PWA, also mark it in localStorage
			if (isInPWA) {
				markPWAAsInstalled();
			}

			return isInPWA;
		} catch (error) {
			console.error('Error checking if running as PWA:', error);
			return false;
		}
	}
	// --- End Transcription Count & PWA Installation State Tracking ---


	async function startRecording() {
		// Don't start a new recording if already recording
		if (recording) return;

		// Try to preload the speech model if not already done
		preloadSpeechModel();

		errorMessage = '';
		// Don't clear transcript here - we do it in toggleRecording for better control of CTA rotation
		recording = true;
		dispatch('recordingstart'); // Dispatch recording start event
		audioChunks = [];
		clipboardSuccess = false;
		transcriptionProgress = 0;

		try {
			console.log('🎤 Start recording');
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mediaRecorder = new MediaRecorder(stream);

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunks.push(event.data);
				}
			};

			mediaRecorder.onstop = async () => {
				dispatch('recordingstop'); // Dispatch recording stop event (from onstop)
				transcribing = true;
				dispatch('processingstart'); // Dispatch processing start event
				const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

				// Reset progress
				transcriptionProgress = 0;
				
				// Use a simpler animation approach with fewer frames
				// Show immediate feedback
				setTimeout(() => { transcriptionProgress = 10; }, 10);
				
				// Then use setTimeouts for fewer updates (better performance than requestAnimationFrame loop)
				setTimeout(() => { transcriptionProgress = 30; }, 500);
				setTimeout(() => { transcriptionProgress = 60; }, 1500);
				setTimeout(() => { transcriptionProgress = 90; }, 2500);

				let transcriptionError = null; // To store potential error for dispatching
				try {
					console.log('🤖 Transcription started');
					transcript = await geminiService.transcribeAudio(audioBlob);

					// Complete the progress bar smoothly
					// Cancel any existing animation timeouts
					clearTimeout(animationFrameId);

					// Simplified completion animation - go directly to 95% then 100%
					transcriptionProgress = 95;
					
					// Use a single timeout to complete the animation and handle effects
					setTimeout(() => {
						// Reach 100%
						transcriptionProgress = 100;
						
						// Brief delay before cleanup
						setTimeout(() => {
							transcribing = false;
							transcriptionProgress = 0;
						}, 600);
					}, 300);

					// Brief delay before showing the transcript - simplified
					await new Promise(resolve => setTimeout(resolve, 500));

					// Increment the count early to avoid delaying the user experience
					if (transcript) {
						// Use requestIdleCallback if available, or fallback to setTimeout
						if (browser && 'requestIdleCallback' in window) {
							window.requestIdleCallback(() => incrementTranscriptionCount());
						} else {
							setTimeout(incrementTranscriptionCount, 0);
						}

						try {
							// Focus check - document must be focused for clipboard operations
							const isDocumentFocused = typeof document !== 'undefined' && document.hasFocus();

							if (isDocumentFocused) {
								await navigator.clipboard.writeText(transcript);
								console.log('📋 Transcript copied to clipboard');

								// Show toast notification right away
								clipboardSuccess = true;
								if (clipboardTimer) clearTimeout(clipboardTimer);
								clipboardTimer = setTimeout(() => {
									clipboardSuccess = false;
								}, 2500); // Longer visibility for smoother transition
							} else {
								// Document not focused - try to bring focus back
								console.log('📋 Document not focused - attempting to regain focus');

								// Try to focus the window (only in browser environment)
								if (browser) window.focus();

								// Wait a short time for focus to take effect
								setTimeout(async () => {
									if (typeof document !== 'undefined' && document.hasFocus()) {
										// We have focus now, try again
										try {
											await navigator.clipboard.writeText(transcript);
											console.log('📋 Transcript copied to clipboard after focus recovery');
											clipboardSuccess = true;

											if (clipboardTimer) clearTimeout(clipboardTimer);
											clipboardTimer = setTimeout(() => {
												clipboardSuccess = false;
											}, 2500);
										} catch (focusError) {
											console.error('❌ Still failed after focus attempt:', focusError);
											// Silent fail - but user can use copy button
										}
									} else {
										// Still no focus, silent fail - user can use copy button
										console.log(
											'📋 Document still not focused - silent fail, user can use copy button'
										);
									}
								}, 100);
							}
						} catch (err) {
							console.error('❌ Failed to copy transcript to clipboard: ', err);
							// Silent fail - don't show error to user
						}
					}
				} catch (error) {
					console.error('❌ Transcription error:', error);
					errorMessage = error.message;
					transcriptionError = error; // Store error
					transcript = '';
					cancelAnimationFrame(animationFrameId);
					transcribing = false;
				} finally {
					recording = false;
					// Dispatch processing end event with transcript and error status
					dispatch('processingend', {
						transcript: transcript,
						error: transcriptionError
					});
				}
			};

			mediaRecorder.start();
			console.log('✅ Recording started');
		} catch (err) {
			console.error('❌ Error accessing microphone:', err);

			// Check for specific permission errors
			let isPermissionDenied = false;
			if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
				isPermissionDenied = true;
			} else if (err.message && (err.message.includes('permission') || err.message.includes('denied'))) {
				isPermissionDenied = true;
			}

			if (isPermissionDenied) {
				// Show the permission error modal
				showPermissionError = true;

				// Auto-hide the modal after a while
				if (permissionErrorTimer) clearTimeout(permissionErrorTimer);
				permissionErrorTimer = setTimeout(() => {
					showPermissionError = false;
				}, 8000); // Show for 8 seconds

				// Clear generic error message since we're showing a modal
				errorMessage = '';
			} else {
				// Generic error handling
				errorMessage = 'Error accessing microphone. Please check your device settings.';
			}

			recording = false;
			// Dispatch recording stop event if start failed
			dispatch('recordingstop', { error: err });
		}
	}

	function stopRecording() {
		if (mediaRecorder && mediaRecorder.state === 'recording') {
			mediaRecorder.stop();
			// Note: 'recordingstop' is also dispatched in mediaRecorder.onstop for consistency
			// Dispatching here ensures it fires even if onstop doesn't for some reason.
			dispatch('recordingstop');
			console.log('🛑 Stop recording');
		}
	}

	function toggleRecording(event) {
		try {
			if (recording) {
				stopRecording();
				// Screen reader announcement
				screenReaderStatus = 'Recording stopped.';
			} else {
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

	// Cleanup
	onMount(() => {
		// Cache DOM references
		if (browser) {
			// Initialize viewport check for responsive font sizing
			isMobileDevice = window.innerWidth < 640;
			
			// Add resize listener (once, with throttling)
			let resizeTimeout;
			window.addEventListener('resize', () => {
				if (resizeTimeout) clearTimeout(resizeTimeout);
				resizeTimeout = setTimeout(() => {
					isMobileDevice = window.innerWidth < 640;
					// Clear the cache when viewport size changes
					fontSizeCache.clear();
				}, 200);
			});

			// Check if the app is running as a PWA
			setTimeout(() => {
				// Check if running as PWA and mark if true
				const isPWA = isRunningAsPWA();
				if (isPWA) {
					console.log('📱 App is running as PWA');
				}
			}, 100);
		}

		return () => {
			// Clean up all timeouts and listeners
			if (animationFrameId) cancelAnimationFrame(animationFrameId);
			if (clipboardTimer) clearTimeout(clipboardTimer);
			if (permissionErrorTimer) clearTimeout(permissionErrorTimer);
		};
	});

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

			// Add simple attribution tag to the copied text
			textToCopy += simpleAttributionTag;

			// Skip clipboard operations in non-browser environments
			if (!browser) {
				console.log('📋 Not in browser environment, skipping clipboard operations');
				return;
			}

			// Update tooltip usage tracking - hide tooltip after button is used
			hasUsedCopyButton = true;
			showCopyTooltip = false;

			console.log('📋 Attempting to copy text with attribution');
			// Simple tracking event
			console.log('🔄 TRACKING: user_action=copy_transcript');

			// Try using the modern clipboard API
			try {
				await navigator.clipboard.writeText(textToCopy);
				console.log('📋 Successfully copied using Clipboard API');
				clipboardSuccess = true;

				// Show toast message regardless of tooltip visibility
				// This ensures mobile users who don't get tooltips still get feedback

				// Update screen reader status
				screenReaderStatus = 'Transcript copied to clipboard';

				// Auto-hide the clipboard success message after 2.5 seconds for snappier response
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

				return;
			} catch (clipboardError) {
				console.error('❌ Clipboard API failed:', clipboardError);
				// Fall back to document.execCommand method below
			}

			// Fallback to execCommand for browsers that don't support clipboard API
			// or when the API fails (e.g., due to permissions)
			const textarea = document.createElement('textarea');
			textarea.value = textToCopy;
			textarea.style.position = 'fixed';  // Prevent scrolling to bottom of page
			document.body.appendChild(textarea);
			textarea.focus();
			textarea.select();

			const successful = document.execCommand('copy');
			document.body.removeChild(textarea);

			if (successful) {
				console.log('📋 Transcript copied via execCommand fallback');
				clipboardSuccess = true;

				// Update screen reader status
				screenReaderStatus = 'Transcript copied to clipboard';

				// Auto-hide the clipboard success message after 2.5 seconds for snappier response
				if (clipboardTimer) clearTimeout(clipboardTimer);
				clipboardTimer = setTimeout(() => {
					clipboardSuccess = false;
				}, 2500);

				// Attempt to return focus to copy button
				if (copyButtonRef) {
					setTimeout(() => {
						copyButtonRef.focus();
					}, 100);
				}
			} else {
				throw new Error('execCommand copy failed');
			}
		} catch (err) {
			console.error('❌ All clipboard methods failed:', err);

			// Show user-friendly error message
			clipboardSuccess = true; // Use the success toast but with error message
			screenReaderStatus = 'Unable to copy. Please try clicking in the window first.';

			if (clipboardTimer) clearTimeout(clipboardTimer);
			clipboardTimer = setTimeout(() => {
				clipboardSuccess = false;
			}, 2500);
		}
	}

	// Function to calculate responsive font size based on transcript length and device
	// Optimized for performance with memoization and cached viewport check (set in onMount)
	const fontSizeCache = new Map();
	let isMobileDevice = false; // This will be set in onMount

	function getResponsiveFontSize(text) {
		if (!text) return 'text-base'; // Default size

		// Length-based caching for better performance
		const length = text.length;
		const cacheKey = `${length}-${isMobileDevice ? 'mobile' : 'desktop'}`;

		if (fontSizeCache.has(cacheKey)) {
			return fontSizeCache.get(cacheKey);
		}

		// Calculate the font size class
		let result;
		if (length < 50) {
			result = isMobileDevice ? 'text-lg sm:text-xl md:text-2xl' : 'text-xl md:text-2xl'; // Very short text
		} else if (length < 150) {
			result = isMobileDevice ? 'text-base sm:text-lg md:text-xl' : 'text-lg md:text-xl'; // Short text
		} else if (length < 300) {
			result = isMobileDevice ? 'text-sm sm:text-base md:text-lg' : 'text-base md:text-lg'; // Medium text
		} else if (length < 500) {
			result = isMobileDevice ? 'text-xs sm:text-sm md:text-base' : 'text-sm md:text-base'; // Medium-long text
		} else {
			result = isMobileDevice ? 'text-xs sm:text-sm' : 'text-sm md:text-base'; // Long text
		}

		// Store in cache and return
		fontSizeCache.set(cacheKey, result);
		return result;
	}

	// Reactive font size based on transcript length
	$: responsiveFontSize = getResponsiveFontSize(transcript);

	// Array of fun CTA phrases for the button
	const ctaPhrases = [
		"Start Recording", // Always first
		"Click & Speak",
		"Talk Now",
		"Transcribe Me Baby",
		"Start Yer Yappin'",
		"Say the Thing",
		"Feed Words Now",
		"Just Say It",
		"Speak Up Friend",
		"Talk to Me",
		"Ready When You Are"
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

			// Skip share operations in non-browser environments
			if (!browser) {
				console.log('📤 Not in browser environment, skipping share operations');
				return;
			}

			// Add viral attribution tag with preview to shared text
			const textWithAttribution = textToShare + getViralAttribution(textToShare);

			// Simple tracking event
			console.log('🔄 TRACKING: user_action=share_transcript');

			// Check if Web Share API is supported
			if (isWebShareSupported()) {
				try {
					await navigator.share({
						text: getViralAttribution(textToShare).trim()
					});

					console.log('📤 Successfully shared transcript');

					// Show success toast (reuse the clipboard success toast)
					clipboardSuccess = true;
					screenReaderStatus = 'Transcript shared successfully';

					// Auto-hide the success message after 3 seconds
					if (clipboardTimer) clearTimeout(clipboardTimer);
					clipboardTimer = setTimeout(() => {
						clipboardSuccess = false;
					}, 2500);
				} catch (err) {
					console.error('❌ Share API error:', err);
					// User might have cancelled - don't show error
				}
			} else {
				// Fallback to clipboard if Web Share API is not supported
				console.log('📤 Web Share API not supported, falling back to clipboard');
				await navigator.clipboard.writeText(getViralAttribution(textToShare).trim());

				// Show success toast
				clipboardSuccess = true;
				screenReaderStatus = 'Transcript copied to clipboard (sharing not supported)';

				// Auto-hide the message after 3 seconds
				if (clipboardTimer) clearTimeout(clipboardTimer);
				clipboardTimer = setTimeout(() => {
					clipboardSuccess = false;
				}, 2500);
			}
		} catch (err) {
			console.error('❌ Error sharing transcript:', err);
			// Show error in toast
			errorMessage = 'Error sharing transcript. Please try copying instead.';
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
<div class="main-wrapper mx-auto w-full box-border">
	<!-- Shared container with proper centering for mobile -->
	<div class="mobile-centered-container flex flex-col items-center justify-center w-full">
		<!-- Recording button/progress bar section - sticky positioned for stability -->
		<div class="button-section relative flex w-full justify-center sticky top-0 z-20 pt-2 pb-4 bg-transparent">
			<div class="button-container w-full max-w-[500px] mx-auto flex justify-center">
				{#if transcribing}
					<!-- Progress bar (transforms the button) - adjusted height for mobile -->
					<div
						class="progress-container relative h-[72px] w-full overflow-hidden rounded-full bg-amber-200 shadow-md shadow-black/10 sm:h-[66px] max-w-[500px]"
						role="progressbar"
						aria-label="Transcription progress"
						aria-valuenow={transcriptionProgress}
						aria-valuemin="0"
						aria-valuemax="100"
					>
						<div
							class="progress-bar flex h-full items-center justify-center bg-gradient-to-r from-amber-400 to-rose-300 transition-all duration-300"
							style="width: {transcriptionProgress}%;"
						></div>
					</div>
				{:else}
					<!-- Recording button - improved for mobile and accessibility -->
					<button
						class="record-button w-[90%] sm:w-full rounded-full transition-all duration-400 ease-out {clipboardSuccess ? 'bg-purple-50 border-purple-200 border text-black' : 'bg-amber-400 text-black'} px-6 py-6 text-xl font-bold shadow-md hover:scale-105 hover:bg-amber-300 focus:outline focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 active:scale-95 active:bg-amber-500 active:shadow-inner sm:px-10 sm:py-5 max-w-[500px] mx-auto text-center"
						style="min-width: 300px; min-height: 72px; transform-origin: center center;"
						on:click={toggleRecording}
						on:mouseenter={preloadSpeechModel}
						on:keydown={handleKeyDown}
						disabled={transcribing}
						aria-label={recording ? 'Stop Recording' : 'Start Recording'}
						aria-pressed={recording}
						aria-busy={transcribing}
					>
						<span class="cta-text inline-block min-h-[28px] whitespace-nowrap transition-all duration-300 ease-out relative">
							<span class="transition-all duration-300 ease-out absolute inset-0 flex items-center justify-center transform {clipboardSuccess ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}" style="visibility: {clipboardSuccess ? 'visible' : 'hidden'};">
								<span class="flex items-center gap-1 justify-center">
									<svg class="h-4 w-4 mr-1 text-purple-500" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
							<span class="transition-all duration-300 ease-out transform {clipboardSuccess ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}" style="visibility: {clipboardSuccess ? 'hidden' : 'visible'};">
								{buttonLabel}
							</span>
						</span>
					</button>
				{/if}
			</div>
		</div>

		<!-- Dynamic content area with smooth animation and proper containment -->
		<div class="position-wrapper relative mb-20 mt-2 w-full flex flex-col items-center transition-all duration-300 ease-in-out">
			<!-- Content container with controlled overflow -->
			<div class="content-container w-full flex flex-col items-center">
				<!-- Audio visualizer - properly positioned -->
				{#if recording}
					<div class="visualizer-container absolute left-0 top-0 flex w-full justify-center">
						<div class="wrapper-container flex w-full justify-center">
							<div
								class="visualizer-wrapper mx-auto w-[90%] sm:w-full max-w-[500px] rounded-[2rem] border-[1.5px] border-pink-100 bg-white/80 p-4 backdrop-blur-md"
								style="box-shadow: 0 10px 25px -5px rgba(249, 168, 212, 0.3), 0 8px 10px -6px rgba(249, 168, 212, 0.2), 0 0 15px rgba(249, 168, 212, 0.15);"
							>
								<AudioVisualizer />
							</div>
						</div>
					</div>
				{/if}

				<!-- Transcript output - only visible when not recording and has transcript -->
				{#if transcript && !recording}
					<div class="transcript-wrapper w-full">
						<!-- Speech bubble with transcript -->
						<div class="wrapper-container flex w-full justify-center">
							<div class="transcript-box-wrapper relative mx-auto w-[90%] sm:w-full max-w-[500px] px-2 sm:px-3 md:px-0">
								<!-- Ghost icon copy button positioned outside the transcript box -->
								<button
									class="copy-btn absolute -top-4 -right-4 z-[200] h-10 w-10 rounded-full bg-gradient-to-r from-pink-100 to-purple-50 p-1.5 shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2"
									on:click|preventDefault={copyToClipboard}
									on:mouseenter={() => {
										// Only show tooltip if user hasn't used the button yet
										// or hasn't hovered too many times
										if (typeof window !== "undefined" && window.innerWidth >= 640 && !hasUsedCopyButton && tooltipHoverCount < MAX_TOOLTIP_HOVER_COUNT) {
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
									<div class="relative h-full w-full">
										<!-- Ghost icon layers - same as main app icon but smaller -->
										<div class="icon-layers absolute inset-0 h-full w-full">
											<!-- Gradient background (bottom layer) -->
											<img src="/talktype-icon-bg-gradient.svg" alt="" class="absolute inset-0 h-full w-full" aria-hidden="true" />
											<!-- Outline without eyes -->
											<img src="/assets/talktype-icon-base.svg" alt="" class="absolute inset-0 h-full w-full" aria-hidden="true" />
											<!-- Just the eyes (for blinking) -->
											<img src="/assets/talktype-icon-eyes.svg" alt="" class="absolute inset-0 h-full w-full copy-eyes" aria-hidden="true" />
										</div>
									</div>

									<!-- Smart tooltip - only shows for first few hovers - positioned at top right to avoid clipping -->
									{#if showCopyTooltip}
										<div class="copy-tooltip absolute top-12 right-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-medium text-purple-800 shadow-md z-[250]">
											Copy to clipboard
											<div class="tooltip-arrow absolute -top-1.5 right-4 h-3 w-3 rotate-45 bg-white"></div>
										</div>
									{/if}
								</button>


								<!-- Editable transcript box with controlled scrolling -->
								<div
									class="transcript-box relative w-full whitespace-pre-line rounded-[2rem] border-[1.5px] border-pink-100 bg-white/95 px-4 py-4 font-mono leading-relaxed text-gray-800 shadow-xl sm:px-6 sm:py-5 max-w-[90vw] box-border mx-auto my-4 transition-all duration-300 max-h-[60vh] overflow-y-auto scrollbar-thin"
								>
									<div
										class={`transcript-text ${responsiveFontSize}`}
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
									<div class="scroll-indicator-bottom absolute bottom-0 left-0 right-0 h-6 pointer-events-none bg-gradient-to-t from-white/90 to-transparent rounded-b-[2rem]"></div>

									<!-- Add padding at the bottom of transcript for the share button -->
									<div class="pb-16"></div>

									<!-- Simple share button at bottom middle - only visible when Web Share API is supported -->
									{#if isWebShareSupported()}
										<div class="flex justify-center w-full absolute bottom-6 left-0 right-0 z-[200]">
											<button
												class="share-btn-text px-5 py-2 bg-gradient-to-r from-indigo-50 to-purple-100 text-indigo-600 text-sm font-medium rounded-full shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2"
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
				<p class="error-message mt-4 text-center font-medium text-red-500">
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
	<div class="permission-error-container flex w-full justify-center" on:click={() => showPermissionError = false} role="alertdialog" aria-labelledby="permission_error_title" aria-describedby="permission_error_description" aria-live="assertive">
		<div class="permission-error-modal">
			<!-- Icon and title -->
			<div class="modal-header">
				<div class="error-icon">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6">
						<circle cx="12" cy="12" r="10"></circle>
						<line x1="12" y1="8" x2="12" y2="12"></line>
						<line x1="12" y1="16" x2="12.01" y2="16"></line>
					</svg>
				</div>
				<h3 id="permission_error_title">Microphone Access Denied</h3>
			</div>

			<!-- Permission error message -->
			<p id="permission_error_description">TalkType needs microphone access to transcribe your speech. Please update your browser settings to allow microphone access.</p>

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
			<button class="dismiss-btn" on:click|stopPropagation={() => showPermissionError = false}>
				Got it
			</button>
		</div>
	</div>
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
		min-height: 150px; /* Ensure there's enough space for content */
		max-height: calc(100vh - 240px); /* Control max height to prevent overflow */
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative; /* Ensure proper positioning context */
		overflow-y: visible; /* Allow overflow without jumping */
		transition: all 0.3s ease-in-out; /* Smooth transition when content changes */
		contain: layout; /* Improve layout containment */
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

	/* Progress bar styling (non-animated) */
	.progress-bar {
		/* Basic styling, animation removed */
	}

	/* Transcript box styling */
	.transcript-box {
		box-shadow:
			0 10px 25px -5px rgba(249, 168, 212, 0.3),
			0 8px 10px -6px rgba(249, 168, 212, 0.2),
			0 0 15px rgba(249, 168, 212, 0.15);
		background-image: linear-gradient(
			to bottom right,
			rgba(255, 255, 255, 0.95),
			rgba(255, 251, 252, 0.98)
		);
		position: relative;
		min-height: 120px; /* Minimum height for better appearance */
		min-width: 280px; /* Minimum width to prevent too-narrow boxes on mobile */
		height: auto;
		max-height: 60vh; /* Control height to prevent pushing footer */
		overflow-y: auto; /* Enable scrolling within the box */
		/* Custom scrollbar styling */
		scrollbar-width: thin;
		scrollbar-color: rgba(249, 168, 212, 0.3) transparent;
		transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); /* Smooth elastic transition */
		/* Performance optimization */
		will-change: transform, opacity;
		backface-visibility: hidden;
		-webkit-font-smoothing: subpixel-antialiased;
		/* Proper positioning */
		z-index: 10;
	}

	/* Hide scrollbar for cleaner appearance but maintain functionality */
	.scrollbar-thin::-webkit-scrollbar {
		width: 4px;
	}

	.scrollbar-thin::-webkit-scrollbar-track {
		background: transparent;
	}

	.scrollbar-thin::-webkit-scrollbar-thumb {
		background-color: rgba(249, 168, 212, 0.3);
		border-radius: 20px;
	}

	/* Subtle gradient mask at the bottom to indicate scrollable content */
	.scroll-indicator-bottom {
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.transcript-box:hover .scroll-indicator-bottom {
		opacity: 1;
	}

	/* Subtle hover effect for transcript box */
	.transcript-box:hover {
		box-shadow:
			0 12px 30px -5px rgba(249, 168, 212, 0.35),
			0 8px 12px -6px rgba(249, 168, 212, 0.25),
			0 0 20px rgba(249, 168, 212, 0.2);
		background-image: linear-gradient(
			to bottom right,
			rgba(255, 255, 255, 0.98),
			rgba(255, 248, 252, 1)
		);
		border-color: rgba(249, 168, 212, 0.25);
	}

	/* Make transcript editable with a cursor */
	.transcript-text {
		cursor: text;
		outline: none;
		transition: all 0.2s ease;
		word-break: break-word; /* Prevent text overflow on all screens */
	}

	.transcript-text:hover {
		color: #333;
	}

	.transcript-text:focus {
		color: #000;
		outline: 2px solid rgba(217, 119, 6, 0.5);
		border-radius: 0.25rem;
	}

	/* Copy button styling - ghost icon version, anchored to textbox */
	.copy-btn {
		opacity: 0.95;
		transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		filter: drop-shadow(0 4px 6px rgba(249, 168, 212, 0.25));
		animation: gentle-float 3s ease-in-out infinite;
		/* Ring effect to anchor the button visually to the text box */
		box-shadow: 0 0 0 3px white, 0 0 0 4px rgba(249, 168, 212, 0.25), 0 4px 6px rgba(0, 0, 0, 0.05);
		/* Isolation to prevent inheriting filter effects from parents */
		isolation: isolate;
		/* Add backdrop filter to prevent button from being affected by blur */
		backdrop-filter: none !important;
		/* Add background color to ensure opacity */
		background-color: rgba(255, 255, 255, 0.95);
	}
	
	@keyframes gentle-float {
		0%, 100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-3px);
		}
	}

	.copy-btn:hover {
		opacity: 1;
		filter: drop-shadow(0 6px 12px rgba(249, 168, 212, 0.4));
		transform: translateY(-1px) scale(1.05);
		box-shadow: 0 0 0 3px white, 0 0 0 4px rgba(249, 168, 212, 0.4), 0 8px 16px rgba(249, 168, 212, 0.15);
		background-color: rgba(255, 255, 255, 0.9);
	}

	.copy-btn:active {
		transform: translateY(1px) scale(0.95);
		box-shadow: 0 0 0 3px white, 0 0 0 4px rgba(249, 168, 212, 0.5), 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	/* Share button styling */
	.share-btn {
		opacity: 0.95;
		transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		filter: drop-shadow(0 4px 6px rgba(168, 173, 249, 0.25));
		box-shadow: 0 0 0 3px white, 0 0 0 4px rgba(168, 173, 249, 0.25), 0 4px 6px rgba(0, 0, 0, 0.05);
		isolation: isolate;
		backdrop-filter: none !important;
		background-color: rgba(255, 255, 255, 0.95);
	}

	.share-btn:hover {
		opacity: 1;
		filter: drop-shadow(0 6px 12px rgba(168, 173, 249, 0.4));
		transform: translateY(-1px) scale(1.05);
		box-shadow: 0 0 0 3px white, 0 0 0 4px rgba(168, 173, 249, 0.4), 0 8px 16px rgba(168, 173, 249, 0.15);
		background-color: rgba(255, 255, 255, 0.9);
	}

	.share-btn:active {
		transform: translateY(1px) scale(0.95);
		box-shadow: 0 0 0 3px white, 0 0 0 4px rgba(168, 173, 249, 0.5), 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	/* Tooltip styling */
	.copy-tooltip {
		border: 1px solid rgba(249, 168, 212, 0.3);
		box-shadow: 0 4px 8px -2px rgba(249, 168, 212, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.05);
		z-index: 250; /* Higher z-index to ensure it's above visualizer */
		pointer-events: none;
		animation: tooltip-appear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	
	@keyframes tooltip-appear {
		0% {
			opacity: 0;
			transform: translateY(5px) scale(0.95);
		}
		100% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	
	/* Special animation for the copy button ghost eyes */
	.copy-eyes {
		animation: copy-ghost-blink 8s infinite;
	}

	.copy-btn:hover .copy-eyes {
		animation: copy-ghost-blink-excited 2s infinite;
	}
	
	/* Ghost eyes blinking animations for copy button */
	@keyframes copy-ghost-blink {
		0%, 95%, 100% {
			transform: scaleY(1);
		}
		96%, 99% {
			transform: scaleY(0);
		}
	}

	@keyframes copy-ghost-blink-excited {
		0%, 40%, 50%, 90%, 100% {
			transform: scaleY(1);
		}
		45%, 95% {
			transform: scaleY(0);
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

	/* Speech bubble point */
	.transcript-box::after {
		content: '';
		position: absolute;
		top: 20px;
		left: 0;
		margin-left: -12px;
		width: 20px;
		height: 20px;
		background-color: white;
		border-left: 1.5px solid rgba(249, 168, 212, 0.4);
		border-bottom: 1.5px solid rgba(249, 168, 212, 0.4);
		border-top-left-radius: 4px;
		transform: rotate(45deg);
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

	/* Toast container positioned at the top of the screen */
	.toast-container {
		position: fixed;
		top: 1.5rem; /* Position at top with space */
		left: 0;
		right: 0;
		z-index: 999;
		pointer-events: none;
	}

	@media (min-width: 768px) {
		.toast-container {
			top: 2rem; /* More space on desktop */
		}
	}

	/* Toast notification - basic styling, animations removed */
	.clipboard-toast {
		position: relative;
		background: linear-gradient(to right, #fff8fa, #faf5ff);
		background-color: #fffdfc;
		color: #7e3b9c; /* text-purple-700 */
		font-weight: 500; /* font-medium */
		font-size: 0.875rem; /* text-sm */
		padding: 0.75rem 1.5rem;
		border-radius: 2.5rem;
		box-shadow:
			0 12px 20px -5px rgba(212, 180, 241, 0.35),
			0 5px 12px -3px rgba(254, 205, 211, 0.25),
			0 0 0 1px rgba(255, 232, 242, 0.7) inset,
			0 0 25px rgba(249, 168, 212, 0.3);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem; /* gap-2 */
		width: 320px; /* Match button min-width */
		min-width: 300px; /* Match min-width of button */
		max-width: 90%; /* Same percentage as record button */
		letter-spacing: -0.01em; /* tracking-tight */
		border: 1.5px solid rgba(249, 168, 212, 0.5);
		text-align: center;
		will-change: transform, opacity, box-shadow;
		margin: 0 auto; /* Center horizontally */
		/* Basic visibility transition */
		transition: opacity 0.3s ease;
	}

	@media (min-width: 768px) {
		.clipboard-toast {
			font-size: 1rem; /* md:text-base */
		}
	}

	/* Special styling for focus warning message */
	:global(.clipboard-toast.focus-warning) {
		background: linear-gradient(to right, #fff8f0, #fff5f0);
		background-color: #fffcf8;
		color: #9c5e3b; /* amber-orange */
		border: 1.5px solid rgba(251, 191, 36, 0.4);
		box-shadow:
			0 12px 20px -5px rgba(251, 211, 141, 0.35),
			0 5px 12px -3px rgba(254, 215, 170, 0.25),
			0 0 0 1px rgba(255, 237, 213, 0.7) inset,
			0 0 25px rgba(251, 191, 36, 0.3);
	}

	/* Ghost icon in toast */
	.toast-ghost {
		display: flex;
		align-items: center;
		justify-content: center;
		color: #9061c2; /* Softer purple */
		filter: drop-shadow(0 1px 2px rgba(255, 156, 243, 0.2));
	}

	/* Permission Error Modal Styling */
	.permission-error-container {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		/* Basic fade-in */
		opacity: 1;
		transition: opacity 0.3s ease-out;
	}

	.permission-error-modal {
		background: linear-gradient(to bottom right, #fff, #fefcff);
		border-radius: 1rem;
		box-shadow:
			0 10px 25px -5px rgba(249, 168, 212, 0.4),
			0 8px 10px -6px rgba(249, 168, 212, 0.2),
			0 0 0 1px rgba(249, 168, 212, 0.3) inset;
		padding: 1.5rem;
		max-width: 90%;
		width: 400px;
		color: #4b5563;
		position: relative;
		text-align: center;
		/* Basic slide-up */
		transform: translateY(0);
		opacity: 1;
		transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.3s ease-out;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
		flex-direction: column;
	}

	.error-icon {
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		background-color: rgba(239, 68, 68, 0.1);
		color: #ef4444;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 0.5rem;
	}

	.modal-header h3 {
		color: #111827;
		font-weight: 700;
		font-size: 1.25rem;
		margin: 0;
	}

	.permission-error-modal p {
		margin: 0.75rem 0;
		line-height: 1.6;
		font-size: 0.95rem;
	}

	.error-steps {
		background-color: rgba(249, 168, 212, 0.08);
		border-radius: 0.75rem;
		padding: 1rem;
		margin: 1.25rem 0;
		text-align: left;
	}

	.step {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
		align-items: flex-start;
	}

	.step:last-child {
		margin-bottom: 0;
	}

	.step-number {
		width: 1.5rem;
		height: 1.5rem;
		background-color: rgba(249, 168, 212, 0.3);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.875rem;
		color: #be185d;
		flex-shrink: 0;
	}

	.step p {
		margin: 0;
		font-size: 0.875rem;
	}

	.dismiss-btn {
		background-color: #be185d;
		color: white;
		border: none;
		border-radius: 9999px;
		padding: 0.75rem 2rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		margin-top: 0.75rem;
		font-size: 1rem;
	}

	.dismiss-btn:hover {
		background-color: #9d174d;
		transform: translateY(-1px);
	}

	.dismiss-btn:active {
		transform: translateY(1px);
	}

	/* Visualizer wrapper styling to match transcript box */
	.visualizer-wrapper {
		background-image: linear-gradient(
			to bottom right,
			rgba(255, 255, 255, 0.9),
			rgba(255, 250, 253, 0.85)
		);
	}

	/* Make the button section sticky to prevent jumping */
	.button-section {
		position: sticky;
		top: 0;
		z-index: 20;
		padding-bottom: 0.75rem;
		background: transparent;
		/* Remove backdrop blur to prevent affecting other elements */
		/* backdrop-filter: blur(4px); */
	}

	/* Media queries for mobile responsiveness */
	@media (max-width: 768px) {
		.transcript-box {
			padding: 1.25rem 1.5rem; /* Increased padding for better readability */
			border-radius: 1.5rem;
			margin: 1rem auto; /* Space above and below, centered */
			width: 100%; /* Full width of container */
			max-width: 90vw; /* Cap width on mobile to prevent overflow */
			max-height: 60vh; /* Increased for more content visibility, but not overwhelming on small screens */
		}

		.clipboard-toast {
			font-size: 0.875rem;
			padding: 0.6rem 1rem;
			max-width: 360px;
			width: calc(100% - 2rem);
		}

		.toast-ghost svg {
			height: 18px;
			width: 18px;
		}

		.button-container,
		.visualizer-wrapper,
		.transcript-box-wrapper {
			width: 90%;
			max-width: 90vw; /* Prevent overflow */
			margin: 0 auto; /* Center horizontally */
		}

		/* Better sizing for copy button on mobile */
		.copy-btn {
			height: 38px; /* Larger touch target */
			width: 38px; /* Larger touch target */
			top: -12px; /* Better positioned for mobile */
			right: -8px; /* Better positioned for mobile */
		}

		/* Better sizing for share button on mobile */
		.share-btn {
			height: 38px; /* Larger touch target */
			width: 38px; /* Larger touch target */
			top: -12px; /* Better positioned for mobile */
			right: 36px; /* Position next to copy button */
		}

		/* Button width cleanup for mobile */
		.record-button {
			min-height: 66px; /* Ensure minimum height for touch */
			font-size: 1.2rem; /* Slightly smaller font on mobile */
			width: 90%; /* Width on mobile */
			max-width: 320px; /* Consistent with spec */
			margin: 0 auto; /* Center horizontally */
			text-align: center; /* Center text */
			align-self: center; /* Center the button itself */
			position: relative; /* Helps maintain position */
		}

		/* Adjust spacing for mobile */
		.position-wrapper {
			margin-top: 0.5rem;
			margin-bottom: 5rem; /* More space for footer */
			padding: 0 8px; /* Add side padding */
			max-height: calc(100vh - 180px); /* Control height on mobile */
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
		.clipboard-toast {
			font-size: 0.75rem;
			padding: 0.6rem 1rem;
			bottom: 1rem;
			max-width: 90%;
			width: calc(100% - 2rem);
		}

		.toast-ghost svg {
			height: 16px;
			width: 16px;
		}

		/* Make the recording button even more prominent but well-sized */
		.record-button {
			min-height: 66px;
			font-size: 1rem;
			width: 92%; /* Use more available space but keep some padding */
			padding: 0.75rem 1rem;
		}

		/* Ensure minimum text box sizing */
		.transcript-box {
			min-height: 100px;
			padding: 1rem 1.25rem;
			border-radius: 1.25rem;
			max-height: 55vh; /* Slightly reduced height for very small screens */
		}

		/* Adjust copy button position for very small screens */
		.copy-btn {
			top: -12px;
			right: -6px;
			height: 34px;
			width: 34px;
		}

		/* Adjust share button style for very small screens */
		.share-btn-text {
			font-size: 0.8rem;
			padding: 0.25rem 0.75rem;
			margin-bottom: 1rem;
		}

		/* Ensure transcript text is readable and responsive */
		.transcript-text {
			font-size: 0.95rem !important;
			line-height: 1.6;
			transition: font-size 0.3s ease;
		}

		/* Ensure minimum container width */
		.transcript-box-wrapper {
			min-width: 250px;
			width: 92%;
			margin: 0 auto;
		}

		/* Visualizer adjustments for tiny screens */
		.visualizer-wrapper {
			padding: 0.75rem;
			border-radius: 1.25rem;
		}

		/* Ensure proper spacing on tiny screens */
		.position-wrapper {
			margin-top: 0.5rem;
			margin-bottom: 1rem;
			padding: 0 4px;
			max-height: calc(100vh - 160px); /* More compact on very small screens */
		}
	}

	/* Removed all animation keyframes and related styles */

</style>
