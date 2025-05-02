<script>
	import { onMount, onDestroy } from 'svelte';

	// Ghost state
	let currentTheme = 'peach';
	let currentAnimation = 'none';
	let isBlinking = false;
	let isRecording = false;
	let isProcessing = false;
	let eyePosition = 'center';
	let ambientBlinking = true;
	let doingSpecialAnimation = false;

	// Reference to SVG element
	let ghostSvg;
	let eyesElement;

	// Animation timeout references
	let animationTimeout;
	let blinkTimeoutId;
	let wobbleTimeoutId;
	let specialAnimationTimeoutId;

	onMount(() => {
		// Get references to SVG elements
		eyesElement = ghostSvg?.querySelector('.ghost-eyes');

		// Start ambient blinking with better control
		if (ambientBlinking && eyesElement) {
			scheduleBlink();
		}

		// Start special animation detection (easter egg)
		if (eyesElement) {
			maybeDoSpecialAnimation();
		}

		// Start with a greeting animation
		setTimeout(() => {
			greetingAnimation();
		}, 1500);

		return () => {
			// Clear any timeouts on unmount
			if (animationTimeout) clearTimeout(animationTimeout);
			clearTimeout(blinkTimeoutId);
			clearTimeout(wobbleTimeoutId);
			clearTimeout(specialAnimationTimeoutId);
		};
	});

	// Clean up on destroy
	onDestroy(() => {
		clearTimeout(blinkTimeoutId);
		clearTimeout(wobbleTimeoutId);
		clearTimeout(specialAnimationTimeoutId);
		clearTimeout(animationTimeout);
	});

	// Theme handling
	function setTheme(theme) {
		currentTheme = theme;
		
		// Rainbow needs special handling
		if (theme === 'rainbow' && ghostSvg) {
			const bgLayer = ghostSvg.querySelector('.ghost-bg');
			if (bgLayer) {
				bgLayer.classList.add('rainbow-animated');
			}
		} else if (ghostSvg) {
			const bgLayer = ghostSvg.querySelector('.ghost-bg');
			if (bgLayer) {
				bgLayer.classList.remove('rainbow-animated');
			}
		}
	}

	// Animation handlers
	function triggerAnimation(animation) {
		// Reset any existing animations
		resetAnimations();

		// Apply the new animation
		currentAnimation = animation;

		if (animation === 'wobble-left') {
			ghostSvg.classList.add('wobble-left');

			// Reset after animation completes
			animationTimeout = setTimeout(() => {
				ghostSvg.classList.remove('wobble-left');
				currentAnimation = 'none';
			}, 600);
		} else if (animation === 'wobble-right') {
			ghostSvg.classList.add('wobble-right');

			// Reset after animation completes
			animationTimeout = setTimeout(() => {
				ghostSvg.classList.remove('wobble-right');
				currentAnimation = 'none';
			}, 600);
		} else if (animation === 'spin') {
			ghostSvg.classList.add('spin');
			doingSpecialAnimation = true;

			// Reset after animation completes
			animationTimeout = setTimeout(() => {
				ghostSvg.classList.remove('spin');
				currentAnimation = 'none';
				doingSpecialAnimation = false;
			}, 1500);
		}
	}

	// Eye position handler
	function setEyePosition(position) {
		if (!eyesElement) return;

		// Remove all position classes first
		eyesElement.classList.remove('looking-left', 'looking-right', 'looking-up', 'looking-down');

		// Apply new position
		eyePosition = position;
		if (position !== 'center') {
			eyesElement.classList.add(`looking-${position}`);
		}
	}
	
	// Greeting animation - matches Ghost.svelte
	function greetingAnimation() {
		// Use the wobble animation for greeting
		triggerAnimation('wobble-left');

		// Then do natural double blink with good vibe after wobble completes
		setTimeout(() => {
			// First blink
			if (eyesElement) {
				eyesElement.classList.add('blink-once');
				setTimeout(() => {
					eyesElement.classList.remove('blink-once');
					
					// Second blink after a short pause
					setTimeout(() => {
						eyesElement.classList.add('blink-once');
						setTimeout(() => {
							eyesElement.classList.remove('blink-once');
							
							// Start ambient blinking
							scheduleBlink();
						}, 150); // More natural close time
					}, 180); // Better pause between blinks
				}, 150); // More natural open time
			}
		}, 600); // Wait for wobble to complete
	}

	// Regular ambient blinking - matching the original Ghost.svelte behavior
	function scheduleBlink() {
		clearTimeout(blinkTimeoutId);

		// Don't blink during recording or processing
		if (isRecording || isProcessing || doingSpecialAnimation) {
			return;
		}

		// Random delay between blinks (4-8 seconds)
		const delay = 4000 + Math.random() * 4000;

		blinkTimeoutId = setTimeout(() => {
			if (!eyesElement) return;
			
			// Force a browser reflow to ensure the animation gets reapplied
			void eyesElement.offsetWidth;
			
			// Single or double blink with good vibe from original component
			if (Math.random() < 0.25) {
				// Double blink (25% chance) - natural feel
				eyesElement.classList.add('blink-double');
				setTimeout(() => {
					eyesElement.classList.remove('blink-double');
					scheduleBlink(); // Schedule next blink
				}, 680); // Duration of double blink animation
			} else {
				// Single blink (75% chance) - natural timing
				eyesElement.classList.add('blink-single');
				setTimeout(() => {
					eyesElement.classList.remove('blink-single');
					scheduleBlink(); // Schedule next blink
				}, 300); // Duration of single blink animation
			}
		}, delay);
	}

	// Special animations that rarely happen (easter egg)
	function maybeDoSpecialAnimation() {
		clearTimeout(specialAnimationTimeoutId);

		// Very rare animation (5% chance when conditions are right)
		if (
			Math.random() < 0.05 &&
			!isRecording &&
			!isProcessing &&
			!doingSpecialAnimation
		) {
			triggerAnimation('spin');
		}

		// Schedule next check
		specialAnimationTimeoutId = setTimeout(maybeDoSpecialAnimation, 45000); // Check every 45 seconds
	}

	// Manual blinking handlers
	function toggleBlink() {
		if (!eyesElement) return;

		isBlinking = !isBlinking;
		if (isBlinking) {
			eyesElement.classList.add('blinking');
			// Pause ambient blinking while manually blinking
			clearTimeout(blinkTimeoutId);
		} else {
			eyesElement.classList.remove('blinking');
			// Resume ambient blinking
			if (ambientBlinking) {
				scheduleBlink();
			}
		}
	}

	function toggleAmbientBlinking() {
		if (!eyesElement) return;

		ambientBlinking = !ambientBlinking;
		if (ambientBlinking) {
			scheduleBlink();
		} else {
			clearTimeout(blinkTimeoutId);
		}
	}

	// Start thinking animation
	function startThinking() {
		if (!eyesElement) return;
		
		// Clear other blink animations
		clearTimeout(blinkTimeoutId);
		eyesElement.classList.remove('blink-single', 'blink-double', 'blinking');
		
		// Add thinking animation
		eyesElement.classList.add('blink-thinking-hard');
	}
	
	// Stop thinking animation
	function stopThinking() {
		if (!eyesElement) return;
		
		eyesElement.classList.remove('blink-thinking-hard');
		
		// Resume ambient blinking
		if (ambientBlinking) {
			scheduleBlink();
		}
	}
	
	// Pulse animation (subtle grow/shrink)
	function pulse() {
		if (!ghostSvg) return;
		
		// Add pulse class
		ghostSvg.classList.add('ghost-pulse');
		
		// Remove class after animation completes
		setTimeout(() => {
			ghostSvg.classList.remove('ghost-pulse');
		}, 600);
	}
	
	// React to transcript length animation
	function reactToTranscript(textLength = 'long') {
		if (!eyesElement) return;
		
		// Clear other animations
		clearTimeout(blinkTimeoutId);
		
		if (textLength === 'long') {
			// For longer transcripts, do a "satisfied" double blink
			setTimeout(() => {
				eyesElement.classList.add('blink-once');
				setTimeout(() => {
					eyesElement.classList.remove('blink-once');
					setTimeout(() => {
						eyesElement.classList.add('blink-once');
						setTimeout(() => {
							eyesElement.classList.remove('blink-once');
							// Resume ambient blinking
							if (ambientBlinking) {
								scheduleBlink();
							}
						}, 200);
					}, 200);
				}, 200);
			}, 500);
		} else {
			// For short transcripts, just do a single blink
			setTimeout(() => {
				eyesElement.classList.add('blink-once');
				setTimeout(() => {
					eyesElement.classList.remove('blink-once');
					// Resume ambient blinking
					if (ambientBlinking) {
						scheduleBlink();
					}
				}, 300);
			}, 500);
		}
	}
	
	// Special reaction animations
	function doSpecialAnimation() {
		if (!ghostSvg) return;
		
		// Clear other animations
		resetAnimations();
		
		// Force special animation
		doingSpecialAnimation = true;
		triggerAnimation('spin');
	}
	
	// Combined animation sequence
	function doFullAnimationSequence() {
		if (!ghostSvg || !eyesElement) return;
		
		// Step 1: Wobble
		triggerAnimation('wobble-left');
		
		// Step 2: Double blink after wobble
		setTimeout(() => {
			reactToTranscript('long');
			
			// Step 3: Pulse after reaction
			setTimeout(() => {
				pulse();
				
				// Step 4: Finally, do the spin (rarely seen)
				setTimeout(() => {
					doSpecialAnimation();
				}, 1500);
			}, 1500);
		}, 800);
	}

	// Recording state handler
	function toggleRecording() {
		isRecording = !isRecording;

		if (isRecording) {
			// Clear blink scheduling during recording
			clearTimeout(blinkTimeoutId);
			ghostSvg.classList.add('recording');
		} else {
			ghostSvg.classList.remove('recording');
			
			// Resume ambient blinking after a delay
			if (ambientBlinking) {
				setTimeout(() => {
					scheduleBlink();
				}, 1000);
			}
		}
	}

	// Processing state handler
	function toggleProcessing() {
		isProcessing = !isProcessing;
		
		if (isProcessing) {
			// Clear blink scheduling during processing
			clearTimeout(blinkTimeoutId);
			startThinking();
		} else {
			stopThinking();
			
			// Resume ambient blinking after a delay
			if (ambientBlinking) {
				setTimeout(() => {
					scheduleBlink();
				}, 1000);
			}
		}
	}

	// Reset all animations
	function resetAnimations() {
		if (!ghostSvg || !eyesElement) return;

		// Clear any pending timeouts
		if (animationTimeout) clearTimeout(animationTimeout);

		// Remove animation classes
		ghostSvg.classList.remove('wobble-left', 'wobble-right', 'spin');
		eyesElement.classList.remove('blink-single', 'blink-double', 'blink-thinking-hard');

		// Reset state
		currentAnimation = 'none';
	}
</script>

<svelte:head>
	<link rel="stylesheet" href="/ghost-data/ghost-themes.css" />
	<link rel="stylesheet" href="/ghost-data/ghost-animations.css" />
</svelte:head>

<div class="container">
	<h1>Ghost SVG Reference Test</h1>

	<div class="test-container">
		<!-- Ghost Display Area -->
		<div class="ghost-display">
			<svg
				bind:this={ghostSvg}
				viewBox="0 0 1024 1024"
				xmlns="http://www.w3.org/2000/svg"
				xmlns:xlink="http://www.w3.org/1999/xlink"
				class="ghost-svg theme-{currentTheme} {isRecording ? 'recording' : ''}"
			>
				<!-- Gradient definitions -->
				<defs>
					<!-- Peach Theme Gradient (Default) -->
					<linearGradient id="peachGradient" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stop-color="var(--ghost-peach-start)" />
						<stop offset="35%" stop-color="var(--ghost-peach-mid1)" />
						<stop offset="65%" stop-color="var(--ghost-peach-mid2)" />
						<stop offset="85%" stop-color="var(--ghost-peach-mid3)" />
						<stop offset="100%" stop-color="var(--ghost-peach-end)" />
					</linearGradient>

					<!-- Mint Theme Gradient -->
					<linearGradient id="mintGradient" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stop-color="var(--ghost-mint-start)" />
						<stop offset="35%" stop-color="var(--ghost-mint-mid1)" />
						<stop offset="65%" stop-color="var(--ghost-mint-mid2)" />
						<stop offset="85%" stop-color="var(--ghost-mint-mid3)" />
						<stop offset="100%" stop-color="var(--ghost-mint-end)" />
					</linearGradient>

					<!-- Bubblegum Theme Gradient -->
					<linearGradient id="bubblegumGradient" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stop-color="var(--ghost-bubblegum-start)" />
						<stop offset="35%" stop-color="var(--ghost-bubblegum-mid1)" />
						<stop offset="65%" stop-color="var(--ghost-bubblegum-mid2)" />
						<stop offset="85%" stop-color="var(--ghost-bubblegum-mid3)" />
						<stop offset="100%" stop-color="var(--ghost-bubblegum-end)" />
					</linearGradient>

					<!-- Rainbow Theme Gradient -->
					<linearGradient id="rainbowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stop-color="var(--ghost-rainbow-start)" />
						<stop offset="25%" stop-color="var(--ghost-rainbow-mid1)" />
						<stop offset="50%" stop-color="var(--ghost-rainbow-mid2)" />
						<stop offset="75%" stop-color="var(--ghost-rainbow-mid3)" />
						<stop offset="100%" stop-color="var(--ghost-rainbow-end)" />
					</linearGradient>
				</defs>

				<!-- LAYER 1: Background with Gradient Fill -->
				<g class="ghost-layer ghost-bg">
					<use
						xlink:href="/ghost-data/ghost-paths.svg#ghost-background"
						class="ghost-shape"
						fill="url(#{currentTheme}Gradient)"
					/>
				</g>

				<!-- LAYER 2: Outline Layer -->
				<g class="ghost-layer ghost-outline">
					<use
						xlink:href="/ghost-data/ghost-paths.svg#ghost-body-path"
						class="ghost-outline-path"
						fill="#000000"
						opacity="1.0"
					/>
				</g>

				<!-- LAYER 3: Eyes Layer -->
				<g
					class="ghost-layer ghost-eyes {isBlinking ? 'blinking' : ''}"
				>
					<!-- Left Eye -->
					<use
						xlink:href="/ghost-data/ghost-paths.svg#ghost-eye-left-path"
						class="ghost-eye ghost-eye-left"
						fill="#000000"
					/>

					<!-- Right Eye -->
					<use
						xlink:href="/ghost-data/ghost-paths.svg#ghost-eye-right-path"
						class="ghost-eye ghost-eye-right"
						fill="#000000"
					/>
				</g>
			</svg>
		</div>

		<!-- Control Panel -->
		<div class="control-panel">
			<div class="control-section">
				<h2>Theme Controls</h2>
				<div class="theme-buttons">
					<button class:active={currentTheme === 'peach'} on:click={() => setTheme('peach')}>
						Peach
					</button>
					<button class:active={currentTheme === 'mint'} on:click={() => setTheme('mint')}>
						Mint
					</button>
					<button
						class:active={currentTheme === 'bubblegum'}
						on:click={() => setTheme('bubblegum')}
					>
						Bubblegum
					</button>
					<button class:active={currentTheme === 'rainbow'} on:click={() => setTheme('rainbow')}>
						Rainbow
					</button>
				</div>
			</div>

			<div class="control-section">
				<h2>Basic Animation Controls</h2>
				<div class="animation-buttons">
					<button
						class:active={currentAnimation === 'wobble-left'}
						on:click={() => triggerAnimation('wobble-left')}
					>
						Wobble Left
					</button>
					<button
						class:active={currentAnimation === 'wobble-right'}
						on:click={() => triggerAnimation('wobble-right')}
					>
						Wobble Right
					</button>
					<button
						class:active={currentAnimation === 'spin'}
						on:click={() => triggerAnimation('spin')}
					>
						Spin
					</button>
				</div>
			</div>

			<div class="control-section">
				<h2>Eye Controls</h2>
				<div class="eye-position-controls">
					<button class:active={eyePosition === 'center'} on:click={() => setEyePosition('center')}>
						Center
					</button>
					<button class:active={eyePosition === 'left'} on:click={() => setEyePosition('left')}>
						Left
					</button>
					<button class:active={eyePosition === 'right'} on:click={() => setEyePosition('right')}>
						Right
					</button>
					<button class:active={eyePosition === 'up'} on:click={() => setEyePosition('up')}>
						Up
					</button>
					<button class:active={eyePosition === 'down'} on:click={() => setEyePosition('down')}>
						Down
					</button>
				</div>

				<div class="blink-controls">
					<button class:active={isBlinking} on:click={toggleBlink}>
						{isBlinking ? 'Eyes Open' : 'Blink'}
					</button>
					<button class:active={ambientBlinking} on:click={toggleAmbientBlinking}>
						{ambientBlinking ? 'Disable Ambient Blinking' : 'Enable Ambient Blinking'}
					</button>
				</div>
			</div>

			<div class="control-section">
				<h2>State Controls</h2>
				<div class="state-controls">
					<button class:active={isRecording} on:click={toggleRecording}>
						{isRecording ? 'Stop Recording' : 'Start Recording'}
					</button>
					<button class:active={isProcessing} on:click={toggleProcessing}>
						{isProcessing ? 'Stop Processing' : 'Start Processing'}
					</button>
				</div>
			</div>
			
			<div class="control-section">
				<h2>Blinking & Eyes Animations</h2>
				<div class="animation-buttons">
					<button on:click={startThinking}>Start Thinking</button>
					<button on:click={stopThinking}>Stop Thinking</button>
					<button on:click={() => reactToTranscript('short')}>React (Short)</button>
					<button on:click={() => reactToTranscript('long')}>React (Long)</button>
				</div>
			</div>

			<div class="control-section">
				<h2>Body Animations</h2>
				<div class="animation-buttons">
					<button on:click={greetingAnimation}>Greeting</button>
					<button on:click={pulse}>Pulse</button>
					<button on:click={doSpecialAnimation}>Spin (Easter Egg)</button>
				</div>
			</div>
			
			<div class="control-section">
				<h2>Sequence Animations</h2>
				<div class="animation-buttons">
					<button on:click={doFullAnimationSequence}>Full Animation Sequence</button>
				</div>
			</div>

			<div class="control-section">
				<h2>Current State</h2>
				<div class="state-display">
					<p><strong>Theme:</strong> {currentTheme}</p>
					<p><strong>Animation:</strong> {currentAnimation}</p>
					<p><strong>Eye Position:</strong> {eyePosition}</p>
					<p><strong>Blinking:</strong> {isBlinking ? 'Yes' : 'No'}</p>
					<p><strong>Ambient Blinking:</strong> {ambientBlinking ? 'Enabled' : 'Disabled'}</p>
					<p><strong>Recording:</strong> {isRecording ? 'Yes' : 'No'}</p>
					<p><strong>Processing:</strong> {isProcessing ? 'Yes' : 'No'}</p>
					<p><strong>Special Animation:</strong> {doingSpecialAnimation ? 'Yes' : 'No'}</p>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			sans-serif;
	}

	h1 {
		text-align: center;
		margin-bottom: 2rem;
		color: #333;
	}

	.test-container {
		display: flex;
		flex-wrap: wrap;
		gap: 2rem;
	}

	.ghost-display {
		flex: 1;
		min-width: 300px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f9f9f9;
		border-radius: 1rem;
		padding: 2rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.ghost-svg {
		width: 100%;
		max-width: 300px;
		height: auto;
	}

	.control-panel {
		flex: 1;
		min-width: 300px;
		background: #f0f0f0;
		border-radius: 1rem;
		padding: 1.5rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.control-section {
		margin-bottom: 1.5rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid #ddd;
	}

	.control-section:last-child {
		border-bottom: none;
		margin-bottom: 0;
		padding-bottom: 0;
	}

	h2 {
		font-size: 1.2rem;
		margin-bottom: 1rem;
		color: #444;
	}

	.theme-buttons,
	.animation-buttons,
	.eye-position-controls,
	.blink-controls,
	.state-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	button {
		background: #fff;
		border: 1px solid #ddd;
		border-radius: 0.5rem;
		padding: 0.5rem 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	button:hover {
		background: #f0f0f0;
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	button.active {
		background: #4f46e5;
		color: white;
		border-color: #4338ca;
	}

	.state-display {
		background: #fff;
		border-radius: 0.5rem;
		padding: 1rem;
	}

	.state-display p {
		margin: 0.25rem 0;
		font-size: 0.9rem;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.test-container {
			flex-direction: column;
		}

		.ghost-display,
		.control-panel {
			min-width: 100%;
		}
	}
</style>