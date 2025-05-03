<script>
	import { onMount, onDestroy } from 'svelte';
	import GhostSvg from './GhostSvg.svelte';
	import StatePanel from './StatePanel.svelte';
	import ControlPanel from './ControlPanel.svelte';
	import { animationGenerationService } from '$lib/services/animationGenerationService';

	// =========================================================
	// State - Single source of truth for all animation properties
	// =========================================================
	
	// Base ghost state
	let currentTheme = 'peach';
	let currentAnimation = 'none';
	let isBlinking = false;
	let isRecording = false;
	let isProcessing = false;
	let eyePosition = 'center';
	let ambientBlinking = true;
	let doingSpecialAnimation = false;
	let isHoverSimulation = false;
	let isRainbowSparkle = false;
	let useThemeSpecificRecording = true;
	let eyeTrackingEnabled = false;
	
	// Animation generation state
	let customAnimations = [];
	let animationDescription = '';
	let isGeneratingAnimation = false;
	let animationError = '';
	let currentRemoveAnimation = null;
	
	// DOM references
	let ghostSvgComponent;
	
	// Animation timeout references
	let animationTimeout;
	let blinkTimeoutId;
	let wobbleTimeoutId;
	let specialAnimationTimeoutId;
	let eyeTrackingRemover = null;

	// =========================================================
	// Lifecycle hooks
	// =========================================================
	
	onMount(() => {
		// Start ambient blinking
		if (ambientBlinking) {
			scheduleBlink();
		}
		
		// Start with a greeting animation
		setTimeout(() => {
			handleAction({ type: 'greeting' });
		}, 1500);
		
		// Start special animation detection
		maybeDoSpecialAnimation();
	});
	
	onDestroy(() => {
		// Clean up all timeouts
		clearTimeout(animationTimeout);
		clearTimeout(blinkTimeoutId);
		clearTimeout(wobbleTimeoutId);
		clearTimeout(specialAnimationTimeoutId);
		
		// Clean up custom animations
		if (currentRemoveAnimation) {
			currentRemoveAnimation();
		}
		
		// Clean up eye tracking
		if (eyeTrackingRemover) {
			eyeTrackingRemover();
		}
	});

	// =========================================================
	// Event handlers - respond to UI events from child components
	// =========================================================
	
	// Generic action handler for all animation actions
	function handleAction(action) {
		const { type, ...details } = action;
		
		if (!ghostSvgComponent) return;
		
		switch (type) {
			case 'greeting':
				performGreetingAnimation();
				break;
			case 'pulse':
				performPulseAnimation();
				break;
			case 'fullAnimationSequence':
				performFullAnimationSequence();
				break;
			case 'specialAnimation':
				performSpecialAnimation();
				break;
			case 'startThinking':
				startThinking();
				break;
			case 'stopThinking':
				stopThinking();
				break;
			case 'reactToTranscript':
				reactToTranscript(details.length);
				break;
			case 'restartGrowAnimation':
				restartGrowAnimation();
				break;
			default:
				console.warn('Unknown action type:', type);
		}
	}
	
	// Theme change handler
	function handleThemeChange(theme) {
		currentTheme = theme;
		
		// Handle special rainbow animations
		if (theme === 'rainbow' && ghostSvgComponent) {
			const bgLayer = ghostSvgComponent.querySelector('.ghost-bg');
			if (bgLayer) {
				bgLayer.classList.add('rainbow-animated');
			}
		} else if (ghostSvgComponent) {
			const bgLayer = ghostSvgComponent.querySelector('.ghost-bg');
			if (bgLayer) {
				bgLayer.classList.remove('rainbow-animated');
			}
		}
	}
	
	// Animation change handler
	function handleAnimationChange(animation) {
		if (animation === currentAnimation) return;
		
		// Reset any existing animation
		resetAnimations();
		
		// Apply the new animation
		currentAnimation = animation;
		
		if (!ghostSvgComponent) return;
		
		if (animation === 'wobble-left') {
			ghostSvgComponent.classList.add('wobble-left');
			
			// Reset after animation completes
			animationTimeout = setTimeout(() => {
				ghostSvgComponent.classList.remove('wobble-left');
				currentAnimation = 'none';
			}, 600);
		} else if (animation === 'wobble-right') {
			ghostSvgComponent.classList.add('wobble-right');
			
			// Reset after animation completes
			animationTimeout = setTimeout(() => {
				ghostSvgComponent.classList.remove('wobble-right');
				currentAnimation = 'none';
			}, 600);
		} else if (animation === 'spin') {
			ghostSvgComponent.classList.add('spin');
			doingSpecialAnimation = true;
			
			// Reset after animation completes
			animationTimeout = setTimeout(() => {
				ghostSvgComponent.classList.remove('spin');
				currentAnimation = 'none';
				doingSpecialAnimation = false;
			}, 1500);
		}
	}
	
	// Eye position change handler
	function handleEyePositionChange(position) {
		if (!ghostSvgComponent) return;
		
		eyePosition = position;
		
		const eyesElement = ghostSvgComponent.querySelector('.ghost-eyes');
		if (!eyesElement) return;
		
		// Remove all position classes first
		eyesElement.classList.remove('looking-left', 'looking-right', 'looking-up', 'looking-down');
		
		// Apply new position
		if (position !== 'center') {
			eyesElement.classList.add(`looking-${position}`);
		}
	}
	
	// Blink change handler
	function handleBlinkChange(isBlinkingNow) {
		if (isBlinking === isBlinkingNow) return;
		
		isBlinking = isBlinkingNow;
		
		if (!ghostSvgComponent) return;
		
		const eyesElement = ghostSvgComponent.querySelector('.ghost-eyes');
		if (!eyesElement) return;
		
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
	
	// Ambient blinking handler
	function handleAmbientBlinkingChange(enableAmbientBlinking) {
		if (ambientBlinking === enableAmbientBlinking) return;
		
		ambientBlinking = enableAmbientBlinking;
		
		if (!ghostSvgComponent) return;
		
		if (ambientBlinking) {
			scheduleBlink();
		} else {
			clearTimeout(blinkTimeoutId);
		}
	}
	
	// Recording state handler
	function handleRecordingChange(isRecordingNow) {
		if (isRecording === isRecordingNow) return;
		
		isRecording = isRecordingNow;
		
		if (!ghostSvgComponent) return;
		
		if (isRecording) {
			// Clear blink scheduling during recording
			clearTimeout(blinkTimeoutId);
			
			// Add recording class
			ghostSvgComponent.classList.add('recording');
		} else {
			ghostSvgComponent.classList.remove('recording');
			
			// Resume ambient blinking after a delay
			if (ambientBlinking) {
				setTimeout(() => {
					scheduleBlink();
				}, 1000);
			}
		}
	}
	
	// Processing state handler
	function handleProcessingChange(isProcessingNow) {
		if (isProcessing === isProcessingNow) return;
		
		isProcessing = isProcessingNow;
		
		if (!ghostSvgComponent) return;
		
		const eyesElement = ghostSvgComponent.querySelector('.ghost-eyes');
		if (!eyesElement) return;
		
		if (isProcessing) {
			// Clear blink scheduling during processing
			clearTimeout(blinkTimeoutId);
			
			// Add thinking animation
			eyesElement.classList.add('blink-thinking-hard');
		} else {
			eyesElement.classList.remove('blink-thinking-hard');
			
			// Resume ambient blinking after a delay
			if (ambientBlinking) {
				setTimeout(() => {
					scheduleBlink();
				}, 1000);
			}
		}
	}
	
	// Hover simulation handler
	function handleHoverSimulationChange(simulateHover) {
		if (isHoverSimulation === simulateHover) return;
		
		isHoverSimulation = simulateHover;
		
		if (!ghostSvgComponent) return;
		
		if (isHoverSimulation) {
			ghostSvgComponent.classList.add('hover-simulation');
		} else {
			ghostSvgComponent.classList.remove('hover-simulation');
		}
	}
	
	// Eye tracking handler
	function handleEyeTrackingChange(enableEyeTracking) {
		if (eyeTrackingEnabled === enableEyeTracking) return;
		
		eyeTrackingEnabled = enableEyeTracking;
		
		if (!ghostSvgComponent) return;
		
		const eyesElement = ghostSvgComponent.querySelector('.ghost-eyes');
		if (!eyesElement) return;
		
		// Clean up previous tracking if exists
		if (eyeTrackingRemover) {
			eyeTrackingRemover();
			eyeTrackingRemover = null;
		}
		
		if (eyeTrackingEnabled) {
			// Remove any eye position classes
			eyesElement.classList.remove('looking-left', 'looking-right', 'looking-up', 'looking-down');
			
			// Mouse move handler function
			const handleMouseMove = (event) => {
				if (!ghostSvgComponent) return;
				
				const eyesElement = ghostSvgComponent.querySelector('.ghost-eyes');
				if (!eyesElement) return;
				
				// Get ghost element bounding box
				const ghostRect = ghostSvgComponent.getBoundingClientRect();
				const ghostCenterX = ghostRect.left + ghostRect.width / 2;
				const ghostCenterY = ghostRect.top + ghostRect.height / 2;
				
				// Calculate mouse position relative to ghost center
				const mouseX = event.clientX;
				const mouseY = event.clientY;
				const distanceX = mouseX - ghostCenterX;
				const distanceY = mouseY - ghostCenterY;
				
				// Normalize to values between -1 and 1
				const maxDistanceX = window.innerWidth / 3;
				const maxDistanceY = window.innerHeight / 3;
				const normalizedX = Math.max(-1, Math.min(1, distanceX / maxDistanceX));
				const normalizedY = Math.max(-1, Math.min(1, distanceY / maxDistanceY));
				
				// Apply directly to eye element
				eyesElement.style.transform = `translate(${normalizedX * 4}px, ${normalizedY * 2}px)`;
			};
			
			// Add event listener
			document.addEventListener('mousemove', handleMouseMove);
			
			// Set up removal function
			eyeTrackingRemover = () => {
				document.removeEventListener('mousemove', handleMouseMove);
				eyesElement.style.transform = '';
				
				// Reapply eye position if needed
				if (eyePosition !== 'center') {
					eyesElement.classList.add(`looking-${eyePosition}`);
				}
			};
		} else {
			// Reset eyes position
			eyesElement.style.transform = '';
			
			// Reapply current eye position
			if (eyePosition !== 'center') {
				eyesElement.classList.add(`looking-${eyePosition}`);
			}
		}
	}
	
	// Theme specific recording handler
	function handleThemeSpecificRecordingChange(useThemeRecording) {
		if (useThemeSpecificRecording === useThemeRecording) return;
		
		useThemeSpecificRecording = useThemeRecording;
		
		// If recording, update the effect immediately
		if (isRecording && ghostSvgComponent) {
			// Remove and reapply recording class to refresh styles
			ghostSvgComponent.classList.remove('recording');
			void ghostSvgComponent.offsetWidth; // Force reflow
			ghostSvgComponent.classList.add('recording');
		}
	}
	
	// Rainbow sparkle handler
	function handleRainbowSparkleChange(enableRainbowSparkle) {
		if (isRainbowSparkle === enableRainbowSparkle) return;
		
		isRainbowSparkle = enableRainbowSparkle;
		
		if (!ghostSvgComponent) return;
		
		// Auto-switch to rainbow theme if enabling sparkle
		if (isRainbowSparkle && currentTheme !== 'rainbow') {
			handleThemeChange('rainbow');
		}
		
		const bgLayer = ghostSvgComponent.querySelector('.ghost-bg');
		if (!bgLayer) return;
		
		if (isRainbowSparkle) {
			bgLayer.classList.add('rainbow-sparkle');
		} else {
			bgLayer.classList.remove('rainbow-sparkle');
		}
	}
	
	// Custom animation handlers
	function handleAddCustomAnimation(animation) {
		customAnimations = [...customAnimations, animation];
	}
	
	function handleAnimationDescriptionChange(description) {
		animationDescription = description;
	}
	
	async function handleGenerateAnimation() {
		if (!animationDescription.trim()) {
			animationError = 'Please enter an animation description';
			return;
		}
		
		animationError = '';
		isGeneratingAnimation = true;
		
		try {
			const animationData = await animationGenerationService.generateAnimation(
				animationDescription.trim()
			);
			
			// Add to animations list
			handleAddCustomAnimation(animationData);
			
			// Clear input
			animationDescription = '';
		} catch (error) {
			console.error('Error generating animation:', error);
			animationError = 'Failed to generate animation. Please try again.';
		} finally {
			isGeneratingAnimation = false;
		}
	}
	
	function handleApplyCustomAnimation(animation) {
		if (!ghostSvgComponent || !animation) return;
		
		// Clean up previous animation
		if (currentRemoveAnimation) {
			currentRemoveAnimation();
			currentRemoveAnimation = null;
		}
		
		// Apply new animation
		try {
			currentRemoveAnimation = animationGenerationService.applyAnimation(ghostSvgComponent, animation);
			
			// Update state
			currentAnimation = animation.name;
			
			// Clean up after animation if not infinite
			if (animation.iteration !== 'infinite') {
				const durationMs = animation.duration * 1000;
				const iterations = typeof animation.iteration === 'number' ? animation.iteration : 1;
				const totalDuration = durationMs * iterations;
				
				animationTimeout = setTimeout(() => {
					if (currentRemoveAnimation) {
						currentRemoveAnimation();
						currentRemoveAnimation = null;
					}
					currentAnimation = 'none';
				}, totalDuration + 100);
			}
		} catch (error) {
			console.error('Error applying animation:', error);
			animationError = `Failed to apply animation: ${error.message}`;
		}
	}

	// =========================================================
	// Animation functions - perform actual DOM manipulations
	// =========================================================
	
	// Regular ambient blinking
	function scheduleBlink() {
		clearTimeout(blinkTimeoutId);
		
		// Don't blink during recording or processing or special animations
		if (isRecording || isProcessing || doingSpecialAnimation) {
			return;
		}
		
		// Random delay between blinks (4-8 seconds)
		const delay = 4000 + Math.random() * 4000;
		
		blinkTimeoutId = setTimeout(() => {
			if (!ghostSvgComponent) return;
			
			const eyesElement = ghostSvgComponent.querySelector('.ghost-eyes');
			if (!eyesElement) return;
			
			// Force a browser reflow to ensure animation gets reapplied
			void eyesElement.offsetWidth;
			
			// Single or double blink with randomness
			if (Math.random() < 0.25) {
				// Double blink (25% chance)
				eyesElement.classList.add('blink-double');
				setTimeout(() => {
					eyesElement.classList.remove('blink-double');
					scheduleBlink(); // Schedule next blink
				}, 680);
			} else {
				// Single blink (75% chance)
				eyesElement.classList.add('blink-single');
				setTimeout(() => {
					eyesElement.classList.remove('blink-single');
					scheduleBlink(); // Schedule next blink
				}, 300);
			}
		}, delay);
	}
	
	// Special animations that rarely happen
	function maybeDoSpecialAnimation() {
		clearTimeout(specialAnimationTimeoutId);
		
		// Very rare animation (5% chance when no other animations active)
		if (Math.random() < 0.05 && !isRecording && !isProcessing && !doingSpecialAnimation) {
			handleAnimationChange('spin');
		}
		
		// Schedule next check
		specialAnimationTimeoutId = setTimeout(maybeDoSpecialAnimation, 45000);
	}
	
	// Reset all animations
	function resetAnimations() {
		if (!ghostSvgComponent) return;
		
		// Clear any pending timeouts
		if (animationTimeout) clearTimeout(animationTimeout);
		
		const eyesElement = ghostSvgComponent.querySelector('.ghost-eyes');
		if (!eyesElement) return;
		
		// Remove animation classes
		ghostSvgComponent.classList.remove('wobble-left', 'wobble-right', 'spin');
		eyesElement.classList.remove('blink-single', 'blink-double', 'blink-thinking-hard');
		
		// Reset state
		currentAnimation = 'none';
	}
	
	// Animation Implementation Functions
	function performGreetingAnimation() {
		if (!ghostSvgComponent) return;
		
		// Use wobble animation for greeting
		handleAnimationChange('wobble-left');
		
		// Then do natural double blink after wobble completes
		setTimeout(() => {
			const eyesElement = ghostSvgComponent.querySelector('.ghost-eyes');
			if (!eyesElement) return;
			
			// First blink
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
					}, 150);
				}, 180);
			}, 150);
		}, 600);
	}
	
	function performPulseAnimation() {
		if (!ghostSvgComponent) return;
		
		// Add pulse class
		ghostSvgComponent.classList.add('ghost-pulse');
		
		// Remove class after animation completes
		setTimeout(() => {
			ghostSvgComponent.classList.remove('ghost-pulse');
		}, 600);
	}
	
	function performSpecialAnimation() {
		if (!ghostSvgComponent) return;
		
		// Reset any existing animations
		resetAnimations();
		
		// Force special animation
		doingSpecialAnimation = true;
		handleAnimationChange('spin');
	}
	
	function performFullAnimationSequence() {
		if (!ghostSvgComponent) return;
		
		// Step 1: Wobble
		handleAnimationChange('wobble-left');
		
		// Step 2: Double blink after wobble
		setTimeout(() => {
			reactToTranscript('long');
			
			// Step 3: Pulse after reaction
			setTimeout(() => {
				performPulseAnimation();
				
				// Step 4: Finally, do the spin
				setTimeout(() => {
					performSpecialAnimation();
				}, 1500);
			}, 1500);
		}, 800);
	}
	
	function startThinking() {
		if (!ghostSvgComponent) return;
		
		const eyesElement = ghostSvgComponent.querySelector('.ghost-eyes');
		if (!eyesElement) return;
		
		// Clear other blink animations
		clearTimeout(blinkTimeoutId);
		eyesElement.classList.remove('blink-single', 'blink-double', 'blinking');
		
		// Add thinking animation
		eyesElement.classList.add('blink-thinking-hard');
	}
	
	function stopThinking() {
		if (!ghostSvgComponent) return;
		
		const eyesElement = ghostSvgComponent.querySelector('.ghost-eyes');
		if (!eyesElement) return;
		
		eyesElement.classList.remove('blink-thinking-hard');
		
		// Resume ambient blinking
		if (ambientBlinking) {
			scheduleBlink();
		}
	}
	
	function reactToTranscript(textLength = 'long') {
		if (!ghostSvgComponent) return;
		
		const eyesElement = ghostSvgComponent.querySelector('.ghost-eyes');
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
	
	function restartGrowAnimation() {
		if (!ghostSvgComponent) return;
		
		// First, temporarily hide the ghost layers
		const layers = ghostSvgComponent.querySelectorAll('.ghost-layer');
		layers.forEach((layer) => {
			layer.style.animation = 'none';
			layer.style.opacity = '0';
			layer.style.transform = 'scale(0)';
		});
		
		// Force browser reflow
		void ghostSvgComponent.offsetWidth;
		
		// Then restart the animation after a tiny delay
		setTimeout(() => {
			layers.forEach((layer) => {
				layer.style.animation = '';
				layer.style.opacity = '';
				layer.style.transform = '';
				
				// Re-add the grow-ghost animation
				layer.style.animation = 'grow-ghost 2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
			});
		}, 50);
	}
</script>

<div class="container">
	<h1>Ghost SVG Reference Test</h1>
	
	<div class="test-container">
		<!-- Top Section: Ghost and State -->
		<div class="top-section">
			<!-- Ghost Display Area -->
			<div class="ghost-display">
				<svg
					bind:this={ghostSvgComponent}
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
							opacity="1"
						/>
					</g>
					
					<!-- LAYER 3: Eyes Layer -->
					<g class="ghost-layer ghost-eyes {isBlinking ? 'blinking' : ''}">
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
			
			<!-- State Display Panel - purely presentational component -->
			<StatePanel 
				{currentTheme}
				{currentAnimation}
				{eyePosition}
				{isBlinking}
				{ambientBlinking}
				{isRecording}
				{isProcessing}
				{doingSpecialAnimation}
			/>
		</div>
		
		<!-- Control Panel - purely presentational component -->
		<ControlPanel 
			{currentTheme}
			{currentAnimation}
			{eyePosition}
			{isBlinking}
			{ambientBlinking}
			{isRecording}
			{isProcessing}
			{doingSpecialAnimation}
			{isHoverSimulation}
			{eyeTrackingEnabled}
			{useThemeSpecificRecording}
			{isRainbowSparkle}
			{customAnimations}
			{animationDescription}
			{isGeneratingAnimation}
			{animationError}
			
			on:action={(e) => handleAction(e.detail)}
			on:themeChange={(e) => handleThemeChange(e.detail.theme)}
			on:animationChange={(e) => handleAnimationChange(e.detail.animation)}
			on:eyePositionChange={(e) => handleEyePositionChange(e.detail.position)}
			on:blinkChange={(e) => handleBlinkChange(e.detail.isBlinking)}
			on:ambientBlinkingChange={(e) => handleAmbientBlinkingChange(e.detail.ambientBlinking)}
			on:recordingChange={(e) => handleRecordingChange(e.detail.isRecording)}
			on:processingChange={(e) => handleProcessingChange(e.detail.isProcessing)}
			on:hoverSimulationChange={(e) => handleHoverSimulationChange(e.detail.isHoverSimulation)}
			on:eyeTrackingChange={(e) => handleEyeTrackingChange(e.detail.eyeTrackingEnabled)}
			on:themeSpecificRecordingChange={(e) => handleThemeSpecificRecordingChange(e.detail.useThemeSpecificRecording)}
			on:rainbowSparkleChange={(e) => handleRainbowSparkleChange(e.detail.isRainbowSparkle)}
			on:animationDescriptionChange={(e) => handleAnimationDescriptionChange(e.detail.description)}
			on:generateAnimation={handleGenerateAnimation}
			on:applyCustomAnimation={(e) => handleApplyCustomAnimation(e.detail.animation)}
		/>
	</div>
</div>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}
	
	h1 {
		text-align: center;
		margin-bottom: 2rem;
		color: #333;
	}
	
	.test-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-height: 95vh;
	}
	
	.top-section {
		display: flex;
		gap: 1.5rem;
		position: sticky;
		top: 0;
		z-index: 10;
	}
	
	.ghost-display {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f9f9f9;
		border-radius: 1rem;
		padding: 2rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		width: 35%;
		min-width: 280px;
	}
	
	.ghost-svg {
		width: 100%;
		max-width: 200px;
		height: auto;
	}
	
	/* Responsive adjustments */
	@media (min-width: 1100px) {
		.test-container {
			max-width: 85%;
			margin: 0 auto;
		}
		
		.ghost-display {
			padding: 2.5rem;
		}
		
		.ghost-svg {
			max-width: 220px;
		}
	}
	
	@media (max-width: 950px) {
		.top-section {
			flex-direction: column;
			position: static;
		}
		
		.ghost-display {
			width: 100%;
			min-width: auto;
			max-width: 350px;
			margin: 0 auto;
		}
	}
	
	@media (max-width: 500px) {
		.container {
			padding: 1rem;
		}
		
		.ghost-display {
			padding: 1.5rem;
		}
	}
</style>