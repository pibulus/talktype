<script>
	import { onMount, onDestroy } from 'svelte';
	import { createEventDispatcher } from 'svelte';

	export let isRecording = false;
	export let isProcessing = false;
	export let animationState = 'idle'; // 'idle', 'wobble-start', 'wobble-stop'

	const dispatch = createEventDispatcher();

	// Animation state management
	let animState = {
		timeouts: {
			blink: null,
			wobble: null,
			special: null
		},
		status: {
			eyesClosed: false,
			isWobbling: false,
			specialAnimationActive: false
		}
	};

	let currentTheme = 'peach';

	// Element references using direct bindings
	let container = null;
	let svg = null;
	let eyes = null;
	let background = null;

	// Eye position state
	let eyePositionX = 0;
	let eyePositionY = 0;
	let eyesClosed = false; // Flag to prioritize blinking over position

	/**
	 * Adds a class to an element and optionally removes it after a duration
	 * Forces a browser reflow for reliable animation triggering
	 */
	function applyAnimationClass(element, className, duration = 0) {
		if (!element) return null;

		void element.offsetWidth;
		element.classList.add(className);

		if (duration <= 0) return null;

		return setTimeout(() => {
			element.classList.remove(className);
		}, duration);
	}

	function clearAnimationTimeouts() {
		Object.keys(animState.timeouts).forEach((key) => {
			if (animState.timeouts[key]) {
				clearTimeout(animState.timeouts[key]);
				animState.timeouts[key] = null;
			}
		});
	}

	function sequentialBlinks(count, interval, onComplete) {
		if (!eyes) return;
		let currentBlink = 0;

		function doBlink() {
			// Set eyes closed state to true (prioritizes blinking)
			eyesClosed = true;
			eyes.style.transform = 'scaleY(0.05)';
			
			setTimeout(() => {
				// Open eyes
				eyesClosed = false;
				// Restore eye position tracking
				if (!eyesClosed) {
					eyes.style.transform = `translate(${eyePositionX * 20}px, ${eyePositionY * 10}px)`;
				}
				
				currentBlink++;
				if (currentBlink < count) {
					setTimeout(doBlink, interval * 0.5);
				} else if (onComplete) {
					setTimeout(onComplete, interval);
				}
			}, interval);
		}

		doBlink();
	}

	// Debug function to test eye tracking functionality
	function testEyeTracking() {
		console.log('👻 DEBUG: Testing eye movement functionality');
		if (!eyes) {
			console.log('👻 DEBUG: Missing elements for testing', { eyes });
			return;
		}
		
		// Store current state
		const wasEyesClosed = eyesClosed;
		
		// Test blinking
		console.log('👻 DEBUG: Testing eye blink');
		eyesClosed = true;
		eyes.style.transform = 'scaleY(0.05)';
		
		// After a delay, open eyes and test position
		setTimeout(() => {
			console.log('👻 DEBUG: Testing eye position');
			eyesClosed = false;
			eyes.style.transform = 'translate(20px, 10px)';
			
			// Log the transform style
			console.log('👻 DEBUG: TEST - eyes transform style:', eyes.style.transform);
			
			// After another delay, restore original state
			setTimeout(() => {
				console.log('👻 DEBUG: Restoring eye state');
				eyesClosed = wasEyesClosed;
				
				if (!eyesClosed) {
					eyes.style.transform = `translate(${eyePositionX * 20}px, ${eyePositionY * 10}px)`;
				} else {
					eyes.style.transform = 'scaleY(0.05)';
				}
				
				console.log('👻 DEBUG: Eye tracking test complete');
			}, 500);
		}, 500);
	}

	onMount(() => {
		console.log('👻 DEBUG: onMount started');
		if (typeof document !== 'undefined') {
			// Direct bindings are already set up via bind:this
			console.log('👻 DEBUG: SVG element in onMount:', svg);
			console.log('👻 DEBUG: Eyes element in onMount:', eyes);
			console.log('👻 DEBUG: Background element in onMount:', background);

			updateTheme();

			setTimeout(() => {
				const observer = new MutationObserver((mutations) => {
					mutations.forEach((mutation) => {
						if (mutation.attributeName === 'data-theme') {
							updateTheme();
						}
					});
				});

				observer.observe(document.documentElement, {
					attributes: true,
					attributeFilter: ['data-theme']
				});
			}, 50);

			// Start greeting animation after a delay, and only start eye tracking AFTER it completes
			setTimeout(() => {
				greetingAnimation();

				// Start eye tracking after greeting animation completes (greeting is ~750ms)
				setTimeout(() => {
					console.log('👻 Starting eye tracking after greeting animation');
					if (svg && eyes) {
						console.log('👻 DEBUG: Adding mousemove event listener for eye tracking');
						document.addEventListener('mousemove', trackMousePosition, { passive: true });
						
						// Log our direct reference
						console.log('👻 DEBUG: eyes:', eyes);
						
						// Test the new approach with direct style manipulation
						testEyeTracking();
						
						// Also start ambient blinking now that eye tracking is active
						scheduleBlink();
					} else {
						console.log('👻 DEBUG: Missing elements for eye tracking!', { svg, eyes });
					}
				}, 1000); // Wait 1 second after greeting animation starts
			}, 1500);

			maybeDoSpecialAnimation();

			return () => {
				observer.disconnect();
				document.removeEventListener('mousemove', trackMousePosition);
				clearAnimationTimeouts();
			};
		}
	});

	onDestroy(() => {
		clearAnimationTimeouts();

		// Reset transform when component is destroyed
		if (eyes) {
			eyes.style.transform = '';
		}
	});

	// Using direct bindings instead of querySelector
	// No need for reactive declarations to set element references

	function greetingAnimation() {
		forceWobble();
		setTimeout(performGreetingBlinks, 600);
	}

	function performGreetingBlinks() {
		if (!eyes) return;
		// Perform greeting blinks but don't schedule ambient blinking yet
		// This ensures eye tracking starts before ambient blinking
		sequentialBlinks(2, 150);
	}

	function scheduleBlink() {
		clearTimeout(animState.timeouts.blink);

		if (isRecording || isProcessing) return;
		if (!eyes) return;

		const delay = 4000 + Math.random() * 4000;

		animState.timeouts.blink = setTimeout(() => {
			const random = Math.random();
			
			if (random < 0.25) {
				// Double blink (25% chance)
				// First blink
				eyesClosed = true;
				eyes.style.transform = 'scaleY(0.05)';
				
				setTimeout(() => {
					// Open briefly
					eyesClosed = false;
					if (!eyesClosed) {
						eyes.style.transform = `translate(${eyePositionX * 20}px, ${eyePositionY * 10}px)`;
					}
					
					// Second blink
					setTimeout(() => {
						eyesClosed = true;
						eyes.style.transform = 'scaleY(0.05)';
						
						// Open again
						setTimeout(() => {
							eyesClosed = false;
							if (!eyesClosed) {
								eyes.style.transform = `translate(${eyePositionX * 20}px, ${eyePositionY * 10}px)`;
							}
							scheduleBlink();
						}, 150);
					}, 180);
				}, 150);
			} else {
				// Single blink (75% chance)
				eyesClosed = true;
				eyes.style.transform = 'scaleY(0.05)';
				
				setTimeout(() => {
					eyesClosed = false;
					if (!eyesClosed) {
						eyes.style.transform = `translate(${eyePositionX * 20}px, ${eyePositionY * 10}px)`;
					}
					scheduleBlink();
				}, 150);
			}
		}, delay);
	}

	function updateTheme() {
		if (typeof document === 'undefined' || !svg) return;

		currentTheme = document.documentElement.getAttribute('data-theme') || 'peach';

		const allThemes = ['peach', 'mint', 'bubblegum', 'rainbow'];
		allThemes.forEach((theme) => {
			svg.classList.toggle(`theme-${theme}`, theme === currentTheme);
		});

		if (background) {
			background.classList.toggle('rainbow-animated', currentTheme === 'rainbow');
		}
	}

	/**
	 * Occasionally triggers a special animation (easter egg)
	 */
	function maybeDoSpecialAnimation() {
		if (typeof window === 'undefined' || !svg) return;

		clearTimeout(animState.timeouts.special);

		if (
			Math.random() < 0.05 &&
			!isRecording &&
			!isProcessing &&
			!animState.status.specialAnimationActive &&
			!animState.status.eyesClosed
		) {
			animState.status.specialAnimationActive = true;
			applyAnimationClass(svg, 'spin', 1500);

			setTimeout(() => {
				animState.status.specialAnimationActive = false;
			}, 1500);
		}

		animState.timeouts.special = setTimeout(maybeDoSpecialAnimation, 45000);
	}

	function trackMousePosition(event) {
		// Check we have a window and required elements
		if (typeof window === 'undefined' || !svg || !eyes) {
			console.log('👻 DEBUG: Missing elements for eye tracking', { svg, eyes });
			return;
		}
		
		// Skip eye tracking during blinks
		if (eyesClosed || animState.status.eyesClosed) return;

		const ghostRect = svg.getBoundingClientRect();
		const ghostCenterX = ghostRect.left + ghostRect.width / 2;
		const ghostCenterY = ghostRect.top + ghostRect.height / 2;

		const distanceX = event.clientX - ghostCenterX;
		const distanceY = event.clientY - ghostCenterY;

		const maxDistanceX = window.innerWidth / 3;
		const maxDistanceY = window.innerHeight / 3;
		const normalizedX = Math.max(-1, Math.min(1, distanceX / maxDistanceX));
		const normalizedY = Math.max(-1, Math.min(1, distanceY / maxDistanceY));
		
		// Apply 20% smoothing for more natural movement
		eyePositionX = eyePositionX + (normalizedX - eyePositionX) * 0.2;
		eyePositionY = eyePositionY + (normalizedY - eyePositionY) * 0.2;
		
		console.log(`👻 DEBUG: Setting eye position: x=${eyePositionX * 20}px, y=${eyePositionY * 10}px`);
		
		// Only update position if eyes are open
		if (!eyesClosed) {
			// Apply directly to transform style (no CSS variables)
			eyes.style.transform = `translate(${eyePositionX * 20}px, ${eyePositionY * 10}px)`;
		}
	}

	function handleClick() {
		console.log('👻 Ghost clicked - dispatching toggleRecording event');
		dispatch('toggleRecording');
	}

	/**
	 * Makes the ghost do a subtle pulse animation
	 */
	export function pulse() {
		applyAnimationClass(svg, 'ghost-pulse', 600);
	}

	/**
	 * Starts the "thinking" animation for the ghost's eyes
	 */
	export function startThinking() {
		if (!eyes) return;

		animState.status.eyesClosed = true;
		clearTimeout(animState.timeouts.blink);
		
		// Start thinking animation with direct manipulation
		startThinkingAnimation();
	}
	
	// Helper for thinking animation with direct style
	function startThinkingAnimation() {
		if (!eyes) return;
		
		// Initial state (eyes open)
		setTimeout(() => {
			// First blink
			eyes.style.transform = 'scaleY(0.1)';
			setTimeout(() => {
				// Open
				eyes.style.transform = 'scaleY(1)';
				setTimeout(() => {
					// Second blink
					eyes.style.transform = 'scaleY(0.1)';
					setTimeout(() => {
						// Return to open and hold
						eyes.style.transform = 'scaleY(1)';
						
						// Continue thinking animation if still in thinking state
						if (animState.status.eyesClosed) {
							setTimeout(startThinkingAnimation, 1000);
						} else {
							// If no longer thinking, restore eye position
							if (!eyesClosed) {
								eyes.style.transform = `translate(${eyePositionX * 20}px, ${eyePositionY * 10}px)`;
							}
						}
					}, 50);
				}, 50);
			}, 50);
		}, 0);
	}

	/**
	 * Stops the "thinking" animation and returns to ambient blinking
	 */
	export function stopThinking() {
		if (!eyes) return;

		// Stop thinking animation
		animState.status.eyesClosed = false;
		
		// Reset eyes to normal position if not blinking
		if (!eyesClosed) {
			eyes.style.transform = `translate(${eyePositionX * 20}px, ${eyePositionY * 10}px)`;
		}
		
		// Resume ambient blinking
		setTimeout(scheduleBlink, 500);
	}

	/**
	 * Makes the ghost react to transcript text with appropriate eye animations
	 * @param {number} textLength - Length of transcript text (0 for empty/no transcript)
	 */
	export function reactToTranscript(textLength = 0) {
		if (!eyes) return;
		clearTimeout(animState.timeouts.blink);

		if (textLength === 0) return scheduleBlink();

		const reactionDelay = 500;

		setTimeout(() => {
			if (textLength > 20) {
				// For longer transcripts, do a "satisfied" double blink
				// First blink
				eyesClosed = true;
				eyes.style.transform = 'scaleY(0.05)';
				
				setTimeout(() => {
					// Open briefly
					eyesClosed = false;
					eyes.style.transform = `translate(${eyePositionX * 20}px, ${eyePositionY * 10}px)`;
					
					// Second blink
					setTimeout(() => {
						eyesClosed = true;
						eyes.style.transform = 'scaleY(0.05)';
						
						// Open again and resume normal tracking
						setTimeout(() => {
							eyesClosed = false;
							eyes.style.transform = `translate(${eyePositionX * 20}px, ${eyePositionY * 10}px)`;
							scheduleBlink();
						}, 200);
					}, 200);
				}, 200);
			} else {
				// For short transcripts, just do a single blink
				eyesClosed = true;
				eyes.style.transform = 'scaleY(0.05)';
				
				setTimeout(() => {
					eyesClosed = false;
					eyes.style.transform = `translate(${eyePositionX * 20}px, ${eyePositionY * 10}px)`;
					scheduleBlink();
				}, 300);
			}
		}, reactionDelay);
	}

	/**
	 * Makes the ghost wobble in a direction
	 * @param {Object|string} options - Configuration object or direction string
	 * @param {string} [options.direction=''] - Direction of wobble ('wobble-left' or 'wobble-right')
	 * @param {boolean} [options.isRecordingStart=false] - Whether this wobble is for recording start
	 */
	export function forceWobble(options = {}) {
		if (typeof window === 'undefined' || !svg) return;

		const opts = typeof options === 'string' ? { direction: options } : options;

		const { direction = '', isRecordingStart = false } = opts;

		console.log('👻 FORCE WOBBLE triggered', isRecordingStart ? '(start recording)' : '');

		clearTimeout(animState.timeouts.wobble);

		const wobbleClass = direction || (Math.random() > 0.5 ? 'wobble-left' : 'wobble-right');
		applyAnimationClass(svg, wobbleClass);

		animState.timeouts.wobble = setTimeout(() => {
			svg.classList.remove('wobble-left', 'wobble-right');
		}, 600);
	}

	$: {
		console.log(`👻 Animation state: ${animationState}`);

		if (animationState === 'wobble-start') {
			console.log('👻 START wobble animation');
			forceWobble({ direction: 'wobble-left', isRecordingStart: true });
		} else if (animationState === 'wobble-stop') {
			console.log('👻 STOP wobble animation');
			forceWobble('wobble-right');
		}
	}

	$: if (svg) {
		svg.classList.toggle('recording', isRecording);

		if (isRecording) {
			clearTimeout(animState.timeouts.blink);
		}

		if (isProcessing) {
			startThinking();
		} else if (!isProcessing && !isRecording) {
			stopThinking();
			setTimeout(scheduleBlink, 1000);
		}
	}
</script>

<svelte:head>
	<link rel="stylesheet" href="/ghost-data/ghost-themes.css" />
	<link rel="stylesheet" href="/ghost-data/ghost-animations.css" />
</svelte:head>

<!-- Log stylesheet loading via script instead of onload attributes -->
<script context="module">
	// Check if in browser environment
	if (typeof window !== 'undefined') {
		// Use a small timeout to check for stylesheet loading
		setTimeout(() => {
			// Try to find our stylesheets
			const allSheets = document.styleSheets;
			let foundThemes = false;
			let foundAnimations = false;
			
			for (let i = 0; i < allSheets.length; i++) {
				try {
					const href = allSheets[i].href || '';
					if (href.includes('ghost-themes.css')) {
						console.log('👻 DEBUG: ghost-themes.css loaded');
						foundThemes = true;
					}
					if (href.includes('ghost-animations.css')) {
						console.log('👻 DEBUG: ghost-animations.css loaded');
						foundAnimations = true;
					}
				} catch (e) {
					// CORS may prevent accessing stylesheet content
				}
			}
			
			if (!foundThemes) console.log('👻 DEBUG: ghost-themes.css not found');
			if (!foundAnimations) console.log('👻 DEBUG: ghost-animations.css not found');
		}, 500); // Give stylesheets time to load
	}
</script>

<button
	bind:this={container}
	class="ghost-container"
	on:click={handleClick}
	on:keydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleClick();
		}
	}}
	aria-label="Toggle Recording"
	aria-pressed={isRecording.toString()}
>
	<svg
		bind:this={svg}
		viewBox="0 0 1024 1024"
		xmlns="http://www.w3.org/2000/svg"
		xmlns:xlink="http://www.w3.org/1999/xlink"
		class="ghost-svg theme-{currentTheme} {isRecording ? 'recording' : ''}"
	>
		<defs>
			<linearGradient id="peachGradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="var(--ghost-peach-start)" />
				<stop offset="35%" stop-color="var(--ghost-peach-mid1)" />
				<stop offset="65%" stop-color="var(--ghost-peach-mid2)" />
				<stop offset="85%" stop-color="var(--ghost-peach-mid3)" />
				<stop offset="100%" stop-color="var(--ghost-peach-end)" />
			</linearGradient>

			<linearGradient id="mintGradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="var(--ghost-mint-start)" />
				<stop offset="35%" stop-color="var(--ghost-mint-mid1)" />
				<stop offset="65%" stop-color="var(--ghost-mint-mid2)" />
				<stop offset="85%" stop-color="var(--ghost-mint-mid3)" />
				<stop offset="100%" stop-color="var(--ghost-mint-end)" />
			</linearGradient>

			<linearGradient id="bubblegumGradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="var(--ghost-bubblegum-start)" />
				<stop offset="35%" stop-color="var(--ghost-bubblegum-mid1)" />
				<stop offset="65%" stop-color="var(--ghost-bubblegum-mid2)" />
				<stop offset="85%" stop-color="var(--ghost-bubblegum-mid3)" />
				<stop offset="100%" stop-color="var(--ghost-bubblegum-end)" />
			</linearGradient>

			<linearGradient id="rainbowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="var(--ghost-rainbow-start)" />
				<stop offset="25%" stop-color="var(--ghost-rainbow-mid1)" />
				<stop offset="50%" stop-color="var(--ghost-rainbow-mid2)" />
				<stop offset="75%" stop-color="var(--ghost-rainbow-mid3)" />
				<stop offset="100%" stop-color="var(--ghost-rainbow-end)" />
			</linearGradient>
		</defs>

		<g bind:this={background} class="ghost-layer ghost-bg">
			<use
				xlink:href="/ghost-data/ghost-paths.svg#ghost-background"
				class="ghost-shape"
				fill="url(#{currentTheme}Gradient)"
			/>
		</g>

		<g class="ghost-layer ghost-outline">
			<use
				xlink:href="/ghost-data/ghost-paths.svg#ghost-body-path"
				class="ghost-outline-path"
				fill="#000000"
				opacity="1"
			/>
		</g>

		<g bind:this={eyes} class="ghost-layer ghost-eyes">
			<use
				xlink:href="/ghost-data/ghost-paths.svg#ghost-eye-left-path"
				class="ghost-eye ghost-eye-left"
				fill="#000000"
			/>
			<use
				xlink:href="/ghost-data/ghost-paths.svg#ghost-eye-right-path"
				class="ghost-eye ghost-eye-right"
				fill="#000000"
			/>
		</g>
	</svg>
</button>

<style>
	.ghost-container {
		position: relative;
		width: 100%;
		height: 100%;
		cursor: pointer;
		background: transparent;
		border: none;
		outline: none;
		-webkit-tap-highlight-color: transparent;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.ghost-container:focus,
	.ghost-container:active,
	.ghost-container:focus-visible {
		outline: none !important;
		outline-offset: 0 !important;
		box-shadow: none !important;
		border: none !important;
	}

	.ghost-svg {
		width: 100%;
		height: 100%;
		max-width: 100%;
		max-height: 100%;
	}

	.ghost-layer {
		animation: grow-ghost 2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
		transform-origin: center center;
	}
</style>
