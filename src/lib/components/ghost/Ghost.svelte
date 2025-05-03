<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import './ghost-animations.css';
	import './ghost-themes.css';
	import ghostPathsUrl from './ghost-paths.svg?url';
	import { 
		ghostAnimationStore, 
		isGhostRecording, 
		isGhostProcessing,
		ghostAnimationState,
		eyesState,
		bodyState,
		themeState,
		debugMode
	} from './stores';
	
	// Props - matches the original Ghost.svelte API
	// These are now just for backward compatibility and syncing with the store
	export let isRecording = false;
	export let isProcessing = false;
	export let animationState = 'idle'; // 'idle', 'wobble-start', 'wobble-stop'
	export let debug = false; // Enable debug mode
	
	// DOM element references
	let container;
	let ghostSvg;
	let eyesElement;
	let backgroundElement;
	
	// Event dispatcher
	const dispatch = createEventDispatcher();
	
	// Sync props with the store
	$: if (isRecording !== $isGhostRecording) {
		ghostAnimationStore.setRecording(isRecording);
	}

	$: if (isProcessing !== $isGhostProcessing) {
		ghostAnimationStore.setProcessing(isProcessing);
	}

	$: if (animationState !== $ghostAnimationState) {
		ghostAnimationStore.setAnimationState(animationState);
	}
	
	$: if (debug !== $debugMode) {
		ghostAnimationStore.setDebugMode(debug);
	}
	
	// Force a browser reflow to ensure animations apply correctly
	function forceReflow(element) {
		if (!element) return;
		void element.offsetWidth;
	}
	
	// Initialize animation system
	function initializeAnimationSystem() {
		console.log('🔍 Checking ghost SVG element:', !!ghostSvg);
		
		if (!ghostSvg) {
			console.error('❌ Ghost SVG element not found! Animation initialization failed.');
			return false;
		}
		
		// Get required elements
		const eyesContainer = ghostSvg.querySelector('.ghost-eyes');
		const leftEye = ghostSvg.querySelector('.ghost-eye-left');
		const rightEye = ghostSvg.querySelector('.ghost-eye-right');
		backgroundElement = ghostSvg.querySelector('.ghost-bg');
		
		// Store references to individual eyes and the container
		eyesElement = {
			container: eyesContainer,
			left: leftEye,
			right: rightEye
		};
		
		console.log('🔍 Found ghost sub-elements:', {
			eyesContainer: !!eyesContainer,
			leftEye: !!leftEye,
			rightEye: !!rightEye,
			background: !!backgroundElement
		});
		
		if (!leftEye || !rightEye) {
			console.error('❌ Ghost eye elements not found! Eye animation will not work.');
			return false;
		}
		
		console.log('👁️ Initializing animation system with elements');
		
		try {
			// Initialize the store with DOM elements
			if (typeof ghostAnimationStore.initialize === 'function') {
				ghostAnimationStore.initialize({
					ghost: ghostSvg,
					eyes: {
						container: eyesElement.container,
						left: eyesElement.left,
						right: eyesElement.right
					},
					background: backgroundElement
				});
				
				console.log('✅ Successfully initialized store with DOM elements');
			} else {
				console.error('❌ ghostAnimationStore.initialize is not a function!', ghostAnimationStore);
				return false;
			}
		} catch (err) {
			console.error('❌ Error initializing ghost animation system:', err);
			return false;
		}
		
		// Test direct DOM manipulation to see if it works
		try {
			console.log('🧪 Testing direct DOM manipulation on individual eyes');
			
			// Test left eye
			if (eyesElement.left) {
				const leftEyeTransform = eyesElement.left.style.transform;
				eyesElement.left.style.transform = 'translate(5px, 5px)';
				setTimeout(() => {
					eyesElement.left.style.transform = leftEyeTransform || '';
				}, 100);
			}
			
			// Test right eye
			if (eyesElement.right) {
				const rightEyeTransform = eyesElement.right.style.transform;
				eyesElement.right.style.transform = 'translate(5px, 5px)';
				setTimeout(() => {
					eyesElement.right.style.transform = rightEyeTransform || '';
				}, 100);
			}
		} catch (err) {
			console.error('❌ Error testing DOM manipulation:', err);
		}
		
		return true;
	}
	
	// Handle click - toggle recording
	function handleClick() {
		dispatch('toggleRecording');
	}
	
	// Lifecycle hooks
	onMount(() => {
		console.log('Ghost Component Mounting');
		
		// DOM won't be ready immediately, wait a short time
		setTimeout(() => {
			const initialized = initializeAnimationSystem();
			
			if (initialized && browser) {
				// Set up eye tracking with mouse movement
				document.addEventListener('mousemove', handleMouseMove, { passive: true });
			}
			
			// Sync initial state
			ghostAnimationStore.syncAllStates?.();
		}, 100);
	});
	
	onDestroy(() => {
		console.log('Ghost Component Cleanup');
		
		// Clean up event listeners
		if (browser) {
			document.removeEventListener('mousemove', handleMouseMove);
		}
		
		// Clean up animation system
		ghostAnimationStore.cleanup?.();
	});
	
	// Handle mouse movement for eye tracking 
	function handleMouseMove(event) {
		// Skip if eyes are closed - following the working implementation approach
		if ($eyesState.closed) return;

		if (!ghostSvg) return;
		
		// Calculate relative position
		const ghostRect = ghostSvg.getBoundingClientRect();
		const ghostCenterX = ghostRect.left + ghostRect.width / 2;
		const ghostCenterY = ghostRect.top + ghostRect.height / 2;
		
		const distanceX = event.clientX - ghostCenterX;
		const distanceY = event.clientY - ghostCenterY;
		
		// Normalize position (range: -1 to 1)
		const maxDistanceX = window.innerWidth / 3;
		const maxDistanceY = window.innerHeight / 3;
		const normalizedX = Math.max(-1, Math.min(1, distanceX / maxDistanceX));
		const normalizedY = Math.max(-1, Math.min(1, distanceY / maxDistanceY));
		
		// Apply smoothing (like in the working implementation)
		const sensitivity = 0.2;
		const currentX = $eyesState.position?.x || 0;
		const currentY = $eyesState.position?.y || 0;
		
		const newX = currentX + (normalizedX - currentX) * sensitivity;
		const newY = currentY + (normalizedY - currentY) * sensitivity;
		
		// Update store - which will directly update the inline style
		ghostAnimationStore.update(state => ({
			...state,
			eyes: {
				...state.eyes,
				position: { x: newX, y: newY }
			}
		}));
	}
	
	// Export all public methods with store handling
	export function pulse() {
		ghostAnimationStore.pulse();
	}
	
	export function startThinking() {
		ghostAnimationStore.setProcessing(true);
	}
	
	export function stopThinking() {
		ghostAnimationStore.setProcessing(false);
	}
	
	export function reactToTranscript(textLength = 0) {
		ghostAnimationStore.reactToTranscript(textLength);
	}
	
	export function forceWobble(options = {}) {
		ghostAnimationStore.forceWobble(options);
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
	aria-pressed={$isGhostRecording.toString()}
>
	<svg
		bind:this={ghostSvg}
		viewBox="0 0 1024 1024"
		xmlns="http://www.w3.org/2000/svg"
		xmlns:xlink="http://www.w3.org/1999/xlink"
		class="ghost-svg theme-{$themeState.current} {$isGhostRecording ? 'recording' : ''}"
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

		<g class="ghost-layer ghost-bg">
			<use
				xlink:href={ghostPathsUrl}
				href={ghostPathsUrl + "#ghost-background"}
				class="ghost-shape"
				fill="url(#{$themeState.current}Gradient)"
			/>
		</g>

		<g class="ghost-layer ghost-outline">
			<use
				xlink:href={ghostPathsUrl}
				href={ghostPathsUrl + "#ghost-body-path"}
				class="ghost-outline-path"
				fill="#000000"
				opacity="1"
			/>
		</g>

		<g class="ghost-layer ghost-eyes">
			<use
				xlink:href={ghostPathsUrl}
				href={ghostPathsUrl + "#ghost-eye-left-path"}
				class="ghost-eye ghost-eye-left"
				style={$eyesState.closed 
					? 'transform: scaleY(0.05);' 
					: `transform: translate(${($eyesState.position?.x || 0) * 4}px, ${($eyesState.position?.y || 0) * 2}px);`}
				fill="#000000"
			/>
			<use
				xlink:href={ghostPathsUrl}
				href={ghostPathsUrl + "#ghost-eye-right-path"}
				class="ghost-eye ghost-eye-right"
				style={$eyesState.closed 
					? 'transform: scaleY(0.05);' 
					: `transform: translate(${($eyesState.position?.x || 0) * 4}px, ${($eyesState.position?.y || 0) * 2}px);`}
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
	
	/* Individual eye elements get transform properties */
	.ghost-eye {
		will-change: transform;
		transform-origin: center center;
	}
</style>