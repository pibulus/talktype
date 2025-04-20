<!-- This content is replaced with improved version using the Replace tool -->
<script context="module">
	let showExtensionInfo = false;
	let showAboutInfo = false;
	let showSettingsModal = false;
</script>

<script>
	import { onMount } from 'svelte';
	import AudioToText from '$lib/components/AudioToText.svelte';
	import { browser } from '$app/environment';
	import { geminiService } from '$lib/services/geminiService';

	// Lazy load modals - only import when needed
	let SettingsModal;
	let loadingSettingsModal = false;
	// PWA Install Prompt component - lazy loaded
	let PwaInstallPrompt;
	let loadingPwaPrompt = false;

	// Track speech model preloading state
	let speechModelPreloaded = false;

	// PWA Install Prompt Logic
	const PWA_INSTALL_PROMPT_THRESHOLD = 5; // Show prompt after 5 successful transcriptions
	let deferredInstallPrompt = null; // Stores the beforeinstallprompt event
	let showPwaInstallPrompt = false; // Controls visibility of the PWA install prompt

	// Create a reusable Svelte action for handling clicks outside an element
	function clickOutside(node, { enabled = true, callback = () => {} }) {
		const handleClick = (event) => {
			if (!node.contains(event.target) && !event.defaultPrevented && enabled) {
				callback();
			}
		};

		document.addEventListener('click', handleClick, true);

		return {
			update(params) {
				enabled = params.enabled;
				callback = params.callback;
			},
			destroy() {
				document.removeEventListener('click', handleClick, true);
			}
		};
	}

	let audioToTextComponent;
	let showIntroModal = false;

	// Brian Eno-inspired ambient blinking system with proper state tracking - SIMPLIFIED
	let blinkTimeout = null; // Single timeout for blink management
	let ambientBlinkTimeout = null; // Separate timeout for ambient scheduling
	let isRecording = false;
	let eyesElement = null;
	let iconBgElement = null; // Reference to the background gradient
	let iconContainer = null; // Reference to the icon container
	let domReady = false;
	let ambientBlinkingActive = false; // Track if ambient blinking is supposed to be running

	// Debug Helper that won't pollute console in production but helps during development
	function debug(message) {
		// Uncomment the line below during development for verbose logging
		// console.log(`[Ghost Eyes] ${message}`);
	}

	// Animation state variables
	let titleAnimationComplete = false;
	let subtitleAnimationComplete = false;

	// Get eyes element safely - now using bind:this
	function getEyesElement() {
		// No need for debug here, it's called frequently
		if (eyesElement) return eyesElement;
		return null;
	}

	// Single blink using CSS classes - simplified and faster (from best practices)
	function blink() {
		const eyes = getEyesElement();
		if (!eyes) {
			debug('Blink failed: Eyes element not found');
			return;
		}

		debug('Performing single blink');

		// Clear any existing blink animation timeout first
		if (blinkTimeout) {
			debug('Clearing existing blink timeout before new blink');
			clearTimeout(blinkTimeout);
			// Ensure class is removed if timeout is cleared mid-animation
			eyes.classList.remove('blink-once');
		}

		// Apply blink animation
		eyes.classList.add('blink-once');
		debug('Added blink-once class');

		// Remove class after animation completes (faster animation)
		blinkTimeout = setTimeout(() => {
			const currentEyes = getEyesElement(); // Re-check element
			if (currentEyes) {
				currentEyes.classList.remove('blink-once');
				debug('Removed blink-once class after animation');
			} else {
				debug('Eyes element gone before blink-once class removal');
			}
			blinkTimeout = null; // Clear the timeout reference
		}, 180); // Match CSS animation duration
	}

	// For a double blink, use sequential timeouts (from best practices)
	function doubleClick() {
		debug('Performing double blink');
		blink(); // First blink
		setTimeout(() => blink(), 200); // Second blink after a short pause
	}

	// Generative ambient blinking system - Brian Eno style - SIMPLIFIED
	function startAmbientBlinking() {
		debug('Attempting to start ambient blinking system...');

		// Prevent multiple concurrent ambient systems
		if (ambientBlinkingActive) {
			debug('Ambient blinking already active, skipping start request.');
			return;
		}

		if (!domReady) {
			debug('DOM not ready, delaying ambient blinking start');
			// Retry after a short delay
			setTimeout(startAmbientBlinking, 500);
			return;
		}

		const eyes = getEyesElement();
		if (!eyes) {
			debug('Eyes element not found, delaying ambient blinking start');
			// Retry after a short delay
			setTimeout(startAmbientBlinking, 500);
			return;
		}

		// Don't run ambient blinks if recording
		if (isRecording) {
			debug('Recording active, cannot start ambient blinks now.');
			return;
		}

		debug('>>> Starting ambient blinking system NOW <<<');
		ambientBlinkingActive = true; // Mark as active

		// Clear any existing ambient schedule timeout
		clearAmbientBlinkTimeout();
		// Also clear any active blink animation timeout
		clearBlinkTimeout();

		// Parameters for generative system - Brian Eno style (using best practice timings)
		const minGap = 4000; // Minimum time between blinks (4s)
		const maxGap = 9000; // Maximum time between blinks (9s)

		// Blink type probabilities (simplified)
		const doubleBlinkProbability = 0.25; // 25% chance of double blink

		// Schedule the next blink recursively
		function scheduleNextBlink() {
			// Clear any previous ambient timeout before setting a new one
			clearAmbientBlinkTimeout();

			// Random time interval
			const nextInterval = Math.floor(minGap + Math.random() * (maxGap - minGap));

			debug(`Scheduling next ambient blink in ${nextInterval}ms`);

			ambientBlinkTimeout = setTimeout(() => {
				// Ensure ambient blinking is still supposed to be active
				if (!ambientBlinkingActive) {
					debug('Ambient blinking was stopped, cancelling scheduled blink.');
					return;
				}
				// Exit if we've switched to recording state
				if (isRecording) {
					debug('Recording active, skipping scheduled ambient blink');
					// We don't reschedule here; startAmbientBlinking needs to be called again when recording stops.
					ambientBlinkingActive = false; // Mark as inactive as recording interrupted it
					return;
				}
				// Check if eyes element still exists
				const currentEyes = getEyesElement();
				if (!currentEyes) {
					debug('Eyes element disappeared, stopping ambient blinking.');
					ambientBlinkingActive = false; // Mark as inactive
					return;
				}

				// Choose blink type based on probability
				const rand = Math.random();
				if (rand < doubleBlinkProbability) {
					debug('Selected double blink (ambient)');
					doubleClick();
				} else {
					debug('Selected single blink (ambient)');
					blink();
				}

				// Schedule the *next* blink only if still active
				if (ambientBlinkingActive) {
					scheduleNextBlink();
				} else {
					debug('Not rescheduling next blink as ambient blinking is no longer active.');
				}
			}, nextInterval);
		}

		// Start the first blink after a short delay
		debug('Scheduling first ambient blink');
		setTimeout(scheduleNextBlink, 1500); // Slightly longer initial delay
	}

	// Function to explicitly stop ambient blinking
	function stopAmbientBlinking() {
		debug('>>> Stopping ambient blinking system <<<');
		ambientBlinkingActive = false;
		clearAmbientBlinkTimeout();
		// Optionally clear any active blink animation as well
		// clearBlinkTimeout();
	}


	// Helper function to clear the active blink animation timeout
	function clearBlinkTimeout() {
		if (blinkTimeout) {
			clearTimeout(blinkTimeout);
			blinkTimeout = null;
			// Ensure class is removed if timeout is cleared mid-animation
			const eyes = getEyesElement();
			if (eyes) {
				eyes.classList.remove('blink-once');
			}
			debug('Cleared active blink timeout');
		}
	}

	// Helper function to clear the ambient scheduling timeout
	function clearAmbientBlinkTimeout() {
		if (ambientBlinkTimeout) {
			clearTimeout(ambientBlinkTimeout);
			ambientBlinkTimeout = null;
			debug('Cleared ambient blink schedule timeout');
		}
	}

	// Greeting blink on page load
	function greetingBlink() {
		debug('Attempting greeting blink...');
		const eyes = getEyesElement();
		if (!eyes) {
			// Retry if eyes not found yet
			debug('Eyes not found for greeting, retrying in 300ms');
			setTimeout(greetingBlink, 300);
			return;
		}

		debug('Performing greeting blink sequence');

		// First apply a gentle wobble to the ghost icon
		if (iconContainer) {
			// Add slight wobble animation to ghost
			setTimeout(() => {
				debug('Adding greeting wobble to ghost');

				// Apply the wobble animation
				const wobbleClass = 'ghost-wobble-greeting';
				iconContainer.classList.add(wobbleClass);

				// Remove class after animation completes
				setTimeout(() => {
					if (iconContainer) { // Check if element still exists
						iconContainer.classList.remove(wobbleClass);
					}
				}, 1000);
			}, 1000); // Start the wobble after the text starts animating
		} else {
			debug('Icon container not found for greeting wobble');
		}

		// Do a friendly double-blink after animations complete
		setTimeout(() => {
			debug('Performing greeting double blink');
			doubleClick(); // Use the new doubleClick function

			// Start ambient blinking system after greeting blink finishes
			// Add a small delay after the double blink completes (~400ms)
			setTimeout(() => {
				debug('Attempting to start ambient blinking after greeting');
				startAmbientBlinking();
			}, 500);
		}, 2000); // Delay long enough for text animations
	}

	// Domain Ready and Observer setup
	function setupDomObserver() {
		debug('Setting up DOM observer');

		// We now use bind:this instead of querySelector
		if (eyesElement) {
			debug('Eyes element found immediately via bind:this');
			domReady = true;
			greetingBlink(); // Start the greeting sequence which includes starting ambient blinking
			return;
		}

		// If not found yet, wait a bit using setTimeout as bind:this might take a cycle
		debug('Eyes element not immediately available via bind:this, will check again shortly.');
		setTimeout(() => {
			if (eyesElement) {
				debug('Eyes element found after short delay via bind:this');
				domReady = true;
				greetingBlink();
			} else {
				debug('Eyes element still not found after delay. Ambient blinking might be delayed.');
				// Consider adding a fallback or error message if this happens consistently
			}
		}, 100); // Check after 100ms

		// We might not need the MutationObserver if bind:this is reliable enough,
		// but keeping it as a fallback for complex scenarios.
		const observer = new MutationObserver((mutations, obs) => {
			if (eyesElement && !domReady) { // Check !domReady to avoid running twice
				debug('Eyes element found via MutationObserver');
				domReady = true;
				greetingBlink();
				obs.disconnect(); // Stop observing once we've found it
				debug('Disconnected MutationObserver');
			}
		});

		// Start observing the body
		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
		debug('MutationObserver started');

		// Fallback timeout in case observer fails or bind:this is slow
		setTimeout(() => {
			if (!domReady && eyesElement) {
				debug('Fallback DOM ready check triggered');
				domReady = true;
				greetingBlink();
				observer.disconnect(); // Disconnect observer if fallback triggers
				debug('Disconnected MutationObserver via fallback');
			} else if (!domReady && !eyesElement) {
				debug('Fallback DOM ready check: Eyes element still not found.');
			}
		}, 1500); // Increased fallback timeout
	}

	// Function to handle title animation complete
	function handleTitleAnimationComplete() {
		debug('Title animation complete');
		titleAnimationComplete = true;
	}

	// Function to handle subtitle animation complete
	function handleSubtitleAnimationComplete() {
		debug('Subtitle animation complete');
		subtitleAnimationComplete = true;
	}

	// Check if this is the first visit to show intro modal
	function checkFirstVisit() {
		if (!browser) return;

		// Check if user has seen the intro before
		const hasSeenTalkTypeIntro = localStorage.getItem('hasSeenTalkTypeIntro');

		if (!hasSeenTalkTypeIntro) {
			// First visit, show intro modal after a brief delay
			setTimeout(() => {
				const modal = document.getElementById('intro_modal');
				if (modal) {
					debug('Opening intro modal on first visit');
					modal.showModal();

					// Set up event listener to handle modal close event from any source
					modal.addEventListener('close', () => {
						debug('Intro modal closed, marking intro as seen');
						markIntroAsSeen();
					}, { once: true }); // Use once: true to auto-cleanup listener
				} else {
					console.error('Intro modal element not found');
					debug('Intro modal element not found');
				}
			}, 500);
		} else {
			debug('User has seen intro before, skipping modal.');
		}
	}

	// Save that user has seen the intro
	function markIntroAsSeen() {
		if (!browser) return;
		localStorage.setItem('hasSeenTalkTypeIntro', 'true');
		debug('Marked intro as seen in localStorage');
	}

	// Function to preload speech model for faster initial response
	function preloadSpeechModel() {
		if (!speechModelPreloaded && browser) {
			debug('Preloading speech model triggered');
			speechModelPreloaded = true; // Assume success initially
			geminiService.preloadModel()
				.then(() => {
					debug('Speech model preloaded successfully.');
				})
				.catch(err => {
					// Just log the error, don't block UI
					console.error('Error preloading speech model:', err);
					debug(`Error preloading speech model: ${err.message}`);
					// Reset so we can try again
					speechModelPreloaded = false;
				});
		} else if (speechModelPreloaded) {
			debug('Speech model already preloaded or preloading.');
		}
	}

	// Variable to track the ghost icon event listener for cleanup
	let ghostIconEventCleanup = null;

	// Component lifecycle
	onMount(() => {
		debug('Component mounted');
		// Start DOM observation and initial animations/blinks
		setupDomObserver();

		// Add mouseenter event listener to the ghost icon for model preloading
		if (browser) {
			// Wait slightly longer for the DOM element to be reliably available
			setTimeout(() => {
				// Re-select inside timeout to ensure it exists
				const ghostIconForListener = document.querySelector('.icon-container');
				if (ghostIconForListener) {
					ghostIconForListener.addEventListener('mouseenter', preloadSpeechModel);
					debug('Added mouseenter event listener to ghost icon for model preloading');

					// Store cleanup function
					ghostIconEventCleanup = () => {
						if (ghostIconForListener) { // Check again before removing
							ghostIconForListener.removeEventListener('mouseenter', preloadSpeechModel);
							debug('Removed mouseenter event listener from ghost icon');
						}
					};
				} else {
					debug('Could not find ghost icon to attach mouseenter listener after delay.');
				}
			}, 600); // Increased delay slightly
		}

		// Check for auto-record setting and start recording if enabled
		if (browser && localStorage.getItem('talktype-autoRecord') === 'true') {
			// Wait minimal time for component initialization
			setTimeout(() => {
				if (audioToTextComponent && !audioToTextComponent.recording) {
					debug('Auto-record enabled, attempting to start recording immediately');

					// Make ghost do a quick animation and start recording immediately
					const currentIconContainer = iconContainer; // Use bound variable
					if (currentIconContainer) {
						// Start recording immediately with minimal animation
						const currentEyes = getEyesElement();
						if (currentEyes) {
							debug('Auto-record: Stopping ambient blinking and performing start blink.');
							stopAmbientBlinking(); // Explicitly stop ambient
							clearBlinkTimeout(); // Stop any active blink

							// Quick single blink and start recording immediately
							blink(); // Use the new blink function

							// Start recording immediately
							try {
								audioToTextComponent.startRecording();
								debug('Auto-record: Called startRecording()');
								// Update UI state
								currentIconContainer.classList.add('recording');
								// Also update the local recording state variable
								isRecording = true;
								debug('Auto-record: UI and state updated to recording.');
							} catch (err) {
								debug(`Auto-record: Error starting recording: ${err.message}`);
							}

						} else {
							// Fallback if eyes element not found
							debug('Auto-record: Eyes element not found, starting recording without blink.');
							try {
								audioToTextComponent.startRecording();
								currentIconContainer.classList.add('recording');
								isRecording = true;
								debug('Auto-record: Started recording (no eyes fallback).');
							} catch (err) {
								debug(`Auto-record: Error starting recording (no eyes fallback): ${err.message}`);
							}
						}
					} else {
						// Fallback if ghost icon not found
						debug('Auto-record: Icon container not found, attempting direct start.');
						try {
							audioToTextComponent.startRecording();
							isRecording = true; // Update state even if UI fails
							debug('Auto-record: Started recording (no icon container fallback).');
						} catch (err) {
							debug(`Auto-record: Error starting recording (no icon container fallback): ${err.message}`);
						}
					}
				} else {
					debug('Auto-record: Conditions not met (no component or already recording).');
				}
			}, 500); // Reduced delay - just enough for component initialization
		} else {
			debug('Auto-record not enabled or not in browser.');
		}

		// Listen for settings changes
		if (browser) {
			window.addEventListener('talktype-setting-changed', (event) => {
				if (event.detail && event.detail.setting === 'autoRecord') {
					debug(`Setting changed event: autoRecord = ${event.detail.value}`);
					// No immediate action needed, setting will apply on next page load/refresh
				}
			});
			debug('Added listener for settings changes.');
		}

		// Check if first visit to show intro
		checkFirstVisit();

		// Set up animation sequence timing
		setTimeout(handleTitleAnimationComplete, 1200); // After staggered animation
		setTimeout(handleSubtitleAnimationComplete, 2000); // After subtitle slide-in

		// Handle theme for visitors (first time or returning)
		if (browser) {
			const savedVibe = localStorage.getItem("talktype-vibe");
			if (!savedVibe) {
				// First visit - set default theme in localStorage
				debug('First visit: Setting default theme (peach)');
				localStorage.setItem("talktype-vibe", "peach");
				document.documentElement.setAttribute('data-theme', 'peach');
			} else {
				// Apply theme to document element for consistent CSS targeting
				debug(`Applying saved theme: ${savedVibe}`);
				document.documentElement.setAttribute('data-theme', savedVibe);
			}
		}
		// We no longer need to call applyTheme here since theme is applied directly in the HTML
		// This prevents the flash of changing themes

		// For testing without localStorage, you can uncomment these lines
		// localStorage.removeItem('hasSeenTalkTypeIntro');
		// localStorage.removeItem('talktype-vibe');
		// localStorage.removeItem('talktype-transcription-count'); // For testing PWA prompt

		// --- PWA Install Prompt Listener ---
		if (browser) {
			window.addEventListener('beforeinstallprompt', (e) => {
				// Prevent the mini-infobar from appearing on mobile
				e.preventDefault();
				// Stash the event so it can be triggered later.
				deferredInstallPrompt = e;
				debug('✅ `beforeinstallprompt` event captured.');
				// Optionally, update UI to notify the user they can install the PWA
				// We will do this based on transcription count later
			});

			window.addEventListener('appinstalled', () => {
				// Log install to analytics or clear install prompt UI
				debug('✅ TalkType PWA installed successfully!');
				deferredInstallPrompt = null; // Clear the stored event
				showPwaInstallPrompt = false; // Hide prompt if it was somehow visible
			});
			debug('Added PWA install event listeners.');
		}
		// --- End PWA Install Prompt Listener ---

		// **Direct call to start ambient blinking as a safety measure**
		// This ensures it starts even if the greetingBlink path has issues.
		// Delay it enough to allow the greeting blink to potentially finish first.
		setTimeout(() => {
			debug('Attempting direct start of ambient blinking (safety check)');
			startAmbientBlinking();
		}, 3500); // 3.5 seconds delay


		return () => {
			debug('Component unmounting, clearing timeouts and event listeners');
			stopAmbientBlinking(); // Explicitly stop ambient blinking
			clearBlinkTimeout(); // Clear any active blink animation

			// Clean up the mouseenter event listener
			if (ghostIconEventCleanup) {
				ghostIconEventCleanup();
			}
			// Remove PWA listeners if needed (though usually they persist for the session)
			// window.removeEventListener('beforeinstallprompt', ...);
			// window.removeEventListener('appinstalled', ...);
			// Remove settings listener? Maybe not necessary if app lifetime matches listener lifetime.
		};
	});

	// Apply theme/vibe function for initial load
	function applyTheme(vibeId) {
		debug(`Applying theme: ${vibeId}`);
		// Store in localStorage
		localStorage.setItem("talktype-vibe", vibeId);

		// Apply theme to document root for consistent CSS targeting
		document.documentElement.setAttribute('data-theme', vibeId);

		// Update ghost icon by swapping the SVG file
		const currentIconBgElement = getEyesElement(); // Re-check element
		if (currentIconBgElement) {
			debug(`Updating icon background SVG for theme: ${vibeId}`);
			// Set the appropriate gradient SVG based on theme
			switch(vibeId) {
				case 'mint':
					currentIconBgElement.src = '/talktype-icon-bg-gradient-mint.svg';
					currentIconBgElement.classList.remove('rainbow-animated');
					break;
				case 'bubblegum':
					currentIconBgElement.src = '/talktype-icon-bg-gradient-bubblegum.svg';
					currentIconBgElement.classList.remove('rainbow-animated');
					break;
				case 'rainbow':
					currentIconBgElement.src = '/talktype-icon-bg-gradient-rainbow.svg';
					currentIconBgElement.classList.add('rainbow-animated');
					break;
				default: // Default to peach
					currentIconBgElement.src = '/talktype-icon-bg-gradient.svg';
					currentIconBgElement.classList.remove('rainbow-animated');
					break;
			}

			// Force a reflow to ensure the gradient is visible
			void currentIconBgElement.offsetWidth;
		} else {
			debug('Cannot update icon background SVG: iconBgElement not found.');
		}
	}

	// Reliable recording toggle with ambient blinking support
	function startRecordingFromGhost(event) {
		// Stop event propagation to prevent bubbling
		event.stopPropagation();
		event.preventDefault();

		// Debug current state
		debug(`Ghost clicked! Current recording state (isRecording var): ${isRecording}`);

		// Get DOM elements with error checking
		const currentIconContainer = event.currentTarget;
		if (!currentIconContainer) {
			debug('Ghost click failed: No icon container found');
			return;
		}

		const eyes = getEyesElement();
		if (!eyes) {
			debug('Ghost click warning: Eyes element not found');
			// Don't return here, we might still need to stop recording
		}

		if (!audioToTextComponent) {
			debug('Ghost click failed: No audioToTextComponent found');
			return;
		}

		// Use component's state as a reliable source, fallback to classList if needed
		const isCurrentlyRecording = audioToTextComponent.recording;
		debug(`Component recording state: ${isCurrentlyRecording}`);
		// const hasRecordingClass = currentIconContainer.classList.contains('recording');
		// debug(`DOM state: has 'recording' class = ${hasRecordingClass}`);

		if (isCurrentlyRecording) {
			// === STOPPING RECORDING ===
			debug('Action: Stopping recording');

			// Update recording state FIRST
			isRecording = false;

			// Stop ambient blinking if it was somehow active (shouldn't be)
			stopAmbientBlinking();
			// Reset any eye animation state if eyes exist
			if (eyes) {
				eyes.style.animation = 'none'; // Remove CSS animations like blink-thinking
				eyes.classList.remove('blink-once', 'blink-thinking-hard'); // Remove animation classes
				debug('Cleared eye animations');
			}
			clearBlinkTimeout(); // Clear any programmatic blink

			// Remove the recording class from UI
			currentIconContainer.classList.remove('recording');
			debug('Removed recording class from icon container');

			// Add wobble animation when stopping from ghost click
			debug('Applying wobble animation to ghost icon on stop');
			// Force reflow to ensure animation applies
			void currentIconContainer.offsetWidth;

			// Clear any existing animation classes first
			currentIconContainer.classList.remove('ghost-wobble-left', 'ghost-wobble-right');

			const wobbleClass = Math.random() > 0.5 ? 'ghost-wobble-left' : 'ghost-wobble-right';
			debug(`Adding wobble class: ${wobbleClass}`);
			currentIconContainer.classList.add(wobbleClass);
			// console.log('Current classes:', currentIconContainer.className); // Less noisy debug
			setTimeout(() => {
				debug(`Removing wobble class: ${wobbleClass}`);
				if (currentIconContainer) { // Check element exists
					currentIconContainer.classList.remove(wobbleClass);
				}
			}, 600);

			// Blink once to acknowledge stop
			setTimeout(() => {
				debug('Performing stop acknowledgment blink');
				blink(); // Use new blink function (verified single blink)

				// Resume ambient blinking after a pause
				setTimeout(() => {
					debug('Attempting to resume ambient blinking after stop');
					startAmbientBlinking();
				}, 1000);
			}, 100); // Short delay after wobble starts

			// Stop the recording in the component
			try {
				audioToTextComponent.stopRecording();
				debug('Called stopRecording() on component');
			} catch (err) {
				debug(`Error stopping recording via component: ${err.message}`);
			}
		} else {
			// === STARTING RECORDING ===
			debug('Action: Starting recording');

			// Update recording state FIRST and stop ambient system
			isRecording = true;
			stopAmbientBlinking(); // Stop ambient blinking explicitly
			clearBlinkTimeout(); // Clear any active blink animation

			// Reset any existing eye animations if eyes exist
			if (eyes) {
				eyes.style.animation = 'none';
				eyes.classList.remove('blink-once', 'blink-thinking-hard');
				debug('Cleared eye animations before start');
			}

			// Add wobble animation when starting from ghost click
			debug('Applying wobble animation to ghost icon on start');
			// Force reflow to ensure animation applies
			void currentIconContainer.offsetWidth;

			// Clear any existing animation classes first
			currentIconContainer.classList.remove('ghost-wobble-left', 'ghost-wobble-right');

			const wobbleClass = Math.random() > 0.5 ? 'ghost-wobble-left' : 'ghost-wobble-right';
			debug(`Adding wobble class: ${wobbleClass}`);
			currentIconContainer.classList.add(wobbleClass);
			// console.log('Current classes:', currentIconContainer.className); // Less noisy debug
			setTimeout(() => {
				debug(`Removing wobble class: ${wobbleClass}`);
				if (currentIconContainer) { // Check element exists
					currentIconContainer.classList.remove(wobbleClass);
				}
			}, 600);

			// Give a tiny delay to ensure animation reset before blinking/recording
			setTimeout(() => {
				// Random chance for different start behaviors
				const startBehavior = Math.random();

				if (startBehavior < 0.8) {
					// 80% chance: Standard quick blink
					debug('Performing standard start blink');
					blink();
				} else {
					// 20% chance: Double blink (excited)
					debug('Performing excited double start blink');
					doubleClick();
				}
				// Removed triple blink for simplicity

				// Add recording class after the blink animation completes
				// Use a slightly longer delay to account for double blink possibility
				setTimeout(() => {
					debug('Adding recording class to icon container');
					if (currentIconContainer) { // Check element exists
						currentIconContainer.classList.add('recording');
					}
				}, 400); // Adjusted delay

				// Start recording in the component
				try {
					audioToTextComponent.startRecording();
					debug('Called startRecording() on component');
				} catch (err) {
					debug(`Error starting recording via component: ${err.message}`);
					// If starting fails, revert state
					isRecording = false;
					if (currentIconContainer) currentIconContainer.classList.remove('recording');
					// Maybe restart ambient blinking?
					startAmbientBlinking();
				}
			}, 50); // Short delay after wobble starts
		}
	}

	// Variables to track modal state and store scroll position
	let modalOpen = false;
	let scrollPosition = 0;

	// Function to create and add a modal to the document using template strings
	function createModalFromTemplate(modalId, templateHtml) {
		// Check if the modal already exists
		if (document.getElementById(modalId)) {
			debug(`Modal ${modalId} already exists.`);
			return document.getElementById(modalId);
		}
		debug(`Creating modal ${modalId} from template.`);

		// Create a temporary container
		const container = document.createElement('div');
		container.innerHTML = templateHtml.trim();

		// Append the first element (the modal)
		const modal = container.firstElementChild;
		if (modal) {
			document.body.appendChild(modal);
			debug(`Appended modal ${modalId} to body.`);
			return modal;
		} else {
			debug(`Failed to create modal ${modalId} from template HTML.`);
			return null;
		}
	}

	// About modal template
	const aboutModalTemplate = `
	<dialog id="about_modal" class="modal modal-bottom sm:modal-middle overflow-hidden fixed z-50" style="overflow-y: hidden!important;" role="dialog" aria-labelledby="about_modal_title" aria-modal="true">
		<div class="modal-box bg-gradient-to-br from-[#fffaef] to-[#fff6e6] shadow-xl border border-pink-200 rounded-2xl overflow-y-auto max-h-[80vh]">
			<form method="dialog">
				<button
					class="btn btn-sm btn-circle absolute right-3 top-3 bg-pink-100 border-pink-200 text-pink-500 hover:bg-pink-200 hover:text-pink-700 shadow-sm"
					onclick="window.closeModal()"
				>✕</button>
			</form>

			<div class="animate-fadeUp space-y-4">
				<div class="flex items-center gap-3 mb-1">
					<div class="w-9 h-9 bg-gradient-to-br from-white to-pink-50 rounded-full flex items-center justify-center shadow-sm border border-pink-200/60">
						<div class="relative w-7 h-7">
							<img src="/talktype-icon-bg-gradient.svg" alt="" class="absolute inset-0 w-full h-full" />
							<img src="/assets/talktype-icon-base.svg" alt="" class="absolute inset-0 w-full h-full" />
							<img src="/assets/talktype-icon-eyes.svg" alt="" class="absolute inset-0 w-full h-full" />
						</div>
					</div>
					<h3 id="about_modal_title" class="font-black text-xl text-gray-800 tracking-tight">About TalkType</h3>
				</div>

				<div class="bg-gradient-to-r from-pink-50/90 to-amber-50/90 p-4 rounded-lg border border-pink-200/60 shadow-sm">
					<p class="text-sm leading-relaxed text-gray-700">
						TalkType is a minimalist voice-to-text tool that transforms your speech into text effortlessly.
						Built with love by two friends who think tech should be <span class="text-pink-600 font-medium">simple</span>,
						<span class="text-amber-600 font-medium">delightful</span>, and actually <span class="text-pink-600 font-medium">helpful</span>.
					</p>
				</div>

				<div>
					<h4 class="font-bold text-sm text-gray-700 mb-2">Why we made this:</h4>
					<ul class="space-y-1.5 text-sm text-gray-600">
						<li class="flex items-start gap-2">
							<span class="text-pink-500 text-lg">⬩</span>
							<span>We both think better by <span class="italic">talking</span>, not typing</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-pink-500 text-lg">⬩</span>
							<span>Other voice-typing tools are either expensive or clunky</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-pink-500 text-lg">⬩</span>
							<span>We wanted something beautiful that just works</span>
						</li>
					</ul>
				</div>

				<div class="border-l-3 border-pink-300 py-1 pl-4 ml-1 my-2 italic text-gray-600">
					"A little bit of soul, a hint of chaos, and a deep love for clarity."
				</div>

				<div class="flex justify-between items-end pt-2">
					<div>
						<p class="text-xs text-gray-500">Made with ☕ in Melbourne, Australia</p>
					</div>
					<div class="flex items-center gap-2 text-xs font-medium text-gray-600">
						<span class="animate-pulse text-pink-500">❤️</span> Dennis & Pabs
					</div>
				</div>
			</div>
		</div>
		<div class="modal-backdrop bg-black/40"></div>
	</dialog>`;

	// Extension modal template
	const extensionModalTemplate = `
	<dialog id="extension_modal" class="modal modal-bottom sm:modal-middle overflow-hidden fixed z-50" style="overflow-y: hidden!important;" role="dialog" aria-labelledby="extension_modal_title" aria-modal="true">
		<div class="modal-box bg-gradient-to-br from-[#fffaef] to-[#fff6e6] shadow-xl border border-pink-200 rounded-2xl overflow-y-auto max-h-[80vh]">
			<form method="dialog">
				<button
					class="btn btn-sm btn-circle absolute right-3 top-3 bg-pink-100 border-pink-200 text-pink-500 hover:bg-pink-200 hover:text-pink-700 shadow-sm"
					onclick="window.closeModal()"
				>✕</button>
			</form>

			<div class="animate-fadeUp space-y-4">
				<div class="flex items-center gap-3 mb-1">
					<div class="w-9 h-9 bg-gradient-to-br from-white to-purple-50 rounded-full flex items-center justify-center shadow-sm border border-purple-200/60">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-purple-600">
							<path d="M6 2l.01 6L10 12l-4 4 .01 6H20V2H6zm7 11a1 1 0 110-2 1 1 0 010 2zm-1-9a1 1 0 000 2h5a1 1 0 100-2h-5z" />
						</svg>
					</div>
					<h3 id="extension_modal_title" class="font-black text-xl text-gray-800 tracking-tight">Chrome Extension</h3>
				</div>

				<div class="bg-gradient-to-r from-pink-50/90 to-amber-50/90 p-4 rounded-lg border border-pink-200/60 shadow-sm">
					<p class="text-sm leading-relaxed text-gray-700">
						Use TalkType everywhere on the web! Our Chrome extension lets you transcribe directly into any text field.
						Perfect for emails, social media, messaging apps, or anywhere else you need to type.
					</p>
				</div>

				<div class="rounded-xl border border-pink-200/60 bg-gradient-to-br from-white to-pink-50/50 p-4 shadow-sm">
					<h4 class="font-bold text-sm text-gray-800 mb-2">Installation in 5 easy steps:</h4>
					<ol class="mt-2 list-decimal space-y-2 pl-5 text-left text-sm text-gray-700">
						<li class="pb-1">
							Download the extension files <a
								href="#"
								class="text-pink-600 transition-colors hover:text-pink-700 hover:underline font-medium"
								>here</a
							>
						</li>
						<li class="pb-1">
							Unzip the files to a folder on your computer
						</li>
						<li class="pb-1">
							Open Chrome and go to <code
								class="rounded-md bg-pink-100 px-1.5 py-0.5 font-mono text-pink-700"
								>chrome://extensions</code
							>
						</li>
						<li class="pb-1">Enable "Developer mode" in the top-right corner</li>
						<li>Click "Load unpacked" and select the extension folder</li>
					</ol>
				</div>

				<div class="pt-1 flex justify-end">
					<span class="text-xs text-gray-600 italic font-medium">Voice-to-text anywhere, anytime 🎙️</span>
				</div>
			</div>
		</div>
		<div class="modal-backdrop bg-black/40"></div>
	</dialog>`;

	// Shared modal opening logic
	function openModalSharedLogic(modalId) {
		debug(`Attempting to open modal: ${modalId}`);
		// Setup close handlers globally if not present
		if (browser && window && !window.closeModal) {
			debug('Assigning global closeModal function.');
			window.closeModal = closeModal; // Assign the Svelte component's closeModal
		}

		const modal = document.getElementById(modalId);
		if (!modal) {
			debug(`Modal ${modalId} element not found in DOM.`);
			return;
		}

		// Add click handler to backdrop for closing
		const backdrop = modal.querySelector('.modal-backdrop');
		if (backdrop) {
			// Remove any existing listener first to prevent duplicates
			backdrop.onclick = null;
			backdrop.onclick = () => {
				debug(`Backdrop clicked for modal ${modalId}, closing.`);
				// modal.close(); // DaisyUI handles this via form method="dialog" or direct close()
				closeModal(); // Use our function to handle scroll restoration etc.
			};
			debug(`Attached backdrop click listener for ${modalId}.`);
		} else {
			debug(`Backdrop element not found for modal ${modalId}.`);
		}

		// Prevent body scroll
		scrollPosition = window.scrollY;
		const width = document.body.clientWidth; // Get width before changing styles
		modalOpen = true;

		debug(`Locking body scroll at position ${scrollPosition}px, width ${width}px.`);
		document.body.style.position = 'fixed';
		document.body.style.top = `-${scrollPosition}px`;
		document.body.style.width = `${width}px`; // Use captured width
		document.body.style.overflow = 'hidden';
		// document.body.style.height = '100%'; // Avoid setting height, can cause issues

		// Show the modal using its native showModal method
		if (typeof modal.showModal === 'function') {
			modal.showModal();
			debug(`Called showModal() for ${modalId}.`);
		} else {
			debug(`Modal ${modalId} does not have a showModal method.`);
			// Fallback or error handling needed? DaisyUI modals should have it.
		}
	}

	// Function to show the About modal - lazy loaded via DOM
	function showAboutModal() {
		debug('showAboutModal called');
		// Create the modal if it doesn't exist
		createModalFromTemplate('about_modal', aboutModalTemplate);
		// Open it using shared logic
		openModalSharedLogic('about_modal');
	}

	// Function to show the Extension modal - lazy loaded via DOM
	function showExtensionModal() {
		debug('showExtensionModal called');
		// Create the modal if it doesn't exist
		createModalFromTemplate('extension_modal', extensionModalTemplate);
		// Open it using shared logic
		openModalSharedLogic('extension_modal');
	}

	// Function to show the Settings modal - now with lazy loading
	async function openSettingsModal() {
		debug('openSettingsModal called');
		// First, ensure any open dialogs are closed and scroll is restored
		if (modalOpen) {
			debug('Another modal was open, closing it first.');
			closeModal();
			// Add a tiny delay to allow the browser to process the closing
			await new Promise(resolve => setTimeout(resolve, 50));
		}

		// Check if we're already loading the modal
		if (loadingSettingsModal) {
			debug('SettingsModal is already loading, aborting.');
			return;
		}

		// Dynamically import the SettingsModal component if not already loaded
		if (!SettingsModal) {
			loadingSettingsModal = true;
			debug('Lazy loading SettingsModal component...');

			try {
				// Import the component dynamically
				const module = await import('$lib/components/settings/SettingsModal.svelte');
				SettingsModal = module.default;
				debug('SettingsModal component loaded successfully');
			} catch (err) {
				console.error('Error loading SettingsModal:', err);
				debug(`Error loading SettingsModal: ${err.message}`);
				loadingSettingsModal = false;
				return; // Don't proceed if loading failed
			} finally {
				loadingSettingsModal = false; // Ensure this is always reset
			}
		}

		// Use shared logic to lock scroll and prepare for modal display
		scrollPosition = window.scrollY;
		const width = document.body.clientWidth;
		modalOpen = true;

		debug(`Locking body scroll at position ${scrollPosition}px, width ${width}px for Settings.`);
		document.body.style.position = 'fixed';
		document.body.style.top = `-${scrollPosition}px`;
		document.body.style.width = `${width}px`;
		document.body.style.overflow = 'hidden';
		// document.body.style.height = '100%';

		// Show the settings modal directly (it's rendered by Svelte now)
		// Need to ensure the component is rendered before finding the element
		// Use a reactive variable or wait a tick if necessary
		// Assuming SettingsModal component renders a <dialog id="settings_modal">
		// Wait a tick for Svelte to render the component if it was just loaded
		await new Promise(resolve => setTimeout(resolve, 0));

		const modal = document.getElementById('settings_modal');
		if (modal) {
			debug('Found settings_modal element.');
			// If the modal is already open (e.g., double click), maybe close it? Or do nothing.
			if (modal.hasAttribute('open')) {
				debug('Settings modal is already open. Closing it instead.');
				modal.close(); // Let the component handle its internal state
				closeModal(); // Restore scroll etc.
				return;
			}

			// Dispatch a custom event that can be caught in the SettingsModal component if needed
			// const event = new Event('beforeshow');
			// modal.dispatchEvent(event);
			// debug('Dispatched beforeshow event to settings_modal.');

			// Show the modal
			if (typeof modal.showModal === 'function') {
				modal.showModal();
				debug('Called showModal() for settings_modal.');
			} else {
				debug('settings_modal does not have showModal method.');
			}
		} else {
			debug('settings_modal element not found after lazy load and tick.');
			// If modal not found, need to restore scroll
			closeModal(); // Call cleanup
		}
	}

	// Function to close the Settings modal (called from SettingsModal component)
	function closeSettingsModal() {
		debug('closeSettingsModal called (likely from component event)');
		// Close modal and restore scroll using the shared function
		closeModal();
	}

	// Centralized function to close any modal and restore scroll
	function closeModal() {
		if (!modalOpen) {
			// debug('closeModal called but no modal was tracked as open.');
			return; // Avoid unnecessary operations
		}
		debug('closeModal called. Restoring body scroll and closing dialogs.');

		// Ensure any open dialogs are properly closed using their method
		document.querySelectorAll('dialog[open]').forEach(dialog => {
			if (dialog && typeof dialog.close === 'function') {
				debug(`Closing dialog: #${dialog.id || 'unknown'}`);
				dialog.close();
			}
		});

		// Restore body styles reliably
		document.body.style.position = '';
		document.body.style.top = '';
		document.body.style.width = '';
		document.body.style.overflow = '';
		document.body.style.height = ''; // Ensure height is cleared too

		// Remove any potentially problematic classes added by libraries (like DaisyUI)
		// document.body.classList.remove('overflow-hidden', 'fixed', 'modal-open');
		// It's safer to reset styles directly as above.

		// Restore scroll position AFTER resetting styles
		window.scrollTo(0, scrollPosition);
		debug(`Restored scroll position to ${scrollPosition}px.`);

		modalOpen = false; // Mark modal as closed
	}


	// Function is no longer needed with DaisyUI modal
	// Keeping a minimal version to maintain existing references
	function closeIntroModal() {
		debug('closeIntroModal called (likely from button click)');
		markIntroAsSeen();
		// closeModal(); // Let the dialog's form method handle closing, closeModal handles scroll restoration
	}

	// --- PWA Install Prompt Logic ---
	/**
	 * Handles the transcriptionCompleted event from AudioToText.
	 * Checks if conditions are met to show the PWA install prompt.
	 * @param {CustomEvent<{count: number}>} event
	 */
	async function handleTranscriptionCompleted(event) {
		if (!browser) return;

		const newCount = event.detail.count;
		debug(`🔔 Transcription completed event received. Count: ${newCount}`);

		// Check if the app is already installed (standalone mode)
		const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

		// Check if we should show the prompt
		if (
			newCount >= PWA_INSTALL_PROMPT_THRESHOLD &&
			deferredInstallPrompt &&
			!isStandalone &&
			!showPwaInstallPrompt // Don't show if already showing
		) {
			debug('⭐ Conditions met for showing PWA install prompt.');

			// Lazy load the PWA install prompt component if needed
			if (!PwaInstallPrompt && !loadingPwaPrompt) {
				loadingPwaPrompt = true;
				debug('📱 Lazy loading PWA install prompt component...');

				try {
					// Import the component dynamically
					const module = await import('$lib/components/pwa/PwaInstallPrompt.svelte');
					PwaInstallPrompt = module.default;
					debug('📱 PWA install prompt component loaded successfully');
				} catch (err) {
					console.error('Error loading PWA install prompt:', err);
					debug(`Error loading PWA install prompt: ${err.message}`);
					loadingPwaPrompt = false;
					return; // Don't proceed if loading failed
				} finally {
					loadingPwaPrompt = false; // Ensure this is always reset
				}
			}

			// Show the prompt by setting the reactive variable
			debug('Setting showPwaInstallPrompt = true');
			showPwaInstallPrompt = true;
		} else {
			debug('Conditions not met for PWA prompt:', {
				count: newCount,
				threshold: PWA_INSTALL_PROMPT_THRESHOLD,
				promptAvailable: !!deferredInstallPrompt,
				isStandalone: isStandalone,
				alreadyShowing: showPwaInstallPrompt
			});
		}
	}

	/**
	 * Closes the PWA install prompt.
	 */
	function closePwaInstallPrompt() {
		debug('ℹ️ PWA install prompt dismissed.');
		showPwaInstallPrompt = false;
		// Optionally, store preference to not show again for a while
		// localStorage.setItem('talktype-pwa-prompt-dismissed', Date.now().toString());
	}
	// --- End PWA Install Prompt Logic ---

</script>

<svelte:head>
	<title>TalkType | Spooky Good Voice-to-Text</title>
	<meta name="description" content="TalkType turns your voice into text. Clean, simple, and freaky fast voice typing. Free forever. Tap the ghost and start talking!" />
	<!-- Add other meta tags like Open Graph, Twitter Cards etc. here -->
	<link rel="preload" href="/assets/talktype-icon-base.svg" as="image">
	<link rel="preload" href="/assets/talktype-icon-eyes.svg" as="image">
	<link rel="preload" href="/talktype-icon-bg-gradient.svg" as="image">
	<!-- Preload other theme gradients if desired -->
	<!-- <link rel="preload" href="/talktype-icon-bg-gradient-mint.svg" as="image"> -->
	<!-- <link rel="preload" href="/talktype-icon-bg-gradient-bubblegum.svg" as="image"> -->
	<!-- <link rel="preload" href="/talktype-icon-bg-gradient-rainbow.svg" as="image"> -->
</svelte:head>


<section
	class="bg-gradient-mesh flex min-h-screen flex-col items-center justify-center px-4 py-8 pb-28 pt-[10vh] font-sans text-black antialiased sm:px-6 md:px-10 md:pt-[8vh] lg:py-12 lg:pb-32"
>
	<div
		class="mx-auto flex w-full max-w-md flex-col items-center pt-4 sm:max-w-lg md:max-w-2xl lg:max-w-3xl"
	>
		<!-- Ghost Icon - Mobile: tight, Desktop: chunky -->
		<!-- Ensure tabindex="0" for keyboard focusability if needed, though button element handles this -->
		<button
				bind:this={iconContainer}
				class="icon-container mb-4 h-36 w-36 cursor-pointer sm:h-40 sm:w-40 md:mb-0 md:h-56 md:w-56 lg:h-64 lg:w-64 appearance-none border-0 bg-transparent p-0 focus:outline-none focus-visible:outline-none"
				style="outline: none; -webkit-tap-highlight-color: transparent;"
				on:click={startRecordingFromGhost}
				on:keydown={(e) => {
					// Trigger on Enter or Spacebar
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault(); // Prevent page scroll on Spacebar
						startRecordingFromGhost(e);
					}
				}}
				aria-label="Toggle Recording"
				aria-pressed={isRecording.toString()}
		>
			<!-- Layered approach with gradient background and blinking eyes -->
			<div class="icon-layers">
				<!-- Gradient background (bottom layer) - load based on data-theme -->
				{#if browser}
					<!-- Use a variable to hold the theme for cleaner code -->
					{@const currentTheme = document.documentElement.getAttribute('data-theme') || 'peach'}
					{@const bgImageSrc =
						currentTheme === 'mint' ? '/talktype-icon-bg-gradient-mint.svg' :
						currentTheme === 'bubblegum' ? '/talktype-icon-bg-gradient-bubblegum.svg' :
						currentTheme === 'rainbow' ? '/talktype-icon-bg-gradient-rainbow.svg' :
						'/talktype-icon-bg-gradient.svg'
					}
					{@const bgImageClass = currentTheme === 'rainbow' ? 'icon-bg rainbow-animated' : 'icon-bg'}
					<img
						bind:this={iconBgElement}
						src={bgImageSrc}
						class={bgImageClass}
						alt=""
						aria-hidden="true"
						loading="lazy"
					/>
				{:else}
					<!-- Fallback for SSR or if browser check fails -->
					<img bind:this={iconBgElement} src="/talktype-icon-bg-gradient.svg" alt="" class="icon-bg" aria-hidden="true" loading="lazy" />
				{/if}
				<!-- Outline without eyes (middle layer) -->
				<img src="/assets/talktype-icon-base.svg" alt="" class="icon-base" aria-hidden="true" loading="lazy" />
				<!-- Just the eyes (top layer - for blinking) -->
				<img bind:this={eyesElement} src="/assets/talktype-icon-eyes.svg" alt="TalkType Ghost Icon Eyes" class="icon-eyes" loading="lazy" />
			</div>
		</button>

		<!-- Typography with improved kerning and weight using font-variation-settings -->
		<h1
			class="staggered-text mb-2 text-center text-5xl font-black tracking-tight cursor-default select-none sm:mb-2 sm:text-6xl md:mb-2 md:text-7xl lg:text-8xl xl:text-9xl"
			style="font-weight: 900; letter-spacing: -0.02em; font-feature-settings: 'kern' 1; font-kerning: normal; font-variation-settings: 'wght' 900, 'opsz' 32;"
			aria-label="TalkType"
		>
			<!-- Use aria-hidden for spans if H1 has aria-label -->
			<span class="stagger-letter mr-[-0.06em]" aria-hidden="true">T</span><span class="stagger-letter ml-[-0.04em]" aria-hidden="true">a</span><span
				class="stagger-letter" aria-hidden="true">l</span
			><span class="stagger-letter" aria-hidden="true">k</span><span class="stagger-letter mr-[-0.04em]" aria-hidden="true">T</span><span
				class="stagger-letter ml-[-0.03em]" aria-hidden="true">y</span
			><span class="stagger-letter" aria-hidden="true">p</span><span class="stagger-letter" aria-hidden="true">e</span>
		</h1>

		<!-- Updated subheadline with improved typography and brand voice -->
		<p
			class="slide-in-subtitle mx-auto mt-2 mb-4 max-w-prose text-xl text-center text-gray-700/85 cursor-default select-none sm:mt-6 sm:mb-8 md:mt-6 md:mb-8"
			style="font-weight: 400; letter-spacing: 0.015em; line-height: 1.6; max-width: 35ch; font-variation-settings: 'wght' 400, 'opsz' 16;"
		>
			Voice-to-text that doesn't suck. Spooky good, freaky fast, always free.
		</p>

		<!-- Audio component - Wider container for better transcript layout -->
		<div class="w-full max-w-xl mt-4 sm:mt-0 sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
			<AudioToText
				bind:this={audioToTextComponent}
				parentEyesElement={eyesElement}
				parentGhostIconElement={iconContainer}
				isModelPreloaded={speechModelPreloaded}
				onPreloadRequest={preloadSpeechModel}
				on:transcriptionCompleted={handleTranscriptionCompleted}
			/>
		</div>
	</div>

	<!-- Footer section with attribution and Chrome extension info -->
	<footer
		class="fixed bottom-0 left-0 right-0 border-t border-pink-200/80 bg-gradient-to-r from-[#fff6e6]/90 via-[#ffead8]/90 to-[#fff1df]/90 px-4 py-4 text-center text-xs text-gray-600 shadow-[0_-4px_15px_rgba(249,168,212,0.3)] backdrop-blur-[3px] sm:py-5 box-border z-10"
	>
		<div class="container mx-auto flex flex-col items-center justify-between gap-2 sm:gap-3 sm:flex-row flex-wrap">
			<div class="copyright flex items-center flex-wrap justify-center">
				<span class="mr-1 text-sm font-medium tracking-tight sm:text-sm text-xs">
					© {new Date().getFullYear()} TalkType
				</span>
				<span class="mx-1 sm:mx-2 text-pink-300">•</span>
				<span class="font-light text-gray-600 text-xs sm:text-sm"
					>Made with
					<span
						class="mx-0.5 inline-block transform animate-pulse text-pink-500 transition-transform duration-300 hover:scale-110"
						aria-label="love"
						>❤️</span
					>
					by Dennis & Pablo
				</span>
			</div>
			<div class="flex items-center gap-3 sm:gap-4">
				<button
						class="btn btn-sm btn-ghost text-gray-600 hover:text-pink-500 shadow-none hover:bg-pink-50/50 transition-all text-xs sm:text-sm py-2 px-3 sm:px-4 sm:py-2.5 h-auto min-h-0"
						on:click={showAboutModal}
						aria-label="About TalkType"
					>
					About
				</button>
				<button
						class="btn btn-sm btn-ghost text-gray-600 hover:text-pink-500 shadow-none hover:bg-pink-50/50 transition-all text-xs sm:text-sm py-2 px-3 sm:px-4 sm:py-2.5 h-auto min-h-0"
						on:click={openSettingsModal}
						aria-label="Open Settings"
					>
					Settings
				</button>
				<button
						class="btn btn-sm bg-gradient-to-r from-pink-50 to-purple-100 text-purple-600 border-none hover:bg-opacity-90 shadow-sm hover:shadow transition-all text-xs sm:text-sm py-2 px-3 sm:px-4 sm:py-2.5 h-auto min-h-0"
						on:click={showExtensionModal}
						aria-label="Chrome Extension Information"
					>
					Chrome Extension
				</button>
			</div>
		</div>
	</footer>

	<!-- Settings Modal - lazy loaded -->
	{#if SettingsModal}
		<!-- Pass the close function down to the component -->
		<svelte:component this={SettingsModal} on:close={closeSettingsModal} />
	{/if}

	<!-- First-time Intro Modal (DaisyUI version) -->
	<dialog id="intro_modal" class="modal modal-bottom sm:modal-middle" role="dialog" aria-labelledby="intro_modal_title" aria-modal="true">
		<!-- Modal content with clickOutside Svelte action for reliable backdrop clicking -->
		<!-- Removed clickOutside action as DaisyUI handles backdrop clicks via form method="dialog" on backdrop -->
		<div class="modal-box relative bg-[#fff9ed] rounded-3xl p-6 sm:p-8 md:p-10 w-[95%] max-w-[90vw] sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto border-0"
			style="box-shadow: 0 10px 25px -5px rgba(249, 168, 212, 0.3), 0 8px 10px -6px rgba(249, 168, 212, 0.2), 0 0 15px rgba(249, 168, 212, 0.15);">

			<!-- Close button -->
			<form method="dialog">
				<button class="btn btn-sm btn-circle absolute right-4 top-4 bg-[#fff9ed]/80 border-0 text-neutral-400 hover:bg-[#fff6e6] hover:text-neutral-700 shadow-sm" aria-label="Close Intro">✕</button>
			</form>

			<div class="space-y-5 sm:space-y-6 md:space-y-7 animate-fadeIn">
				<!-- Animated ghost icon -->
				<div class="flex justify-center mb-4">
					<div class="relative w-16 h-16 animate-pulse-slow">
						<img src="/talktype-icon-bg-gradient.svg" alt="" class="absolute inset-0 w-full h-full" loading="lazy" />
						<img src="/assets/talktype-icon-base.svg" alt="" class="absolute inset-0 w-full h-full" loading="lazy" />
						<img src="/assets/talktype-icon-eyes.svg" alt="" class="absolute inset-0 w-full h-full intro-eyes" loading="lazy" />
					</div>
				</div>

				<!-- Main heading - ultra chunky -->
				<h1 id="intro_modal_title" class="text-center text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-gray-900">
					TalkType's the best. <br> Kick out the rest.
				</h1>

				<!-- Main description - spacious and readable -->
				<div class="space-y-3 sm:space-y-4">
					<p class="text-sm sm:text-base md:text-lg font-medium text-gray-700 leading-relaxed">
						Clean, sweet, and stupidly easy.
					</p>

					<p class="text-sm sm:text-base md:text-lg font-medium text-gray-700 leading-relaxed">
						Tap the ghost to speak — we turn your voice into text.
					</p>

					<p class="text-sm sm:text-base md:text-lg font-medium text-gray-700 leading-relaxed">
						Use it anywhere. Save it to your home screen.
						Add the extension. Talk into any box on any site.
					</p>
				</div>

				<!-- Highlighted quote as clickable button -->
				<button
					class="w-full bg-gradient-to-r from-amber-100 to-amber-200 px-4 py-3 sm:px-5 sm:py-4 rounded-xl text-center text-sm sm:text-base md:text-lg text-gray-800 font-bold shadow-md border border-amber-300/50 hover:shadow-lg hover:bg-gradient-to-r hover:from-amber-200 hover:to-amber-300 hover:text-gray-900 active:scale-[0.98] transition-all duration-300 cursor-pointer relative"
					on:click={() => {
						debug('Intro modal quote button clicked');
						// First close the modal
						const modal = document.getElementById('intro_modal');
						if (modal) modal.close(); // Close the dialog
						markIntroAsSeen(); // Mark as seen

						// Then after a brief delay, start recording
						setTimeout(() => {
							debug('Triggering ghost click after intro modal close');
							const ghostBtn = document.querySelector('.icon-container');
							if (ghostBtn instanceof HTMLElement) {
								ghostBtn.click();
							} else {
								debug('Could not find ghost button to click after intro');
							}
						}, 300);
					}}
				>
					You click the ghost, we do the most.
				</button>

				<!-- Tagline -->
				<p class="text-center text-pink-600 font-bold text-base sm:text-lg md:text-xl py-2">
					It's fast, it's fun, it's freaky good.
				</p>

				<!-- Call to action button - extra chunky -->
				<form method="dialog">
					<button
						class="w-full text-base sm:text-lg font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-full bg-gradient-to-r from-yellow-400 to-pink-400 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
						on:click={markIntroAsSeen}
					>
						Let's Go! 🚀
					</button>
				</form>
			</div>
		</div>
		<!-- Modal backdrop - DaisyUI handles clicks via form method="dialog" -->
		<form method="dialog" class="modal-backdrop">
			<button>close</button>
		</form>
	</dialog>

	<!-- PWA Install Prompt -->
	{#if showPwaInstallPrompt && PwaInstallPrompt}
		<svelte:component
			this={PwaInstallPrompt}
			installPromptEvent={deferredInstallPrompt}
			on:closeprompt={closePwaInstallPrompt}
		/>
	{/if}

</section>

<style>
	/* Global styles */

	/* Intro modal animations */
	:global(.intro-eyes) {
		animation: intro-blink 3s infinite;
	}

	@keyframes intro-blink {
		0%, 30%, 33%, 69%, 100% {
			transform: scaleY(1);
		}
		31%, 32% {
			transform: scaleY(0);
		}
		70%, 71% {
			transform: scaleY(0);
		}
	}

	.animate-pulse-slow {
		animation: pulse-slow 3s ease-in-out infinite;
	}

	@keyframes pulse-slow {
		0%, 100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.05);
		}
	}

	.animate-modal-in {
		animation: modal-in 0.5s ease-out forwards;
	}

	.animate-modal-out {
		animation: modal-out 0.3s ease-in forwards;
	}

	@keyframes modal-in {
		0% {
			opacity: 0;
			transform: scale(0.95);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes modal-out {
		0% {
			opacity: 1;
			transform: scale(1);
		}
		100% {
			opacity: 0;
			transform: scale(0.95);
		}
	}

	/* Radial gradient support */
	.bg-gradient-radial {
		background-image: radial-gradient(circle at center, var(--tw-gradient-from), var(--tw-gradient-via), var(--tw-gradient-to));
	}

	/* Remove focus outline globally for simplicity, rely on other indicators */
	:global(*:focus) {
		outline: none !important;
	}
	:global(*:focus-visible) {
		outline: none !important; /* Also remove focus-visible */
	}


	/* Subtle cream background with just enough texture/noise */
	:global(.bg-gradient-mesh) {
		background-color: #fff6e6; /* More pronounced cream color */
		background-image: radial-gradient(
			circle at center,
			#fff6e6 0%,
			#fff6e6 50%,
			#fff3df 85%,
			#ffefda 100%
		);
		background-attachment: fixed;
	}

	.icon-container {
		filter: drop-shadow(0 0 8px rgba(255, 156, 243, 0.15));
		transition: all 0.8s cubic-bezier(0.19, 1, 0.22, 1);
		outline: none !important; /* Prevents the default browser outline */
		-webkit-tap-highlight-color: transparent; /* Removes tap highlight on mobile */
		-webkit-touch-callout: none; /* Disables callout */
		border: none !important; /* Ensures no border */
		animation: gentle-float 3s ease-in-out infinite;
		animation-delay: 2.5s; /* FIX #1: Delay float animation to avoid initial jump */
		transform: translateY(0); /* Ensure initial position is stable */
		/* Ensure it's focusable for accessibility if needed, but remove visual outline */
		/* tabindex="0" can be added if it's not inherently focusable like a button */
	}

	/* Remove focus outline and any other focus indicators */
	.icon-container:focus, .icon-container:active, .icon-container:focus-visible {
		outline: none !important;
		outline-offset: 0 !important;
		box-shadow: none !important; /* Remove potential focus box-shadow */
		border: none !important;
		/* Optionally add a subtle custom focus indicator if needed for accessibility */
		/* filter: drop-shadow(0 0 10px rgba(0, 100, 255, 0.5)); */
	}

	/* Layered icon styling */
	.icon-layers {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.icon-bg,
	.icon-base,
	.icon-eyes {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		transition: all 0.3s ease;
		user-select: none; /* Prevent image selection */
		-webkit-user-drag: none; /* Prevent image dragging */
	}

	/* Stack the layers correctly */
	.icon-bg {
		z-index: 1; /* Bottom layer */
	}

	.icon-base {
		z-index: 2; /* Middle layer */
	}

	.icon-eyes {
		z-index: 3; /* Top layer */
		/* NO ambient blink animation here - controlled by JS */
		transform-origin: center center; /* Squinch exactly in the middle */
	}

	/* "Thinking" animation when recording is active */
	.icon-container.recording .icon-eyes {
		/* Use a dedicated thinking animation or rely on programmatic blinks */
		/* animation: blink-thinking 4s infinite; */ /* Optional: Keep a subtle CSS thinking animation */
		transform-origin: center center; /* Squinch exactly in the middle */
	}

	/* Quick blink animation for programmatic use - faster (from best practices) */
	.icon-eyes.blink-once {
		/* Use !important carefully, ensure it doesn't conflict badly */
		animation: blink-once 0.18s forwards !important;
		transform-origin: center center;
	}

	@keyframes blink-once {
		0%, 100% { /* Start and end open */
			transform: scaleY(1);
			opacity: 1;
		}
		50% { /* Fully closed mid-way */
			transform: scaleY(0.15); /* FIX #2: Less extreme close, eyes still visible */
			opacity: 0.9; /* Slightly fade when closed */
		}
	}


	/* Special animation for when the ghost is thinking hard (transcribing) */
	/* This can still be triggered programmatically if needed */
	.icon-eyes.blink-thinking-hard {
		animation: blink-thinking-hard 1.5s infinite !important;
		transform-origin: center center;
	}

	@keyframes blink-thinking-hard {
		0%,
		10%,
		50%,
		60%,
		100% { /* Ensure it returns to normal */
			transform: scaleY(1);
		}
		12%,
		48% {
			transform: scaleY(0); /* Closed eyes - concentrating */
		}
		90% {
			transform: scaleY(0.2); /* Squinting - thinking hard */
		}
	}

	/* Removed old blink-thinking keyframes as it's complex and replaced by programmatic */

	.icon-container:hover,
	.icon-container:active {
		filter: drop-shadow(0 0 18px rgba(249, 168, 212, 0.45))
			drop-shadow(0 0 30px rgba(255, 156, 243, 0.3));
		/* Keep hover animation subtle */
		/* transform: scale(1.01); */
		/* Apply hover animation immediately, overriding the base delay */
		animation: gentle-float 3s ease-in-out infinite, ghost-hover 1.2s ease-in-out infinite alternate;
		animation-delay: 0s, 0s; /* Reset delay on hover */
	}

	.icon-container.recording {
		/* Apply recording glow animation and potentially stop float */
		animation: recording-glow 1.5s infinite;
		/* Keep scale consistent or slightly larger */
		transform: scale(1.03); /* Slightly larger when recording */
		animation-delay: 0s; /* Ensure recording glow starts immediately */
	}

	@media (min-width: 768px) {
		.icon-container {
			filter: drop-shadow(0 0 12px rgba(249, 168, 212, 0.25))
				drop-shadow(0 0 15px rgba(255, 156, 243, 0.15));
		}

		.icon-container:hover {
			filter: drop-shadow(0 0 25px rgba(249, 168, 212, 0.5))
				drop-shadow(0 0 35px rgba(255, 156, 243, 0.4));
		}
	}

	/* Removed gentle-pulse keyframes as gentle-float covers similar ground */

	/* Glowing animation for active recording state */
	@keyframes recording-glow {
		0% {
			filter: drop-shadow(0 0 15px rgba(255, 100, 243, 0.5))
				drop-shadow(0 0 25px rgba(249, 168, 212, 0.4));
		}
		50% {
			filter: drop-shadow(0 0 25px rgba(255, 100, 243, 0.8))
				drop-shadow(0 0 35px rgba(255, 120, 170, 0.5))
				drop-shadow(0 0 40px rgba(249, 168, 212, 0.4));
		}
		100% {
			filter: drop-shadow(0 0 15px rgba(255, 100, 243, 0.5))
				drop-shadow(0 0 25px rgba(249, 168, 212, 0.4));
		}
	}

	/* Ghost wobble animations */
	@keyframes ghost-wobble-left {
		0% { transform: rotate(0deg) scale(1); }
		25% { transform: rotate(-5deg) scale(1.02); }
		50% { transform: rotate(3deg) scale(1.01); }
		75% { transform: rotate(-2deg) scale(1.01); }
		100% { transform: rotate(0deg) scale(1); }
	}

	@keyframes ghost-wobble-right {
		0% { transform: rotate(0deg) scale(1); }
		25% { transform: rotate(5deg) scale(1.02); }
		50% { transform: rotate(-3deg) scale(1.01); }
		75% { transform: rotate(2deg) scale(1.01); }
		100% { transform: rotate(0deg) scale(1); }
	}

	/* Use :global only if absolutely necessary, prefer direct class targeting */
	.ghost-wobble-left {
		/* Use !important carefully, only if overriding other animations */
		animation: ghost-wobble-left 0.6s ease-in-out forwards !important;
	}

	.ghost-wobble-right {
		animation: ghost-wobble-right 0.6s ease-in-out forwards !important;
	}

	/* Staggered text animation for title - more reliable approach */
	.staggered-text {
		/* animation: none; */ /* Reset any existing animations */
		opacity: 1; /* Default to visible */
		font-feature-settings: "kern" 1; /* Enable kerning */
		font-kerning: normal; /* Normalize kerning */
		-webkit-font-smoothing: antialiased; /* Improve text rendering */
		-moz-osx-font-smoothing: grayscale; /* Improve text rendering */
	}

	.stagger-letter {
		display: inline-block;
		opacity: 0;
		transform: translateY(15px);
		animation: staggerFadeIn 0.6s cubic-bezier(0.19, 1, 0.22, 1) forwards;
		will-change: transform, opacity;
	}

	/* Apply different delays to each letter */
	.stagger-letter:nth-child(1) { animation-delay: 0.05s; }
	.stagger-letter:nth-child(2) { animation-delay: 0.1s; }
	.stagger-letter:nth-child(3) { animation-delay: 0.15s; }
	.stagger-letter:nth-child(4) { animation-delay: 0.2s; }
	.stagger-letter:nth-child(5) { animation-delay: 0.25s; }
	.stagger-letter:nth-child(6) { animation-delay: 0.3s; }
	.stagger-letter:nth-child(7) { animation-delay: 0.35s; }
	.stagger-letter:nth-child(8) { animation-delay: 0.4s; }

	@keyframes staggerFadeIn {
		0% {
			opacity: 0;
			transform: translateY(15px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Slide-in animation for subtitle - with hardware acceleration for performance */
	.slide-in-subtitle {
		opacity: 0;
		transform: translateY(10px);
		animation: slideIn 0.8s cubic-bezier(0.19, 1, 0.22, 1) forwards;
		animation-delay: 0.6s; /* Start before title animation completes */
		will-change: transform, opacity;
		backface-visibility: hidden;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		font-feature-settings: "kern" 1;
		font-kerning: normal;
		max-width: 40ch; /* Optimal reading width */
	}

	@keyframes slideIn {
		0% {
			opacity: 0;
			transform: translateY(10px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Title shimmer effect - keep if desired */
	.title-shimmer {
		position: relative;
		overflow: hidden;
	}

	.title-shimmer::after {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 50%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
		animation: shimmer 3s ease-out 2.5s; /* Delay start */
	}

	@keyframes shimmer {
		0% { left: -100%; }
		100% { left: 200%; }
	}

	/* Subtle hover effect for paragraphs */
	.subtle-hover {
		transition:
			color 0.3s ease,
			text-shadow 0.3s ease;
	}

	.subtle-hover:hover {
		color: #000;
		text-shadow: 0 0 1px rgba(0, 0, 0, 0.1);
	}

	/* Default cursor for non-editable text */
	.cursor-default {
		cursor: default;
	}

	/* Greeting wobble animation for ghost icon */
	@keyframes ghost-wobble-greeting {
		0% { transform: rotate(0deg) scale(1); }
		20% { transform: rotate(-3deg) scale(1.02); }
		40% { transform: rotate(2deg) scale(1.04); }
		60% { transform: rotate(-1deg) scale(1.02); }
		80% { transform: rotate(1deg) scale(1.01); }
		100% { transform: rotate(0deg) scale(1); }
	}

	.ghost-wobble-greeting {
		animation: ghost-wobble-greeting 1s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
		transform-origin: center center;
	}

	/* Title hover effect */
	.title-hover {
		transition: text-shadow 0.3s ease;
	}

	.title-hover:hover {
		text-shadow: 0 0 15px rgba(249, 168, 212, 0.6);
	}

	/* Subtitle hover effect */
	.subtitle-hover {
		transition:
			color 0.3s ease,
			text-shadow 0.3s ease;
	}

	.subtitle-hover:hover {
		color: #000;
		text-shadow: 0 0 8px rgba(249, 168, 212, 0.3);
	}

	/* CTA button hover effect */
	button.rounded-full {
		transition: all 0.3s ease;
	}

	button.rounded-full:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	/* TalkType Logo Typography Fixes - Simplified and Stabilized */
	/* These seem to be applied via inline styles now, so CSS might be redundant */
	/* .talktype-logo { ... } */
	/* .talktype-logo:hover { ... } */
	/* .talktype-logo .letter-t1 { ... } */
	/* ... etc ... */


	/* Animation for intro modal content */
	@keyframes fadeIn {
		0% {
			opacity: 0;
			transform: translateY(8px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-fadeIn {
		animation: fadeIn 0.5s ease-out forwards;
	}

	/* Gentle floating animation for ghost icon */
	@keyframes gentle-float {
		0%, 10%, 90%, 100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-3px); /* Reduced movement for subtlety */
		}
	}

	/* Hover animation combined with float */
	@keyframes ghost-hover {
		0% {
			transform: scale(1.005) translateY(0); /* Match float start */
		}
		100% {
			transform: scale(1.015) translateY(-3px); /* Subtle lift */
		}
	}

	/* Rainbow animation for ghost svg with sparkle effect (from best practices) */
	.rainbow-animated {
		animation: rainbowFlow 7s linear infinite;
		filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.6));
		transform-origin: center center; /* Added transform-origin */
	}

	/* Special rainbow sparkle effect when hovered (from best practices) */
	.icon-container:hover .rainbow-animated {
		animation: rainbowFlow 4.5s linear infinite, sparkle 2s ease-in-out infinite;
		filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
	}

	/* New rainbowFlow keyframes using filter (from best practices) */
	@keyframes rainbowFlow {
		0% { filter: hue-rotate(0deg) saturate(1.4) brightness(1.15); }
		100% { filter: hue-rotate(360deg) saturate(1.5) brightness(1.2); }
	}

	/* New sparkle keyframes (from best practices) */
	@keyframes sparkle {
		0%, 100% { filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.7)) drop-shadow(0 0 8px rgba(255, 61, 127, 0.6)); }
		25% { filter: drop-shadow(0 0 6px rgba(255, 141, 60, 0.8)) drop-shadow(0 0 10px rgba(255, 249, 73, 0.7)); }
		50% { filter: drop-shadow(0 0 6px rgba(77, 255, 96, 0.7)) drop-shadow(0 0 9px rgba(53, 222, 255, 0.7)); }
		75% { filter: drop-shadow(0 0 7px rgba(159, 122, 255, 0.8)) drop-shadow(0 0 9px rgba(255, 61, 127, 0.6)); }
	}

	/* Removed old hueShift keyframes */

	/* Theme-based visualizer styling using data-theme attribute */
	/* Ensure this targets the correct element within AudioToText component if needed */
	:global([data-theme="rainbow"] .history-bar) {
		animation: rainbowFlow 7s linear infinite, rainbowBars 3s ease-in-out infinite;
		background-image: linear-gradient(to top, #FF3D7F, #FF8D3C, #FFF949, #4DFF60, #35DEFF, #9F7AFF, #FF3D7F);
		background-size: 100% 600%;
		box-shadow: 0 0 10px rgba(255, 255, 255, 0.15), 0 0 20px rgba(255, 61, 127, 0.1);
	}

	/* Special animation for rainbow bars */
	@keyframes rainbowBars {
		0%, 100% { filter: drop-shadow(0 0 3px rgba(255, 61, 127, 0.3)); }
		33% { filter: drop-shadow(0 0 4px rgba(255, 249, 73, 0.4)); }
		66% { filter: drop-shadow(0 0 4px rgba(53, 222, 255, 0.4)); }
	}

	/* Media queries for mobile optimization */
	@media (max-width: 640px) {
		section {
			padding-top: 8vh !important;
			min-height: 100vh; /* Ensure it takes full height */
			display: flex;
			flex-direction: column;
			justify-content: flex-start; /* Align content to top */
		}

		.icon-container {
			height: 9rem !important; /* 144px */
			width: 9rem !important; /* 144px */
			margin-bottom: 1rem !important; /* 16px */
		}

		h1.staggered-text {
			font-size: 3rem; /* Adjust title size for smaller screens */
			line-height: 1.1;
		}

		.slide-in-subtitle {
			max-width: 28ch !important;
			margin-top: 0.5rem !important; /* 8px */
			margin-bottom: 1rem !important; /* 16px */
			font-size: 1.125rem; /* Adjust subtitle size */
		}

		/* Adjust spacing for the AudioToText component container */
		.w-full.max-w-xl { /* Target the container div */
			margin-top: 1rem !important; /* Add some space above audio component */
		}


		footer {
			padding-top: 0.75rem; /* 12px */
			padding-bottom: 0.75rem; /* 12px */
		}

		footer .container {
			gap: 0.5rem; /* Reduce gap in footer */
		}

		footer button {
			min-height: 2.25rem; /* 36px */
			padding: 0.375rem 0.75rem; /* Adjust padding */
			font-size: 0.75rem; /* Smaller text */
		}
	}

	/* DaisyUI Modal Adjustments */
	:global(dialog.modal) {
		/* Ensure modals don't prevent background interaction if needed, though usually desired */
		/* pointer-events: none; */
	}
	:global(dialog.modal[open]) {
		/* pointer-events: auto; */
	}
	:global(dialog.modal .modal-box) {
		/* pointer-events: auto; */ /* Ensure box is interactive */
		max-height: 90vh; /* Prevent overly tall modals */
		overflow-y: auto; /* Allow scrolling within the box */
	}
	:global(dialog.modal .modal-backdrop) {
		/* Ensure backdrop covers screen and has correct background */
		background-color: rgba(0, 0, 0, 0.4);
		/* pointer-events: auto; */ /* Allow backdrop clicks if using form method */
	}

</style>
