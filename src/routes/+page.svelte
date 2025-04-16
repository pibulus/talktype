<!-- This content is replaced with improved version using the Replace tool -->
<script context="module">
	let showExtensionInfo = false;
	let showAboutInfo = false;
	let showSettingsModal = false;
</script>

<script>
	import { onMount } from 'svelte';
	import AudioToText from '$lib/components/AudioToText.svelte';
	import SettingsModal from '$lib/components/settings/SettingsModal.svelte';
	import { browser } from '$app/environment';
	
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

	// Brian Eno-inspired ambient blinking system with proper state tracking
	let blinkTimeouts = [];
	let isRecording = false;
	let eyesElement = null;
	let iconBgElement = null; // Reference to the background gradient
	let iconContainer = null; // Reference to the icon container
	let domReady = false;

	// Debug Helper that won't pollute console in production but helps during development
	function debug(message) {
		console.log(`[Ghost Eyes] ${message}`);
	}

	// Animation state variables
	let titleAnimationComplete = false;
	let subtitleAnimationComplete = false;

	// Get eyes element safely - now using bind:this
	function getEyesElement() {
		if (eyesElement) return eyesElement;
		debug('Eyes element not found yet');
		return null;
	}

	// Single blink using CSS classes
	function performSingleBlink() {
		const eyes = getEyesElement();
		if (!eyes) return;

		debug('Performing single blink');

		// Add class then remove it after animation completes
		eyes.classList.add('blink-once');

		const timeout = setTimeout(() => {
			eyes.classList.remove('blink-once');
		}, 400);

		blinkTimeouts.push(timeout);
	}

	// Double blink using CSS classes and timeouts
	function performDoubleBlink() {
		const eyes = getEyesElement();
		if (!eyes) return;

		debug('Performing double blink');

		// First blink
		eyes.classList.add('blink-once');

		const timeout1 = setTimeout(() => {
			eyes.classList.remove('blink-once');

			// Short pause between blinks
			const timeout2 = setTimeout(() => {
				// Second blink
				eyes.classList.add('blink-once');

				const timeout3 = setTimeout(() => {
					eyes.classList.remove('blink-once');
				}, 300);

				blinkTimeouts.push(timeout3);
			}, 180);

			blinkTimeouts.push(timeout2);
		}, 300);

		blinkTimeouts.push(timeout1);
	}

	// Triple blink pattern
	function performTripleBlink() {
		const eyes = getEyesElement();
		if (!eyes) return;

		debug('Performing triple blink');

		// First blink
		eyes.classList.add('blink-once');

		const timeout1 = setTimeout(() => {
			eyes.classList.remove('blink-once');

			// Short pause between blinks
			const timeout2 = setTimeout(() => {
				// Second blink
				eyes.classList.add('blink-once');

				const timeout3 = setTimeout(() => {
					eyes.classList.remove('blink-once');

					// Another short pause
					const timeout4 = setTimeout(() => {
						// Third blink
						eyes.classList.add('blink-once');

						const timeout5 = setTimeout(() => {
							eyes.classList.remove('blink-once');
						}, 250);

						blinkTimeouts.push(timeout5);
					}, 150);

					blinkTimeouts.push(timeout4);
				}, 250);

				blinkTimeouts.push(timeout3);
			}, 150);

			blinkTimeouts.push(timeout2);
		}, 250);

		blinkTimeouts.push(timeout1);
	}

	// Generative ambient blinking system - Brian Eno style
	function startAmbientBlinking() {
		debug('Starting ambient blinking system');

		if (!domReady) {
			debug('DOM not ready, delaying ambient blinking');
			setTimeout(startAmbientBlinking, 500);
			return;
		}

		const eyes = getEyesElement();
		if (!eyes) {
			debug('Eyes element not found, delaying ambient blinking');
			setTimeout(startAmbientBlinking, 500);
			return;
		}

		// Clear any existing timeouts to avoid conflicts
		clearAllBlinkTimeouts();

		// Don't run ambient blinks if recording
		if (isRecording) {
			debug('Recording active, skipping ambient blinks');
			return;
		}

		// Parameters for generative system - Brian Eno style (more frequent now)
		const minGap = 4000; // Minimum time between blinks (4s - was 7s)
		const maxGap = 9000; // Maximum time between blinks (9s - was 16s)

		// Blink type probabilities
		const blinkTypes = [
			{ type: 'single', probability: 0.6 }, // 60%
			{ type: 'double', probability: 0.3 }, // 30%
			{ type: 'triple', probability: 0.1 } // 10%
		];

		// Schedule the next blink recursively
		function scheduleNextBlink() {
			// Random time interval with Brian Eno-like indeterminacy
			const nextInterval = Math.floor(minGap + Math.random() * (maxGap - minGap));

			debug(`Next blink in ${nextInterval}ms`);

			const timeout = setTimeout(() => {
				// Exit if we've switched to recording state
				if (isRecording) {
					debug('Recording active, skipping scheduled blink');
					return;
				}

				// Choose blink type based on probability distribution
				const rand = Math.random();
				let cumulativeProbability = 0;
				let selectedType = 'single'; // Default

				for (const blink of blinkTypes) {
					cumulativeProbability += blink.probability;
					if (rand <= cumulativeProbability) {
						selectedType = blink.type;
						break;
					}
				}

				debug(`Selected ${selectedType} blink`);

				// Execute the selected blink pattern
				if (selectedType === 'single') {
					performSingleBlink();
				} else if (selectedType === 'double') {
					performDoubleBlink();
				} else {
					performTripleBlink();
				}

				// Schedule the next blink
				scheduleNextBlink();
			}, nextInterval);

			blinkTimeouts.push(timeout);
		}

		// Start with a slight delay
		setTimeout(scheduleNextBlink, 1000);
	}

	// Helper function to clear all scheduled blinks
	function clearAllBlinkTimeouts() {
		debug(`Clearing ${blinkTimeouts.length} blink timeouts`);
		blinkTimeouts.forEach((timeout) => clearTimeout(timeout));
		blinkTimeouts = [];
	}

	// Greeting blink on page load
	function greetingBlink() {
		const eyes = getEyesElement();
		if (!eyes) {
			// Retry if eyes not found yet
			debug('Eyes not found for greeting, retrying');
			setTimeout(greetingBlink, 300);
			return;
		}

		debug('Performing greeting blink');

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
					iconContainer.classList.remove(wobbleClass);
				}, 1000);
			}, 1000); // Start the wobble after the text starts animating
		}

		// Do a friendly double-blink after animations complete
		setTimeout(() => {
			performDoubleBlink();

			// Start ambient blinking system after greeting
			setTimeout(startAmbientBlinking, 1000);
		}, 2000); // Delay long enough for text animations
	}

	// Domain Ready and Observer setup
	function setupDomObserver() {
		debug('Setting up DOM observer');

		// We now use bind:this instead of querySelector
		if (eyesElement) {
			debug('Eyes element found immediately');
			domReady = true;
			greetingBlink();
			return;
		}

		// If not found, set up observer to watch for it
		const observer = new MutationObserver((mutations, obs) => {
			if (eyesElement) {
				debug('Eyes element found via bind:this');
				domReady = true;
				greetingBlink();
				obs.disconnect(); // Stop observing once we've found it
			}
		});

		// Start observing
		observer.observe(document.body, {
			childList: true,
			subtree: true
		});

		// Fallback in case observer doesn't trigger
		setTimeout(() => {
			if (!domReady && eyesElement) {
				debug('Fallback DOM ready check');
				domReady = true;
				greetingBlink();
			}
		}, 1000);
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
		const hasSeenIntro = localStorage.getItem('hasSeenTalkTypeIntro');
		
		if (!hasSeenIntro) {
			// First visit, show intro modal after a brief delay
			setTimeout(() => {
				const modal = document.getElementById('intro_modal');
				if (modal) {
					console.log('Opening intro modal on first visit');
					modal.showModal();
					
					// Set up event listener to handle modal close event from any source
					modal.addEventListener('close', () => {
						console.log('Modal closed, marking intro as seen');
						markIntroAsSeen();
					});
				} else {
					console.error('Intro modal element not found');
				}
			}, 500);
		}
	}

	// Save that user has seen the intro
	function markIntroAsSeen() {
		if (!browser) return;
		localStorage.setItem('hasSeenTalkTypeIntro', 'true');
	}

	// Component lifecycle
	onMount(() => {
		debug('Component mounted');
		setupDomObserver();
		
		// Check for auto-record setting and start recording if enabled
		if (browser && localStorage.getItem('talktype-autoRecord') === 'true') {
			// Wait minimal time for component initialization
			setTimeout(() => {
				if (audioToTextComponent && !audioToTextComponent.recording) {
					debug('Auto-record enabled, starting recording immediately');
					
					// Make ghost do a quick animation and start recording immediately
					if (iconContainer) {
						// Start recording immediately with minimal animation
						if (eyesElement) {
							clearAllBlinkTimeouts(); // Clear any existing animations
							
							// Quick single blink and start recording immediately
							eyesElement.classList.add('blink-once');
							
							// Start recording immediately
							audioToTextComponent.startRecording();
							
							// Update UI state
							iconContainer.classList.add('recording');
							
							// Also update the local recording state variable
							isRecording = true;
							
							// Remove blink class after a short delay
							setTimeout(() => {
								eyesElement.classList.remove('blink-once');
							}, 100);
						} else {
							// Fallback if eyes element not found
							audioToTextComponent.startRecording();
							iconContainer.classList.add('recording');
							isRecording = true;
						}
					} else {
						// Fallback if ghost icon not found
						audioToTextComponent.startRecording();
						isRecording = true;
					}
				}
			}, 500); // Reduced delay - just enough for component initialization
		}
		
		// Listen for settings changes
		if (browser) {
			window.addEventListener('talktype-setting-changed', (event) => {
				if (event.detail && event.detail.setting === 'autoRecord') {
					debug('Auto-record setting changed:', event.detail.value);
					// No immediate action needed, setting will apply on next page load
				}
			});
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
				localStorage.setItem("talktype-vibe", "peach");
				document.documentElement.setAttribute('data-theme', 'peach');
			} else {
				// Apply theme to document element for consistent CSS targeting
				document.documentElement.setAttribute('data-theme', savedVibe);
			}
		}
		// We no longer need to call applyTheme here since theme is applied directly in the HTML
		// This prevents the flash of changing themes
		
		// For testing without localStorage, you can uncomment these lines
		// localStorage.removeItem('hasSeenTalkTypeIntro');
		// localStorage.removeItem('talktype-vibe');

		return () => {
			debug('Component unmounting, clearing timeouts');
			clearAllBlinkTimeouts();
		};
	});
	
	// Apply theme/vibe function for initial load
	function applyTheme(vibeId) {
		// Store in localStorage
		localStorage.setItem("talktype-vibe", vibeId);
		
		// Apply theme to document root for consistent CSS targeting
		document.documentElement.setAttribute('data-theme', vibeId);
		
		// Update ghost icon by swapping the SVG file
		if (iconBgElement) {
			// Set the appropriate gradient SVG based on theme
			switch(vibeId) {
				case 'mint':
					iconBgElement.src = '/talktype-icon-bg-gradient-mint.svg';
					iconBgElement.classList.remove('rainbow-animated');
					break;
				case 'bubblegum':
					iconBgElement.src = '/talktype-icon-bg-gradient-bubblegum.svg';
					iconBgElement.classList.remove('rainbow-animated');
					break;
				case 'rainbow':
					iconBgElement.src = '/talktype-icon-bg-gradient-rainbow.svg';
					iconBgElement.classList.add('rainbow-animated');
					break;
				default: // Default to peach
					iconBgElement.src = '/talktype-icon-bg-gradient.svg';
					iconBgElement.classList.remove('rainbow-animated');
					break;
			}
			
			// Force a reflow to ensure the gradient is visible
			void iconBgElement.offsetWidth;
		}
	}

	// Reliable recording toggle with ambient blinking support
	function startRecordingFromGhost(event) {
		// Stop event propagation to prevent bubbling
		event.stopPropagation();
		event.preventDefault();

		// Debug current state
		debug(`Ghost clicked! Recording state: ${audioToTextComponent?.recording}`);

		// Get DOM elements with error checking
		const currentIconContainer = event.currentTarget;
		if (!currentIconContainer) {
			debug('No icon container found during click handler');
			return;
		}

		const eyes = getEyesElement();
		if (!eyes) {
			debug('Eyes element not found during click handler');
			return;
		}

		if (!audioToTextComponent) {
			debug('No audioToTextComponent found');
			return;
		}

		// Use DOM class as source of truth (reliable)
		const hasRecordingClass = currentIconContainer.classList.contains('recording');
		debug(`DOM state: has 'recording' class = ${hasRecordingClass}`);

		if (hasRecordingClass) {
			// STOPPING RECORDING
			debug('Stopping recording');

			// Update recording state
			isRecording = false;

			// Reset all animation state
			eyes.style.animation = 'none';

			// Remove the recording class
			currentIconContainer.classList.remove('recording');

			// Add wobble animation when stopping from ghost click
			debug('Applying wobble animation to ghost icon on stop');
			// Force reflow to ensure animation applies
			void currentIconContainer.offsetWidth;

			// Clear any existing animation classes first
			currentIconContainer.classList.remove('ghost-wobble-left', 'ghost-wobble-right');

			const wobbleClass = Math.random() > 0.5 ? 'ghost-wobble-left' : 'ghost-wobble-right';
			debug(`Adding class: ${wobbleClass}`);
			currentIconContainer.classList.add(wobbleClass);
			console.log('Current classes:', currentIconContainer.className);
			setTimeout(() => {
				debug(`Removing class: ${wobbleClass}`);
				currentIconContainer.classList.remove(wobbleClass);
			}, 600);

			// Blink once to acknowledge stop
			setTimeout(() => {
				debug('Performing stop acknowledgment blink');
				performSingleBlink();

				// Resume ambient blinking after a pause
				setTimeout(() => {
					debug('Resuming ambient blinking');
					startAmbientBlinking();
				}, 1000);
			}, 100);

			// Stop the recording
			try {
				audioToTextComponent.stopRecording();
				debug('Called stopRecording() on component');
			} catch (err) {
				debug(`Error stopping recording: ${err.message}`);
			}
		} else {
			// STARTING RECORDING
			debug('Starting recording');

			// Update recording state and stop ambient system
			isRecording = true;
			clearAllBlinkTimeouts();

			// Reset any existing animations
			eyes.style.animation = 'none';

			// Add wobble animation when starting from ghost click
			debug('Applying wobble animation to ghost icon on start');
			// Force reflow to ensure animation applies
			void currentIconContainer.offsetWidth;

			// Clear any existing animation classes first
			currentIconContainer.classList.remove('ghost-wobble-left', 'ghost-wobble-right');

			const wobbleClass = Math.random() > 0.5 ? 'ghost-wobble-left' : 'ghost-wobble-right';
			debug(`Adding class: ${wobbleClass}`);
			currentIconContainer.classList.add(wobbleClass);
			console.log('Current classes:', currentIconContainer.className);
			setTimeout(() => {
				debug(`Removing class: ${wobbleClass}`);
				currentIconContainer.classList.remove(wobbleClass);
			}, 600);

			// Give a tiny delay to ensure animation reset
			setTimeout(() => {
				// Random chance for different start behaviors
				const startBehavior = Math.random();

				if (startBehavior < 0.7) {
					// 70% chance: Standard quick blink
					debug('Performing standard start blink');
					performSingleBlink();
				} else if (startBehavior < 0.9) {
					// 20% chance: Double blink (excited)
					debug('Performing excited double start blink');
					performDoubleBlink();
				} else {
					// 10% chance: Triple blink (super attentive)
					debug('Performing attentive triple start blink');
					performTripleBlink();
				}

				// Add recording class after the blink animation completes
				setTimeout(() => {
					debug('Adding recording class');
					currentIconContainer.classList.add('recording');
				}, 600);

				// Start recording
				try {
					audioToTextComponent.startRecording();
					debug('Called startRecording() on component');
				} catch (err) {
					debug(`Error stopping recording: ${err.message}`);
				}
			}, 50);
		}
	}

	// Function to show the About modal
	// Variables to track modal state and store scroll position
	let modalOpen = false;
	let scrollPosition = 0;

	function showAboutModal() {
		// Radical approach to prevent scrollbar issues
		scrollPosition = window.scrollY;
		const width = document.body.clientWidth;
		modalOpen = true;
		
		// Lock the body in place exactly where it was
		document.body.style.position = 'fixed';
		document.body.style.top = `-${scrollPosition}px`;
		document.body.style.width = `${width}px`;
		document.body.style.overflow = 'hidden';
		
		// Now show the modal
		const modal = document.getElementById('about_modal');
		if (modal) modal.showModal();
	}

	// Function to show the Extension modal
	function showExtensionModal() {
		// Radical approach to prevent scrollbar issues
		scrollPosition = window.scrollY;
		const width = document.body.clientWidth;
		modalOpen = true;
		
		// Lock the body in place exactly where it was
		document.body.style.position = 'fixed';
		document.body.style.top = `-${scrollPosition}px`;
		document.body.style.width = `${width}px`;
		document.body.style.overflow = 'hidden';
		
		// Now show the modal
		const modal = document.getElementById('extension_modal');
		if (modal) modal.showModal();
	}
	
	// Function to show the Settings modal
	function openSettingsModal() {
		// First, ensure any open dialogs are closed and scroll is restored
		if (modalOpen) {
			closeModal();
		}

		// Get current scroll position and body dimensions
		scrollPosition = window.scrollY;
		const width = document.body.clientWidth;
		modalOpen = true;
		
		// Lock the body in place exactly where it was
		document.body.style.position = 'fixed';
		document.body.style.top = `-${scrollPosition}px`;
		document.body.style.width = `${width}px`;
		document.body.style.overflow = 'hidden';
		document.body.style.height = '100%';
		
		// Show the settings modal directly
		const modal = document.getElementById('settings_modal');
		if (modal) {
			// If the modal is already open, just close it
			if (modal.hasAttribute('open')) {
				modal.close();
				setTimeout(() => {
					closeModal();
				}, 50);
				return;
			}
			
			// Dispatch a custom event that will be caught in the SettingsModal component
			const event = new Event('beforeshow');
			modal.dispatchEvent(event);
			
			// Show the modal
			modal.showModal();
		}
	}
	
	// Function to close the Settings modal
	function closeSettingsModal() {
		// Close modal and restore scroll
		closeModal();
	}
	
	// Function to restore scroll position when modal closes
	function closeModal() {
		if (!modalOpen) return;
		
		// Ensure any open dialogs are properly closed
		document.querySelectorAll('dialog[open]').forEach(dialog => {
			if (dialog && typeof dialog.close === 'function') {
				dialog.close();
			}
		});
		
		// Restore body styles
		document.body.style.position = '';
		document.body.style.top = '';
		document.body.style.width = '';
		document.body.style.overflow = '';
		document.body.style.height = '';
		
		// Remove any potentially problematic classes
		document.body.classList.remove('overflow-hidden', 'fixed', 'modal-open');
		
		// Restore scroll position
		window.scrollTo(0, scrollPosition);
		modalOpen = false;
	}
	
	// Function is no longer needed with DaisyUI modal
	// Keeping a minimal version to maintain existing references
	function closeIntroModal() {
		markIntroAsSeen();
	}
</script>

<section
	class="bg-gradient-mesh flex min-h-screen flex-col items-center justify-center px-4 py-8 pb-28 pt-[10vh] font-sans text-black antialiased sm:px-6 md:px-10 md:pt-[8vh] lg:py-12 lg:pb-32"
>
	<div
		class="mx-auto flex w-full max-w-md flex-col items-center pt-4 sm:max-w-lg md:max-w-2xl lg:max-w-3xl"
	>
		<!-- Ghost Icon - Mobile: tight, Desktop: chunky -->
		<button
				bind:this={iconContainer}
				class="icon-container mb-4 h-36 w-36 cursor-pointer sm:h-40 sm:w-40 md:mb-0 md:h-56 md:w-56 lg:h-64 lg:w-64 appearance-none border-0 bg-transparent p-0"
				style="outline: none; -webkit-tap-highlight-color: transparent;"
				on:click|preventDefault|stopPropagation={startRecordingFromGhost}
				on:keydown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						startRecordingFromGhost(e);
					}
				}}
				aria-label="Toggle Recording"
				aria-pressed={isRecording}
		>
			<!-- Layered approach with gradient background and blinking eyes -->
			<div class="icon-layers">
				<!-- Gradient background (bottom layer) - load based on data-theme -->
				{#if browser}
					<img 
						bind:this={iconBgElement}
						src={document.documentElement.getAttribute('data-theme') === 'mint' ? '/talktype-icon-bg-gradient-mint.svg' : 
							document.documentElement.getAttribute('data-theme') === 'bubblegum' ? '/talktype-icon-bg-gradient-bubblegum.svg' :
							document.documentElement.getAttribute('data-theme') === 'rainbow' ? '/talktype-icon-bg-gradient-rainbow.svg' :
							'/talktype-icon-bg-gradient.svg'} 
						class={document.documentElement.getAttribute('data-theme') === 'rainbow' ? 'icon-bg rainbow-animated' : 'icon-bg'} 
						alt="" 
						aria-hidden="true" 
					/>
				{:else}
					<img bind:this={iconBgElement} src="/talktype-icon-bg-gradient.svg" alt="" class="icon-bg" aria-hidden="true" />
				{/if}
				<!-- Outline without eyes (middle layer) -->
				<img src="/assets/talktype-icon-base.svg" alt="" class="icon-base" aria-hidden="true" />
				<!-- Just the eyes (top layer - for blinking) -->
				<img bind:this={eyesElement} src="/assets/talktype-icon-eyes.svg" alt="TalkType Ghost Icon" class="icon-eyes" />
			</div>
		</button>

		<!-- Typography with improved kerning and weight using font-variation-settings -->
		<h1
			class="staggered-text mb-2 text-center text-5xl font-black tracking-tight cursor-default select-none sm:mb-2 sm:text-6xl md:mb-2 md:text-7xl lg:text-8xl xl:text-9xl"
			style="font-weight: 900; letter-spacing: -0.02em; font-feature-settings: 'kern' 1; font-kerning: normal; font-variation-settings: 'wght' 900, 'opsz' 32;"
		>
			<span class="stagger-letter mr-[-0.06em]">T</span><span class="stagger-letter ml-[-0.04em]">a</span><span
				class="stagger-letter">l</span
			><span class="stagger-letter">k</span><span class="stagger-letter mr-[-0.04em]">T</span><span
				class="stagger-letter ml-[-0.03em]">y</span
			><span class="stagger-letter">p</span><span class="stagger-letter">e</span>
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
			/>
		</div>
	</div>

	<!-- Footer section with attribution and Chrome extension info -->
	<footer
		class="fixed bottom-0 left-0 right-0 border-t border-pink-200/80 bg-gradient-to-r from-[#fefaf4] via-[#fde4da] to-[#fdf7ef] px-4 py-4 text-center text-xs text-gray-600 shadow-[0_-4px_15px_rgba(249,168,212,0.3)] backdrop-blur-[2px] sm:py-5 box-border"
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
						>❤️</span
					>
					by Dennis & Pablo
				</span>
			</div>
			<div class="flex items-center gap-3 sm:gap-4">
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

	<!-- DaisyUI About Modal -->
	<dialog id="about_modal" class="modal modal-bottom sm:modal-middle overflow-hidden fixed z-50" style="overflow-y: hidden!important;" role="dialog" aria-labelledby="about_modal_title" aria-modal="true">
		<div class="modal-box bg-gradient-to-br from-white to-[#fefaf4] shadow-xl border border-pink-200 rounded-2xl overflow-y-auto max-h-[80vh]">
			<form method="dialog">
				<button 
					class="btn btn-sm btn-circle absolute right-3 top-3 bg-pink-100 border-pink-200 text-pink-500 hover:bg-pink-200 hover:text-pink-700 shadow-sm"
					on:click={closeModal}
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
				
				<div class="bg-gradient-to-r from-pink-50/80 to-amber-50/80 p-4 rounded-lg border border-pink-200/60 shadow-sm">
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
		<div class="modal-backdrop bg-black/40" on:click|self|preventDefault|stopPropagation={() => {
			document.getElementById('about_modal').close();
			// Use the closeModal function to restore scrolling properly
			setTimeout(closeModal, 50);
		}}></div>
	</dialog>

	<!-- DaisyUI Extension Modal -->
	<dialog id="extension_modal" class="modal modal-bottom sm:modal-middle overflow-hidden fixed z-50" style="overflow-y: hidden!important;" role="dialog" aria-labelledby="extension_modal_title" aria-modal="true">
		<div class="modal-box bg-gradient-to-br from-white to-[#fefaf4] shadow-xl border border-pink-200 rounded-2xl overflow-y-auto max-h-[80vh]">
			<form method="dialog">
				<button 
					class="btn btn-sm btn-circle absolute right-3 top-3 bg-pink-100 border-pink-200 text-pink-500 hover:bg-pink-200 hover:text-pink-700 shadow-sm"
					on:click={closeModal}
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
				
				<div class="bg-gradient-to-r from-pink-50/80 to-amber-50/80 p-4 rounded-lg border border-pink-200/60 shadow-sm">
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
		<div class="modal-backdrop bg-black/40" on:click|self|preventDefault|stopPropagation={() => {
			document.getElementById('extension_modal').close();
			// Use the closeModal function to restore scrolling properly
			setTimeout(closeModal, 50);
		}}></div>
	</dialog>
	
	<!-- Settings Modal -->
	<SettingsModal open={showSettingsModal} closeModal={closeSettingsModal} />
	
	<!-- First-time Intro Modal (DaisyUI version) -->
	<dialog id="intro_modal" class="modal" role="dialog" aria-labelledby="intro_modal_title" aria-modal="true">
		<!-- Modal content with clickOutside Svelte action for reliable backdrop clicking -->
		<div class="modal-box relative bg-white rounded-3xl p-6 sm:p-8 md:p-10 w-[95%] max-w-[90vw] sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto border-0"
			style="box-shadow: 0 10px 25px -5px rgba(249, 168, 212, 0.3), 0 8px 10px -6px rgba(249, 168, 212, 0.2), 0 0 15px rgba(249, 168, 212, 0.15);"
			use:clickOutside={{ enabled: true, callback: () => {
				const modal = document.getElementById('intro_modal');
				if (modal) {
					modal.close();
					markIntroAsSeen();
				}
			}}}>
			
			<!-- Close button -->
			<form method="dialog">
				<button class="btn btn-sm btn-circle absolute right-4 top-4 bg-white/70 border-0 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700 shadow-sm">✕</button>
			</form>
			
			<div class="space-y-5 sm:space-y-6 md:space-y-7 animate-fadeIn">
				<!-- Animated ghost icon -->
				<div class="flex justify-center mb-4">
					<div class="relative w-16 h-16 animate-pulse-slow">
						<img src="/talktype-icon-bg-gradient.svg" alt="" class="absolute inset-0 w-full h-full" />
						<img src="/assets/talktype-icon-base.svg" alt="" class="absolute inset-0 w-full h-full" />
						<img src="/assets/talktype-icon-eyes.svg" alt="" class="absolute inset-0 w-full h-full intro-eyes" />
					</div>
				</div>
				
				<!-- Main heading - ultra chunky -->
				<h1 class="text-center text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-gray-900">
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
						// First close the modal
						document.getElementById('intro_modal').close();
						markIntroAsSeen();
						
						// Then after a brief delay, start recording
						setTimeout(() => {
							const ghostBtn = document.querySelector('.icon-container');
							if (ghostBtn) ghostBtn.click();
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
		<!-- Modal backdrop - for styling only, actual click handling is done by our custom Svelte action -->
		<div class="modal-backdrop"></div>
	</dialog>
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
	
	:global(*:focus) {
		outline: none !important;
	}
	
	/* Subtle cream background with just enough texture/noise */
	:global(.bg-gradient-mesh) {
		background-color: #fefaf4; /* Base cream color */
		background-image: radial-gradient(
			circle at center,
			#fefaf4 0%,
			#fefaf4 50%,
			#fdf7ef 85%,
			#fcf5ea 100%
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
	}
	
	/* Remove focus outline and any other focus indicators */
	.icon-container:focus, .icon-container:active, .icon-container:focus-visible {
		outline: none !important;
		outline-offset: 0 !important;
		box-shadow: none !important;
		-webkit-appearance: none !important;
		-moz-appearance: none !important;
		border: none !important;
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
		animation: blink 6s infinite; /* More frequent ambient blinking (was 10s) */
		transform-origin: center center; /* Squinch exactly in the middle */
	}

	/* Simple quick snappy ambient blinking animation */
	@keyframes blink {
		0%,
		96.5%,
		100% {
			transform: scaleY(1);
		}
		97.5% {
			transform: scaleY(0); /* Quick blink - just closed and open */
		}
		98.5% {
			transform: scaleY(1);
		}
	}

	/* "Thinking" animation when recording is active */
	.icon-container.recording .icon-eyes {
		animation: blink-thinking 4s infinite; /* Slightly slower - more deliberate */
		transform-origin: center center; /* Squinch exactly in the middle */
	}

	/* Quick snappy blink animation for programmatic use */
	.icon-eyes.blink-once {
		animation: blink-once 0.2s forwards !important;
		transform-origin: center center;
	}

	@keyframes blink-once {
		0%,
		30% {
			transform: scaleY(1);
		}
		50% {
			transform: scaleY(0);
		} /* Closed eyes */
		65%,
		100% {
			transform: scaleY(1);
		} /* Quick snappy open */
	}

	/* Special animation for when the ghost is thinking hard (transcribing) */
	.icon-eyes.blink-thinking-hard {
		animation: blink-thinking-hard 1.5s infinite !important;
		transform-origin: center center;
	}

	@keyframes blink-thinking-hard {
		0%,
		10%,
		50%,
		60% {
			transform: scaleY(1);
		}
		12%,
		48% {
			transform: scaleY(0); /* Closed eyes - concentrating */
		}
		90%,
		100% {
			transform: scaleY(0.2); /* Squinting - thinking hard */
		}
	}

	@keyframes blink-thinking {
		/* First quick blink */
		0%,
		23%,
		100% {
			transform: scaleY(1);
		}
		3% {
			transform: scaleY(0); /* Fast blink */
		}
		4% {
			transform: scaleY(1); /* Very snappy */
		}

		/* Second blink - thinking pattern */
		40% {
			transform: scaleY(1);
		}
		42% {
			transform: scaleY(0); /* First close */
		}
		43% {
			transform: scaleY(0.2); /* Short peek */
		}
		46% {
			transform: scaleY(0); /* Second close (squinty thinking) */
		}
		48% {
			transform: scaleY(1); /* Open again */
		}

		/* Third quick blink */
		80% {
			transform: scaleY(1);
		}
		82% {
			transform: scaleY(0); /* Fast blink */
		}
		83% {
			transform: scaleY(1); /* Snappy */
		}
	}

	.icon-container:hover,
	.icon-container:active {
		filter: drop-shadow(0 0 18px rgba(249, 168, 212, 0.45))
			drop-shadow(0 0 30px rgba(255, 156, 243, 0.3));
		transform: scale(1.01);
		animation: ghost-hover 1.2s ease-in-out infinite alternate;
	}

	.icon-container.recording {
		animation: recording-glow 1.5s infinite;
		transform: scale(1.05);
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

	@keyframes gentle-pulse {
		0% {
			filter: drop-shadow(0 0 15px rgba(249, 168, 212, 0.4))
				drop-shadow(0 0 20px rgba(255, 156, 243, 0.25));
		}
		50% {
			filter: drop-shadow(0 0 25px rgba(249, 168, 212, 0.55))
				drop-shadow(0 0 30px rgba(255, 156, 243, 0.35));
		}
		100% {
			filter: drop-shadow(0 0 15px rgba(249, 168, 212, 0.4))
				drop-shadow(0 0 20px rgba(255, 156, 243, 0.25));
		}
	}

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

	:global(.ghost-wobble-left) {
		animation: ghost-wobble-left 0.6s ease-in-out !important;
	}

	:global(.ghost-wobble-right) {
		animation: ghost-wobble-right 0.6s ease-in-out !important;
	}

	/* Staggered text animation for title - more reliable approach */
	.staggered-text {
		animation: none; /* Reset any existing animations */
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
	.stagger-letter:nth-child(1) {
		animation-delay: 0.05s;
	}
	.stagger-letter:nth-child(2) {
		animation-delay: 0.1s;
	}
	.stagger-letter:nth-child(3) {
		animation-delay: 0.15s;
	}
	.stagger-letter:nth-child(4) {
		animation-delay: 0.2s;
	}
	.stagger-letter:nth-child(5) {
		animation-delay: 0.25s;
	}
	.stagger-letter:nth-child(6) {
		animation-delay: 0.3s;
	}
	.stagger-letter:nth-child(7) {
		animation-delay: 0.35s;
	}
	.stagger-letter:nth-child(8) {
		animation-delay: 0.4s;
	}

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

	/* Title shimmer effect */
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
		animation: shimmer 3s ease-out 2.5s;
	}

	@keyframes shimmer {
		0% {
			left: -100%;
		}
		100% {
			left: 200%;
		}
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
		0% {
			transform: rotate(0deg);
		}
		20% {
			transform: rotate(-3deg) scale(1.02);
		}
		40% {
			transform: rotate(2deg) scale(1.04);
		}
		60% {
			transform: rotate(-1deg) scale(1.02);
		}
		80% {
			transform: rotate(1deg) scale(1.01);
		}
		100% {
			transform: rotate(0deg) scale(1);
		}
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
	.talktype-logo {
		/* Font smoothing for better rendering */
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		text-rendering: optimizeLegibility;
		/* Ensure proper vertical spacing and prevent y descender clipping */
		line-height: 1.3; /* Increased line height for better descender handling */
		padding-bottom: 6px; /* Increased padding to prevent descender clipping */
		/* Subtle letter-spacing for better visual balance */
		letter-spacing: 0.01em;
		/* Ensure the container has enough height and doesn't clip */
		overflow: visible;
		/* Make sure the element is a block for stable animations */
		display: inline-block;
		/* Smooth transition for hover */
		transition: all 0.2s ease;
	}

	/* Simple, cohesive hover effect that treats the wordmark as one unit */
	.talktype-logo:hover {
		letter-spacing: 0.02em;
		transform: translateY(-1px);
	}

	/* Custom kerning for specific letter pairs */
	.talktype-logo .letter-t1 {
		margin-right: -0.05em; /* Tighten spacing between T and a */
	}

	/* Tighter kerning for "a" - pull it closer to "T" */
	.talktype-logo .letter-a1 {
		margin-left: -0.06em; /* Pull "a" closer to "T" */
	}

	.talktype-logo .letter-k {
		margin-right: -0.02em; /* Adjust k-T spacing */
	}

	.talktype-logo .letter-t2 {
		margin-right: -0.02em; /* Adjust T-y spacing */
	}

	/* Fix for the 'y' descender to prevent clipping */
	.talktype-logo .letter-y {
		/* Ensure the y descender is fully visible */
		display: inline-block;
		position: relative;
		margin-bottom: 3px; /* Increased margin to prevent descender clipping */
	}

	/* No complicated per-letter animations - removed for stability */
	
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
		0%, 100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-5px);
		}
	}
	
	@keyframes ghost-hover {
		0% {
			transform: scale(1.005) translateY(0);
		}
		100% {
			transform: scale(1.015) translateY(-3px);
		}
	}
	
	/* Rainbow animation for ghost svg with sparkle effect */
	.rainbow-animated {
		animation: hueShift 5s ease-in-out infinite;
		filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.5));
		transform-origin: center center;
	}

	/* Special rainbow sparkle effect when hovered */
	.icon-container:hover .rainbow-animated {
		animation: hueShift 4s ease-in-out infinite, sparkle 3s ease-in-out infinite;
		filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.7));
	}

	@keyframes sparkle {
		0%, 100% { filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.6)) drop-shadow(0 0 8px rgba(255, 61, 127, 0.5)); transform: scale(1.01); }
		25% { filter: drop-shadow(0 0 7px rgba(255, 141, 60, 0.7)) drop-shadow(0 0 10px rgba(255, 249, 73, 0.6)); transform: scale(1.015); }
		50% { filter: drop-shadow(0 0 6px rgba(77, 255, 96, 0.7)) drop-shadow(0 0 12px rgba(53, 222, 255, 0.6)); transform: scale(1.02); }
		75% { filter: drop-shadow(0 0 7px rgba(159, 122, 255, 0.7)) drop-shadow(0 0 10px rgba(255, 61, 127, 0.6)); transform: scale(1.015); }
	}
	
	/* Theme-based visualizer styling using data-theme attribute */
	:global([data-theme="rainbow"] .history-bar) {
		animation: hueShift 7s ease-in-out infinite, rainbowBars 3s ease-in-out infinite;
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
	
	@keyframes hueShift {
		0% {
			background-position: 0% 0%;
			filter: saturate(1.3) brightness(1.1);
		}
		25% {
			background-position: 0% 33%;
			filter: saturate(1.4) brightness(1.15);
		}
		50% {
			background-position: 0% 66%;
			filter: saturate(1.5) brightness(1.2);
		}
		75% {
			background-position: 0% 100%;
			filter: saturate(1.4) brightness(1.15);
		}
		100% {
			background-position: 0% 0%;
			filter: saturate(1.3) brightness(1.1);
		}
	}
	
	/* Media queries for mobile optimization */
	@media (max-width: 640px) {
		section {
			padding-top: 8vh !important;
			min-height: 100vh;
			display: flex;
			flex-direction: column;
			justify-content: flex-start;
		}
		
		.icon-container {
			height: 9rem !important; 
			width: 9rem !important;
			margin-bottom: 1rem !important; /* 4 units on 8px grid */
		}
		
		.slide-in-subtitle {
			max-width: 28ch !important;
			margin-top: 0.5rem !important; /* 2 units on 8px grid */
			margin-bottom: 1rem !important; /* 4 units on 8px grid */
		}
		
		/* Button section spacing */
		.button-section {
			margin-top: 1rem !important; /* 4 units on 8px grid */
		}
		
		/* Position wrapper adjustments */
		.position-wrapper {
			margin-top: 1.5rem !important; /* 6 units on 8px grid */
		}
		
		footer button {
			min-height: 2.5rem;
			padding-top: 0.5rem;
			padding-bottom: 0.5rem;
			padding-left: 0.75rem;
			padding-right: 0.75rem;
		}
		
		footer {
			padding-top: 1rem;
			padding-bottom: 1rem;
		}
	}
</style>