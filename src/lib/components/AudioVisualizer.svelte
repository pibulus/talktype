<script>
	import { onMount, onDestroy } from 'svelte';

	// Audio visualization configuration
	let audioDataArray;
	let animationFrameId;
	let audioLevel = 0;
	let history = []; // Array to store audio level history
	const historyLength = 30; // Number of bars to display in history
	let analyser;
	let audioContext;
	let recording = false; // Track recording state within the component

	// Safari/iOS detection
	const userAgent = navigator.userAgent;
	const isAndroid = /Android/i.test(userAgent);
	const isiPhone = /iPhone|iPad/i.test(userAgent);
	const isMac = /Macintosh/i.test(userAgent);
	const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);

	// Flag for fallback mode - use for Safari or iOS
	const useFallbackVisualizer = isiPhone || isSafari;

	// Tweakable variables within AudioVisualizer
	let scalingFactor;
	let offset;
	let exponent;
	let detectedDevice = 'Unknown'; // Variable to store detected device

	// Platform detection for default settings
	if (isAndroid) {
		// Android specific settings
		scalingFactor = 40;
		offset = 80;
		exponent = 0.5;
		detectedDevice = 'Android';
	} else if (isiPhone) {
		// iPhone specific settings
		scalingFactor = 40;
		offset = 80;
		exponent = 0.2;
		detectedDevice = 'iPhone';
	} else if (isMac) {
		// macOS specific settings
		scalingFactor = 20;
		offset = 100;
		exponent = 0.5;
		detectedDevice = 'Mac';
	} else {
		// Default settings for other platforms
		scalingFactor = 2000;
		offset = 80;
		exponent = 0.5;
		detectedDevice = 'PC';
	}

	// ===== STANDARD AUDIO VISUALIZER =====
	async function initStandardVisualizer() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

			// Explicitly handle user gesture for Safari
			if (typeof window !== 'undefined' && window.document) {
				window.document.addEventListener(
					'click',
					() => {
						if (audioContext && audioContext.state === 'suspended') {
							audioContext.resume();
						}
					},
					{ once: true }
				);
			}

			audioContext = new (window.AudioContext || window.webkitAudioContext)();
			analyser = audioContext.createAnalyser();
			const source = audioContext.createMediaStreamSource(stream);
			source.connect(analyser);
			analyser.fftSize = 256;

			recording = true;
			startVisualizer();
		} catch (error) {
			console.error('Error accessing microphone for visualizer:', error);
			console.log('Falling back to simulated visualizer...');
			recording = false;

			// Fallback to the simulated visualizer if standard fails
			initFallbackVisualizer();
		}
	}

	// ===== FALLBACK VISUALIZER FOR SAFARI/IOS =====
	let fallbackAnimating = false;

	// Persistent variables for more natural motion
	let lastLevel = 20;
	let trend = 0;
	let peakCountdown = 0;
	let silenceCountdown = 0;

	function initFallbackVisualizer() {
		console.log('Using fallback visualizer for Safari/iOS');
		history = Array(historyLength).fill(0);
		fallbackAnimating = true;
		recording = true;
		// Reset simulation variables
		lastLevel = 20;
		trend = 0;
		peakCountdown = 0;
		silenceCountdown = 0;
		updateFallbackVisualizer();
	}

	function updateFallbackVisualizer() {
		if (!fallbackAnimating) return;

		// Only animate when recording is true
		if (recording) {
			// Create more dynamic, speech-like pattern with pronounced peaks

			// Determine if we should create a new peak
			if (peakCountdown <= 0) {
				// Random chance to create a dramatic peak (simulating louder speech)
				if (Math.random() < 0.1) {
					// Create a big peak (60-90% height)
					let peakHeight = 60 + Math.random() * 30;
					lastLevel = peakHeight;
					// Reset peak countdown - longer delay after big peaks
					peakCountdown = 5 + Math.floor(Math.random() * 5);
					// Reset silence countdown
					silenceCountdown = 0;
				} else if (Math.random() < 0.3) {
					// Create a medium peak (40-65% height)
					lastLevel = 40 + Math.random() * 25;
					// Reset peak countdown - medium delay
					peakCountdown = 3 + Math.floor(Math.random() * 3);
					// Reset silence countdown
					silenceCountdown = 0;
				} else if (Math.random() < 0.4) {
					// Occasional silence (speech pause)
					lastLevel = 5 + Math.random() * 10;
					silenceCountdown = 4 + Math.floor(Math.random() * 4);
				} else {
					// Regular level changes (20-45% height)
					lastLevel = 20 + Math.random() * 25;
					// Reset peak countdown - short delay
					peakCountdown = 2 + Math.floor(Math.random() * 2);
				}

				// Change trend direction
				trend = Math.random() < 0.5 ? -1 : 1;
			}

			// Handle silence periods
			if (silenceCountdown > 0) {
				lastLevel = Math.max(5, lastLevel * 0.8);
				silenceCountdown--;
			}

			// Add some sinusoidal movement for natural "breathing" effect
			let breathEffect = Math.sin(Date.now() / 400) * 5;

			// Apply trend (gradual rise/fall between peaks)
			lastLevel += trend * (Math.random() * 4 - 1);

			// Ensure levels stay within reasonable range
			lastLevel = Math.max(5, Math.min(90, lastLevel));

			// Countdown to next peak decision
			peakCountdown--;

			// Apply breath effect and some minor randomness
			let finalLevel = lastLevel + breathEffect + (Math.random() * 6 - 3);

			// Clamp final value
			finalLevel = Math.max(5, Math.min(90, finalLevel));

			// Update history with new generated level
			history = [finalLevel, ...history];
			if (history.length > historyLength) {
				history.pop();
			}
		} else {
			// When not recording, quickly fade out and stop
			history = history.map((level) => level * 0.8);

			// Stop animation completely if levels are very low
			let maxLevel = Math.max(...history);
			if (maxLevel < 2) {
				fallbackAnimating = false;
				history = Array(historyLength).fill(0);
				return; // Exit without scheduling next frame
			}
		}

		// Schedule next update
		animationFrameId = requestAnimationFrame(updateFallbackVisualizer);
	}

	// ===== STANDARD VISUALIZER UPDATE LOGIC =====
	let frameSkipCounter = 0;
	const frameSkipRate = 2; // Adjust this value to control the speed (higher value = slower animation)

	function updateVisualizer() {
		if (!recording || !analyser) return;

		// Skip frames to slow down the animation
		if (frameSkipCounter < frameSkipRate) {
			frameSkipCounter++;
			animationFrameId = requestAnimationFrame(updateVisualizer);
			return;
		}
		frameSkipCounter = 0;

		const bufferLength = analyser.frequencyBinCount;
		audioDataArray = new Float32Array(bufferLength);
		analyser.getFloatFrequencyData(audioDataArray);
		let sum = 0;
		for (let i = 0; i < bufferLength; i++) {
			sum += audioDataArray[i];
		}
		let linearLevel = Math.max(0, sum / bufferLength + offset); // Calculate linear level first
		let nonLinearLevel = Math.pow(linearLevel, exponent); // Apply power function for non-linear scaling
		audioLevel = Math.max(
			0,
			Math.min(100, nonLinearLevel * (100 / Math.pow(scalingFactor, exponent))) // Rescale non-linear level
		);

		// Update history - add new level to the start, remove oldest if history is too long
		history = [audioLevel, ...history];
		if (history.length > historyLength) {
			history.pop();
		}

		animationFrameId = requestAnimationFrame(updateVisualizer);
	}

	// ===== COMMON CONTROL FUNCTIONS =====
	function startVisualizer() {
		if (useFallbackVisualizer) {
			// Start fallback visualizer
			if (!fallbackAnimating) {
				fallbackAnimating = true;
				updateFallbackVisualizer();
			}
		} else if (recording && analyser) {
			// Start standard visualizer
			history = Array(historyLength).fill(0);
			updateVisualizer();
		}
	}

	function stopVisualizer() {
		recording = false;

		if (useFallbackVisualizer) {
			// Let the visualization fade out naturally
			// The fadeout and stop is handled in updateFallbackVisualizer
		} else {
			// Standard cleanup
			cancelAnimationFrame(animationFrameId);
			audioLevel = 0;
			history = [];
			if (audioContext) {
				audioContext.close();
				audioContext = null;
				analyser = null;
			}
		}
	}

	// ===== LIFECYCLE HOOKS =====
	onMount(() => {
		// Check if rainbow theme is active and apply the animation
		if (typeof window !== 'undefined') {
			// Check for theme in localStorage
			const currentTheme = localStorage.getItem('talktype-vibe');
			if (currentTheme) {
				// Apply the theme attribute to the document root for CSS targeting
				document.documentElement.setAttribute('data-theme', currentTheme);
			} else {
				// Default to peach theme if none is set
				document.documentElement.setAttribute('data-theme', 'peach');
				localStorage.setItem('talktype-vibe', 'peach');
			}
		}

		// Initialize visualizer
		if (useFallbackVisualizer) {
			initFallbackVisualizer();
		} else {
			initStandardVisualizer();
		}
	});

	$: {
		// Reactively update recording state
		if (recording) {
			if (useFallbackVisualizer) {
				if (!fallbackAnimating) {
					startVisualizer();
				}
			} else if (analyser) {
				startVisualizer();
			}
		} else if (!recording) {
			stopVisualizer();
		}
	}

	onDestroy(() => {
		fallbackAnimating = false;
		stopVisualizer();
	});
</script>

<div class="history-container standard-container">
	{#each history as level, index (index)}
		<div
			class="history-bar"
			style="height: {level}%; width: {100 / historyLength}%; left: {index *
				(100 / historyLength)}%"
		></div>
	{/each}
</div>

<style>
	.history-container {
		position: relative;
		width: 100%;
		height: 5rem;
		display: flex;
		flex-direction: row-reverse;
		border-radius: 1rem;
		overflow: hidden;
		box-shadow: inset 0 0 15px rgba(249, 168, 212, 0.15);
		background: linear-gradient(to bottom, rgba(255, 255, 255, 0.5), rgba(255, 242, 248, 0.2));
	}
	.history-bar {
		position: absolute;
		bottom: 0;
		/* Default peach gradient as fallback */
		background: linear-gradient(to top, #ffa573, #ff9f9a, #ff7fcd, #ffb6f3);
		transition: height 0.15s ease-in-out;
		border-radius: 3px 3px 0 0;
		margin-right: 1px; /* Add slight margin to prevent white line gaps */
		box-shadow: 0 0 8px rgba(249, 168, 212, 0.2); /* Subtle glow on bars */
		opacity: 0.95;
	}
	
	/* Theme-specific gradient styles - directly applied based on data-theme */
	:global([data-theme="peach"] .history-bar) {
		background: linear-gradient(to top, #ffa573, #ff9f9a, #ff7fcd, #ffb6f3);
	}
	
	:global([data-theme="mint"] .history-bar) {
		background: linear-gradient(to top, #86efac, #5eead4, #67e8f9);
	}
	
	:global([data-theme="bubblegum"] .history-bar) {
		background: linear-gradient(to top, #20c5ff, #4d7bff, #c85aff, #ee45f0, #ff3ba0, #ff1a8d);
	}

	:global([data-theme="rainbow"] .history-bar) {
		animation: hueShift 7s ease-in-out infinite, rainbowBars 3s ease-in-out infinite;
		background-image: linear-gradient(to top, #FF3D7F, #FF8D3C, #FFF949, #4DFF60, #35DEFF, #9F7AFF, #FF3D7F);
		background-size: 100% 600%;
		box-shadow: 0 0 10px rgba(255, 255, 255, 0.15), 0 0 20px rgba(255, 156, 227, 0.1);
	}
	
	/* Special animation for rainbow theme bars */
	@keyframes rainbowBars {
		0%, 100% { filter: drop-shadow(0 0 2px rgba(255, 156, 227, 0.3)); }
		25% { filter: drop-shadow(0 0 3px rgba(169, 255, 156, 0.3)); }
		50% { filter: drop-shadow(0 0 3px rgba(156, 221, 255, 0.3)); }
		75% { filter: drop-shadow(0 0 2px rgba(255, 234, 138, 0.3)); }
	}

	@keyframes hueShift {
		0%, 100% { 
			filter: hue-rotate(0deg) saturate(1.4) brightness(1.15); 
		}
		50% { 
			filter: hue-rotate(360deg) saturate(1.5) brightness(1.2); 
		}
	}
</style>