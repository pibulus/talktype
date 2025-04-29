<!--
  This is the main component for audio recording and transcription.
  It handles recording, transcription, clipboard operations, and UI feedback.
-->
<script>
	import { geminiService } from '$lib/services/geminiService';
	import { promptStyle } from '$lib';
	import { onMount } from 'svelte';
	import AudioVisualizer from './AudioVisualizer.svelte';
	import { ANIMATION } from '$lib/constants';

	// Helper variable to check if we're in a browser environment
	const browser = typeof window !== 'undefined';

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
		// Don't start a new recording if already recording
		if (recording) return;

		// Try to preload the speech model if not already done
		preloadSpeechModel();

		errorMessage = '';
		// Don't clear transcript here - we do it in toggleRecording for better control of CTA rotation
		recording = true;
		audioChunks = [];
		clipboardSuccess = false;
		transcriptionProgress = 0;

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
			console.log('🎤 Start recording');
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mediaRecorder = new MediaRecorder(stream);

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunks.push(event.data);
				}
			};

			mediaRecorder.onstop = async () => {
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

				transcribing = true;
				const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

				// Reset progress
				transcriptionProgress = 0;

				// Create a smooth animation that completes in roughly the expected time
				// This is purely for UI feedback and doesn't reflect actual progress
				const animateDuration = 3000; // 3 seconds total animation
				const startTime = Date.now();

				const animate = () => {
					const elapsedTime = Date.now() - startTime;
					const progress = Math.min(95, (elapsedTime / animateDuration) * 100);

					// Use smooth easing
					transcriptionProgress = progress;

					if (progress < 95) {
						animationFrameId = requestAnimationFrame(animate);
					}
				};

				animate();

				try {
					console.log('🤖 Transcription started');
					// Make the ghost look like it's thinking hard
					ghostThinkingHard();
					transcript = await geminiService.transcribeAudio(audioBlob);

					// Schedule a scroll to bottom when transcript is complete
					setTimeout(() => {
						if (typeof window !== 'undefined') {
							window.scrollTo({
								top: document.body.scrollHeight,
								behavior: 'smooth'
							});
						}
					}, 650); // Match the delay before showing transcript

					// Complete the progress bar smoothly
					cancelAnimationFrame(animationFrameId);

					// Animate to 100% smoothly
					const completeProgress = () => {
						if (transcriptionProgress < 100) {
							transcriptionProgress += (100 - transcriptionProgress) * 0.2;

							if (transcriptionProgress > 99.5) {
								// We've reached the end
								transcriptionProgress = 100;

								// Add a slight delay for the completion glow effect
								setTimeout(handleCompletionEffects, 200);
							} else {
								// Continue the animation
								animationFrameId = requestAnimationFrame(completeProgress);
							}
						}
					};

					// Handle the completion effects (extracted for clarity)
					function handleCompletionEffects() {
						if (progressContainerElement) {
							progressContainerElement.classList.add('completion-pulse');

							// Add confetti celebration for successful transcription (randomly 1/7 times)
							if (transcript && transcript.length > 20 && Math.floor(Math.random() * 7) === 0) {
								showConfettiCelebration();
							}

							// Clean up after animation finishes
							setTimeout(() => {
								progressContainerElement.classList.remove('completion-pulse');
								transcribing = false;
								transcriptionProgress = 0;
							}, 600);
						}
					}

					completeProgress();

					// Brief delay before showing the transcript - just enough for a smooth transition
					await new Promise((resolve) => setTimeout(resolve, 650));

					// Automatically copy to clipboard when transcription finishes
					if (transcript) {
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
					transcript = '';
					cancelAnimationFrame(animationFrameId);
					transcribing = false;
				} finally {
					recording = false;
					// We don't need to set shouldUpdateCta here since we're
					// using immediate rotation in the toggleRecording function
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
			} else if (
				err.message &&
				(err.message.includes('permission') || err.message.includes('denied'))
			) {
				isPermissionDenied = true;
			}

			if (isPermissionDenied) {
				// Show the permission error modal
				showPermissionError = true;
				vibrate([20, 100, 20, 100, 20]); // Triple vibration pattern for error

				// Animate ghost to look sad/disappointed
				const eyes = eyesElement || parentEyesElement;
				if (eyes) {
					eyes.classList.add('eyes-sad');
					setTimeout(() => {
						eyes.classList.remove('eyes-sad');
					}, 2000);
				}

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
		}
	}

	function stopRecording() {
		if (mediaRecorder && mediaRecorder.state === 'recording') {
			mediaRecorder.stop();
			console.log('🛑 Stop recording');
		}

		// Clear recording timer
		if (recordingTimer) {
			clearInterval(recordingTimer);
			recordingTimer = null;
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
				recordButtonElement.classList.remove('button-press');
			}, 400);
		}
	}
	function toggleRecording(event) {
		// Animate button press
		animateButtonPress();

		try {
			if (recording) {
				// Haptic feedback for stop - single pulse
				vibrate(50);

				stopRecording();
				// Screen reader announcement
				screenReaderStatus = 'Recording stopped.';
			} else {
				// Haptic feedback for start - double pulse
				vibrate([40, 60, 40]);
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

				// Subtle pulse ghost icon when starting a new recording
				const icon = ghostIconElement || parentGhostIconElement;
				if (icon) {
					icon.classList.add('ghost-pulse');
					setTimeout(() => {
						icon.classList.remove('ghost-pulse');
					}, 500);
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
			vibrate([20, 150, 20]);

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
		// Set local references using parent elements if available
		eyesElement = parentEyesElement;
		ghostIconElement = parentGhostIconElement;

		return () => {
			if (animationFrameId) cancelAnimationFrame(animationFrameId);
			if (clipboardTimer) clearTimeout(clipboardTimer);
			if (permissionErrorTimer) clearTimeout(permissionErrorTimer);
			if (recordingTimer) clearInterval(recordingTimer);
			if (unsubscribePromptStyle) unsubscribePromptStyle();
		};
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

				// Haptic feedback for successful copy - single quick pulse
				vibrate(25);

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
			textarea.style.position = 'fixed'; // Prevent scrolling to bottom of page
			document.body.appendChild(textarea);
			textarea.focus();
			textarea.select();

			const successful = document.execCommand('copy');
			document.body.removeChild(textarea);

			if (successful) {
				console.log('📋 Transcript copied via execCommand fallback');
				clipboardSuccess = true;

				// Haptic feedback for successful copy - single quick pulse
				vibrate(25);

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

			// Error pattern haptic feedback - two short bursts for error
			vibrate([20, 150, 20]);

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

	// Helper for haptic feedback on mobile devices
	function vibrate(pattern) {
		// Only vibrate if:
		// 1. The navigator.vibrate API is available
		// 2. We're likely on a mobile device (using viewport width as rough heuristic)
		if (typeof window !== 'undefined' && 'vibrate' in navigator && window.innerWidth <= 768) {
			try {
				navigator.vibrate(pattern);
			} catch (e) {
				// Silent fail - vibration not critical for app function
				console.log(`Vibration failed: ${e.message}`);
			}
		}
	}

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

					// Haptic feedback for successful share
					vibrate([30, 50, 30]);

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

			// Error vibration pattern
			vibrate([20, 150, 20]);
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

	/* Common animation for fading elements in */
	.animate-fadeIn {
		animation: localFadeIn 0.8s ease-out forwards;
	}

	.animate-fadeIn-from-top {
		animation: fadeInFromTop 0.8s cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
		transform-origin: center top;
		will-change: transform, opacity;
		animation-fill-mode: forwards;
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

	@keyframes fadeInFromTop {
		0% {
			opacity: 0;
			transform: translateY(-15px) scale(0.98);
		}
		60% {
			transform: translateY(3px) scale(1.01);
		}
		80% {
			transform: translateY(-2px) scale(1);
		}
		100% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.animate-text-appear {
		animation: textAppear 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
		will-change: opacity, transform;
	}

	@keyframes textAppear {
		0% {
			opacity: 0;
			transform: translateY(5px);
		}
		70% {
			opacity: 0.9;
			transform: translateY(-2px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-shadow-appear {
		animation: shadowAppear 0.5s cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
		will-change: transform, opacity;
	}

	@keyframes shadowAppear {
		0% {
			opacity: 0.9;
			transform: scale(0.995);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* Progress bar animations */
	.progress-bar {
		animation: pulse-glow 1.5s infinite ease-in-out;
	}

	:global(.completion-pulse) {
		animation: completion-glow 0.6s ease-in-out;
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

	@keyframes completion-glow {
		0% {
			box-shadow: 0 0 0px rgba(255, 120, 170, 0.1);
		}
		50% {
			box-shadow: 0 0 30px rgba(255, 120, 170, 0.8);
		}
		100% {
			box-shadow: 0 0 0px rgba(255, 120, 170, 0.1);
		}
	}

	/* Override for icon-layers in AudioToText component */
	:global(.recording .icon-layers) {
		overflow: visible !important;
		position: relative;
		z-index: 2;
	}

	/* Make sure the outline is visible on top of the gradient */
	:global(.recording .icon-bg),
	:global(.recording .icon-base) {
		filter: brightness(1.05);
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
		box-shadow:
			0 0 0 3px white,
			0 0 0 4px rgba(249, 168, 212, 0.25),
			0 4px 6px rgba(0, 0, 0, 0.05);
		/* Isolation to prevent inheriting filter effects from parents */
		isolation: isolate;
		/* Add backdrop filter to prevent button from being affected by blur */
		backdrop-filter: none !important;
		/* Add background color to ensure opacity */
		background-color: rgba(255, 255, 255, 0.95);
	}

	.copy-btn:hover {
		opacity: 1;
		filter: drop-shadow(0 6px 12px rgba(249, 168, 212, 0.4));
		transform: translateY(-1px) scale(1.05);
		box-shadow:
			0 0 0 3px white,
			0 0 0 4px rgba(249, 168, 212, 0.4),
			0 8px 16px rgba(249, 168, 212, 0.15);
		background-color: rgba(255, 255, 255, 0.9);
	}

	.copy-btn:active {
		transform: translateY(1px) scale(0.95);
		box-shadow:
			0 0 0 3px white,
			0 0 0 4px rgba(249, 168, 212, 0.5),
			0 2px 4px rgba(0, 0, 0, 0.1);
	}

	/* Share button styling */
	.share-btn {
		opacity: 0.95;
		transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		filter: drop-shadow(0 4px 6px rgba(168, 173, 249, 0.25));
		animation: gentle-float 3s ease-in-out infinite;
		box-shadow:
			0 0 0 3px white,
			0 0 0 4px rgba(168, 173, 249, 0.25),
			0 4px 6px rgba(0, 0, 0, 0.05);
		isolation: isolate;
		backdrop-filter: none !important;
		background-color: rgba(255, 255, 255, 0.95);
		/* Slight delay in animation to be offset from copy button */
		animation-delay: 0.4s;
	}

	.share-btn:hover {
		opacity: 1;
		filter: drop-shadow(0 6px 12px rgba(168, 173, 249, 0.4));
		transform: translateY(-1px) scale(1.05);
		box-shadow:
			0 0 0 3px white,
			0 0 0 4px rgba(168, 173, 249, 0.4),
			0 8px 16px rgba(168, 173, 249, 0.15);
		background-color: rgba(255, 255, 255, 0.9);
	}

	.share-btn:active {
		transform: translateY(1px) scale(0.95);
		box-shadow:
			0 0 0 3px white,
			0 0 0 4px rgba(168, 173, 249, 0.5),
			0 2px 4px rgba(0, 0, 0, 0.1);
	}

	/* Tooltip styling */
	.copy-tooltip {
		animation: tooltip-appear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		border: 1px solid rgba(249, 168, 212, 0.3);
		box-shadow:
			0 4px 8px -2px rgba(249, 168, 212, 0.2),
			0 2px 4px -1px rgba(0, 0, 0, 0.05);
		z-index: 250; /* Higher z-index to ensure it's above visualizer */
		pointer-events: none;
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

	@keyframes gentle-float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-3px);
		}
	}

	/* Ghost eyes blinking animations for copy button */
	@keyframes copy-ghost-blink {
		0%,
		95%,
		100% {
			transform: scaleY(1);
		}
		96%,
		99% {
			transform: scaleY(0);
		}
	}

	@keyframes copy-ghost-blink-excited {
		0%,
		40%,
		50%,
		90%,
		100% {
			transform: scaleY(1);
		}
		45%,
		95% {
			transform: scaleY(0);
		}
	}

	/* Sad eyes animation for permission errors */
	.eyes-sad {
		animation: eyes-sad-animation 2s ease-in-out forwards !important;
		transform-origin: center center;
	}

	@keyframes eyes-sad-animation {
		0%,
		100% {
			transform: scaleY(0.7) translateY(2px);
		}
		30%,
		70% {
			transform: scaleY(0.5) translateY(3px);
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

	/* Toast notification - enhanced to be more noticeable */
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
		animation:
			toast-bounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
			toast-pulse 2s ease-in-out infinite,
			toast-fade 4s ease-in-out forwards;
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
	}

	/* Add toast pulse animation for better visibility */
	@keyframes toast-pulse {
		0%,
		100% {
			box-shadow:
				0 12px 20px -5px rgba(212, 180, 241, 0.35),
				0 5px 12px -3px rgba(254, 205, 211, 0.25),
				0 0 0 1px rgba(255, 232, 242, 0.7) inset,
				0 0 25px rgba(249, 168, 212, 0.3);
		}
		50% {
			box-shadow:
				0 12px 25px -5px rgba(212, 180, 241, 0.45),
				0 5px 15px -3px rgba(254, 205, 211, 0.35),
				0 0 0 1px rgba(255, 232, 242, 0.8) inset,
				0 0 35px rgba(249, 168, 212, 0.4);
		}
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
		animation:
			toast-bounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
			toast-pulse-warning 2s ease-in-out infinite,
			toast-fade 4.5s ease-in-out forwards;
	}

	/* Warning toast special pulse */
	@keyframes toast-pulse-warning {
		0%,
		100% {
			box-shadow:
				0 12px 20px -5px rgba(251, 211, 141, 0.3),
				0 5px 12px -3px rgba(254, 215, 170, 0.2),
				0 0 0 1px rgba(255, 237, 213, 0.7) inset,
				0 0 25px rgba(251, 191, 36, 0.3);
		}
		50% {
			box-shadow:
				0 12px 25px -5px rgba(251, 211, 141, 0.4),
				0 5px 15px -3px rgba(254, 215, 170, 0.3),
				0 0 0 1px rgba(255, 237, 213, 0.8) inset,
				0 0 35px rgba(251, 191, 36, 0.4);
		}
	}

	/* Ghost icon in toast */
	.toast-ghost {
		display: flex;
		align-items: center;
		justify-content: center;
		color: #9061c2; /* Softer purple */
		filter: drop-shadow(0 1px 2px rgba(255, 156, 243, 0.2));
		animation: ghost-float 2.5s ease-in-out infinite;
	}

	@keyframes ghost-float {
		0%,
		100% {
			transform: translateY(0) rotate(-2deg);
		}
		50% {
			transform: translateY(-4px) rotate(2deg);
		}
	}

	@keyframes toast-bounce {
		0% {
			transform: scale(0.95);
			opacity: 0;
		}
		60% {
			transform: scale(1.05);
			opacity: 1;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	@keyframes toast-fade {
		0%,
		5% {
			opacity: 0;
		}
		15%,
		85% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
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
		animation: fade-in 0.3s ease-out;
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
		animation: slide-up 0.4s cubic-bezier(0.19, 1, 0.22, 1);
		text-align: center;
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

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slide-up {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Ghost icon animations - defined globally */
	@keyframes ghost-pulse {
		0% {
			opacity: 1;
			transform: scale(1);
			filter: brightness(1);
		}
		50% {
			opacity: 0.8;
			transform: scale(1.03);
			filter: brightness(1.1);
		}
		100% {
			opacity: 1;
			transform: scale(1);
			filter: brightness(1);
		}
	}

	@keyframes ghost-wobble-left {
		0% {
			transform: rotate(0deg);
		}
		25% {
			transform: rotate(-5deg);
		}
		50% {
			transform: rotate(3deg);
		}
		75% {
			transform: rotate(-2deg);
		}
		100% {
			transform: rotate(0deg);
		}
	}

	@keyframes ghost-wobble-right {
		0% {
			transform: rotate(0deg);
		}
		25% {
			transform: rotate(5deg);
		}
		50% {
			transform: rotate(-3deg);
		}
		75% {
			transform: rotate(2deg);
		}
		100% {
			transform: rotate(0deg);
		}
	}

	:global(.ghost-pulse) {
		animation: ghost-pulse 0.4s ease-in-out;
	}

	:global(.ghost-wobble-left) {
		animation: ghost-wobble-left 0.6s ease-in-out;
	}

	:global(.ghost-wobble-right) {
		animation: ghost-wobble-right 0.6s ease-in-out;
	}

	/* Recording state glow effect is now handled in +page.svelte */

	/* Button animations */
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

	/* Confetti celebration animation styles */
	:global(.confetti-container) {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100vh;
		overflow: hidden;
		z-index: 9000;
		pointer-events: none;
	}

	:global(.confetti-piece) {
		position: absolute;
		animation: confetti-fall 3s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
		opacity: 0.9;
		will-change: transform, opacity;
	}

	@keyframes confetti-fall {
		0% {
			transform: translateY(-10px) rotate(0deg) scale(0.7);
			opacity: 0;
		}
		5% {
			opacity: 0.7;
		}
		15% {
			opacity: 1;
			transform: translateY(10vh) translateX(10px) rotate(45deg) scale(0.9);
		}
		35% {
			transform: translateY(30vh) translateX(15px) rotate(90deg) scale(1);
		}
		50% {
			transform: translateY(50vh) translateX(-10px) rotate(180deg) scale(0.95);
		}
		65% {
			transform: translateY(65vh) translateX(5px) rotate(240deg) scale(0.9);
		}
		85% {
			transform: translateY(85vh) translateX(-5px) rotate(320deg) scale(0.85);
			opacity: 0.7;
		}
		100% {
			transform: translateY(105vh) translateX(-10px) rotate(360deg) scale(0.8);
			opacity: 0;
		}
	}

	/* Enhanced breathing glow for button - more noticeable and smoother */
	.pulse-subtle {
		animation: button-breathe 3.5s ease-in-out infinite;
		transform-origin: center;
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

	/* Notification pulse animation for when the button shows a notification */
	.notification-pulse {
		animation: notification-glow 2.5s ease-in-out infinite;
		transform-origin: center;
		box-shadow:
			0 0 10px 2px rgba(139, 92, 246, 0.15),
			0 0 3px 1px rgba(139, 92, 246, 0.08);
	}

	@keyframes notification-glow {
		0%,
		100% {
			box-shadow:
				0 0 6px 1px rgba(139, 92, 246, 0.1),
				0 0 2px 0px rgba(139, 92, 246, 0.05);
			transform: scale(1);
		}
		50% {
			box-shadow:
				0 0 12px 3px rgba(139, 92, 246, 0.2),
				0 0 4px 1px rgba(139, 92, 246, 0.1);
			transform: scale(1.002);
		}
	}

	/* Wiggle animation for the ghost icon in notifications */
	@keyframes tada {
		0% {
			transform: scale(1);
		}
		10%,
		20% {
			transform: scale(0.9) rotate(-3deg);
		}
		30%,
		50%,
		70%,
		90% {
			transform: scale(1.1) rotate(3deg);
		}
		40%,
		60%,
		80% {
			transform: scale(1.1) rotate(-3deg);
		}
		100% {
			transform: scale(1) rotate(0);
		}
	}

	.animate-tada {
		animation: tada 1.5s ease infinite;
	}

	/* Recording timer styles */
	.recording-timer-container {
		width: 100%;
		display: flex;
		justify-content: center;
		margin-top: 0.75rem;
	}

	.recording-timer-display {
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		background-color: rgba(255, 255, 255, 0.9);
		color: #374151;
		font-weight: 500;
		font-size: 0.95rem;
		min-width: 70px;
		text-align: center;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		transition: all 0.3s ease;
	}

	.recording-timer-display.warning {
		color: #92400e;
		background-color: rgba(251, 191, 36, 0.15);
	}

	.recording-timer-display.danger {
		color: #b91c1c;
		background-color: rgba(239, 68, 68, 0.2);
		animation: timer-pulse 1.5s infinite ease-in-out;
	}

	@keyframes timer-pulse {
		0%,
		100% {
			color: #b91c1c;
			background-color: rgba(239, 68, 68, 0.2);
		}
		50% {
			color: #7f1d1d;
			background-color: rgba(239, 68, 68, 0.35);
		}
	}
</style>
