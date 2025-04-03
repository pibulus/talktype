<script>
	import { geminiService } from '$lib/services/geminiService';
	import { onMount } from 'svelte';
	import AudioVisualizer from './AudioVisualizer.svelte';

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

	function getRandomCopyMessage(useSpecialMessage = false) {
		if (useSpecialMessage) {
			return focusRecoveryMessage;
		}
		return copyMessages[Math.floor(Math.random() * copyMessages.length)];
	}

	// Ghost expression functions - add personality through blinking
	function ghostThinkingHard() {
		const eyes = document.querySelector('.icon-eyes');
		if (eyes) {
			eyes.classList.add('blink-thinking-hard');
		}
	}

	function ghostStopThinking() {
		const eyes = document.querySelector('.icon-eyes');
		if (eyes) {
			eyes.classList.remove('blink-thinking-hard');
		}
	}

	function ghostReactToTranscript(textLength = 0) {
		const eyes = document.querySelector('.icon-eyes');
		if (!eyes) return;

		if (textLength > 20) {
			// For longer transcripts, do a "satisfied" double blink
			setTimeout(() => {
				eyes.classList.add('blink-once');
				setTimeout(() => {
					eyes.classList.remove('blink-once');
					setTimeout(() => {
						eyes.classList.add('blink-once');
						setTimeout(() => {
							eyes.classList.remove('blink-once');
						}, 150);
					}, 150);
				}, 150);
			}, 200);
		} else if (textLength > 0) {
			// For short transcripts, just do a single blink
			setTimeout(() => {
				eyes.classList.add('blink-once');
				setTimeout(() => {
					eyes.classList.remove('blink-once');
				}, 200);
			}, 200);
		}
	}

	// Export recording state and functions for external components
	export { recording, stopRecording, startRecording };

	async function startRecording() {
		// Don't start a new recording if already recording
		if (recording) return;

		errorMessage = '';
		transcript = '';
		recording = true;
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
				// Add wobble animation to ghost when recording stops
				const ghostIcon = document.querySelector('.icon-container');
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

					// Complete the progress bar smoothly
					cancelAnimationFrame(animationFrameId);

					// Animate to 100% smoothly
					const completeProgress = () => {
						if (transcriptionProgress < 100) {
							transcriptionProgress += (100 - transcriptionProgress) * 0.2;
							if (transcriptionProgress > 99.5) {
								transcriptionProgress = 100;
								// Add a slight delay for the completion glow effect
								setTimeout(() => {
									// Button will do a completion glow effect
									document.querySelector('.progress-container')?.classList.add('completion-pulse');

									// Add confetti celebration for successful transcription
									if (transcript && transcript.length > 20) {
										showConfettiCelebration();
									}

									setTimeout(() => {
										document
											.querySelector('.progress-container')
											?.classList.remove('completion-pulse');
										transcribing = false;
										transcriptionProgress = 0;
									}, 600);
								}, 200);
							} else {
								animationFrameId = requestAnimationFrame(completeProgress);
							}
						}
					};

					completeProgress();

					// Brief delay before showing the transcript - just enough for a smooth transition
					await new Promise((resolve) => setTimeout(resolve, 650));

					// Automatically copy to clipboard when transcription finishes
					if (transcript) {
						try {
							// Focus check - document must be focused for clipboard operations
							const isDocumentFocused = document.hasFocus();

							if (isDocumentFocused) {
								await navigator.clipboard.writeText(transcript);
								console.log('📋 Transcript copied to clipboard');

								// Show toast notification right away
								clipboardSuccess = true;
								if (clipboardTimer) clearTimeout(clipboardTimer);
								clipboardTimer = setTimeout(() => {
									clipboardSuccess = false;
								}, 3000); // Longer visibility for better UX
							} else {
								// Document not focused - try to bring focus back
								console.log('📋 Document not focused - attempting to regain focus');

								// Try to focus the window
								window.focus();

								// Wait a short time for focus to take effect
								setTimeout(async () => {
									if (document.hasFocus()) {
										// We have focus now, try again
										try {
											await navigator.clipboard.writeText(transcript);
											console.log('📋 Transcript copied to clipboard after focus recovery');
											clipboardSuccess = true;

											if (clipboardTimer) clearTimeout(clipboardTimer);
											clipboardTimer = setTimeout(() => {
												clipboardSuccess = false;
											}, 3000);
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
				}
			};

			mediaRecorder.start();
			console.log('✅ Recording started');
		} catch (err) {
			console.error('❌ Error accessing microphone:', err);
			errorMessage = 'Error accessing microphone. Please check microphone permissions.';
			recording = false;
		}
	}

	function stopRecording() {
		if (mediaRecorder && mediaRecorder.state === 'recording') {
			mediaRecorder.stop();
			console.log('🛑 Stop recording');
		}
	}

	// Handle button press animation with classes
	function animateButtonPress() {
		const recordButton = document.querySelector('.record-button');
		if (recordButton) {
			// Remove any existing animation classes and force a reflow
			recordButton.classList.remove('button-press');
			void recordButton.offsetWidth; // Force reflow
			
			// Apply the immediate press animation
			recordButton.classList.add('button-press');
			setTimeout(() => {
				recordButton.classList.remove('button-press');
			}, 300);
		}
	}
	function toggleRecording() {
		// Animate button press
		animateButtonPress();

		if (recording) {
			stopRecording();
		} else {
			// Subtle pulse ghost icon when starting a new recording
			const ghostIcon = document.querySelector('.icon-container');
			if (ghostIcon) {
				ghostIcon.classList.add('ghost-pulse');
				setTimeout(() => {
					ghostIcon.classList.remove('ghost-pulse');
				}, 500);
			}
			startRecording();
		}
	}

	// Cleanup
	onMount(() => {
		return () => {
			if (animationFrameId) cancelAnimationFrame(animationFrameId);
			if (clipboardTimer) clearTimeout(clipboardTimer);
		};
	});

	// Add/remove recording class on ghost icon when recording state changes
	$: {
		if (typeof window !== 'undefined') {
			const ghostIcon = document.querySelector('.icon-container');
			if (ghostIcon) {
				if (recording) {
					ghostIcon.classList.add('recording');
				} else {
					ghostIcon.classList.remove('recording');
				}
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
			const textToCopy = getEditedTranscript();

			// Focus check before attempting clipboard operation
			if (document.hasFocus()) {
				await navigator.clipboard.writeText(textToCopy);
				console.log('📋 Transcript copied to clipboard');
				clipboardSuccess = true;

				// Auto-hide the clipboard success message after 3 seconds
				if (clipboardTimer) clearTimeout(clipboardTimer);
				clipboardTimer = setTimeout(() => {
					clipboardSuccess = false;
				}, 3000);
			} else {
				// Document not focused - show friendly notification and try to recover
				console.log('📋 Document not focused - trying to bring window to focus');

				// Attempt to focus window first
				window.focus();

				// Wait a short time for focus to take effect
				setTimeout(async () => {
					if (document.hasFocus()) {
						// Try again now that we have focus
						try {
							await navigator.clipboard.writeText(textToCopy);
							console.log('📋 Transcript copied to clipboard after focus recovery');
							clipboardSuccess = true;

							if (clipboardTimer) clearTimeout(clipboardTimer);
							clipboardTimer = setTimeout(() => {
								clipboardSuccess = false;
							}, 3000);
						} catch (focusError) {
							console.error('❌ Still failed after focus attempt:', focusError);
							// Show more helpful message that doesn't look like an error
							clipboardSuccess = true; // Show toast anyway with special message
							if (clipboardTimer) clearTimeout(clipboardTimer);
							clipboardTimer = setTimeout(() => {
								clipboardSuccess = false;
							}, 5000);
						}
					} else {
						// Still no focus, show user-friendly message
						console.log('📋 Document still not focused - clipboard operation not possible');
						errorMessage = '';
					}
				}, 100);
			}
		} catch (err) {
			console.error('❌ Failed to copy transcript to clipboard: ', err);
			clipboardSuccess = false;
			errorMessage = '';
		}
	}

	// Confetti celebration effect for successful transcription
	function showConfettiCelebration() {
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
			const delay = Math.random() * 0.7; // Delay 0-0.7s
			const duration = Math.random() * 1.5 + 1.5; // Duration 1.5-3s
			const rotation = Math.random() * 720 - 360; // Rotation -360 to +360 degrees

			confetti.style.left = `${startPos}%`;
			confetti.style.top = '0';
			confetti.style.animationDelay = `${delay}s`;
			confetti.style.animationDuration = `${duration}s`;
			confetti.style.transform = `rotate(${rotation}deg)`;

			// Add to container
			container.appendChild(confetti);
		}

		// Remove container after animation completes
		setTimeout(() => {
			document.body.removeChild(container);
		}, 4000); // Slightly longer than the longest animation
	}

	// Function to calculate responsive font size based on transcript length
	function getResponsiveFontSize(text) {
		if (!text) return 'text-lg'; // Default size

		const length = text.length;
		if (length < 50) return 'text-xl md:text-2xl'; // Very short text
		if (length < 150) return 'text-lg md:text-xl'; // Short text
		if (length < 300) return 'text-base md:text-lg'; // Medium text
		if (length < 500) return 'text-base'; // Medium-long text
		return 'text-sm md:text-base'; // Long text
	}

	// Reactive font size based on transcript length
	$: responsiveFontSize = getResponsiveFontSize(transcript);

	// Computed button label: if recording, show "Stop Recording"; else if transcript exists, show "New Recording"; otherwise, "Start Recording"
	$: buttonLabel = recording ? 'Stop Recording' : transcript ? 'New Recording' : 'Start Recording';
</script>

<!-- Main wrapper with fixed position to prevent pushing page layout -->
<div class="main-wrapper mx-auto w-full">
	<!-- Recording button/progress bar section - always in same position -->
	<div class="button-section relative flex w-full justify-center">
		<div class="button-container w-full max-w-[600px]">
			{#if transcribing}
				<!-- Progress bar (transforms the button) -->
				<div
					class="progress-container relative h-[66px] w-full overflow-hidden rounded-full bg-amber-200 shadow-md shadow-black/10"
				>
					<div
						class="progress-bar flex h-full items-center justify-center bg-gradient-to-r from-amber-400 to-rose-300 transition-all duration-300"
						style="width: {transcriptionProgress}%;"
					></div>
				</div>
			{:else}
				<!-- Recording button -->
				<button
					class="record-button w-full rounded-full bg-amber-400 px-10 py-5 text-xl font-bold text-black shadow-md shadow-black/10 transition-all duration-150 ease-in-out hover:scale-105 hover:bg-amber-300 focus:outline-none active:scale-95 active:bg-amber-500 active:shadow-inner"
					on:click={toggleRecording}
					disabled={transcribing}
					aria-label="Toggle Recording"
				>
					{buttonLabel}
				</button>
			{/if}
		</div>
	</div>

	<!-- Dynamic content area that ensures spacing consistency without layout shifts -->
	<div class="position-wrapper relative mb-20 mt-6 w-full">
		<!-- Fixed positioned content that won't affect document flow -->
		<div class="content-container">
			<!-- Audio visualizer - absolutely positioned to not push content up -->
			{#if recording}
				<div class="visualizer-container absolute left-0 top-0 flex w-full justify-center">
					<div class="wrapper-container flex w-full justify-center">
						<div
							class="visualizer-wrapper mx-auto w-full max-w-[600px] animate-fadeIn rounded-[2rem] border-[1.5px] border-pink-100 bg-white/80 p-4 backdrop-blur-md"
							style="box-shadow: 0 10px 25px -5px rgba(249, 168, 212, 0.3), 0 8px 10px -6px rgba(249, 168, 212, 0.2), 0 0 15px rgba(249, 168, 212, 0.15);"
						>
							<AudioVisualizer />
						</div>
					</div>
				</div>
			{/if}

			<!-- Transcript output - only visible when not recording and has transcript -->
			{#if transcript && !recording}
				<div class="transcript-wrapper animate-fadeIn-from-top">
					<!-- Speech bubble with transcript -->
					<div class="wrapper-container flex w-full justify-center">
						<div class="transcript-box-wrapper mx-auto w-full max-w-[600px]">
							<!-- Editable transcript box -->
							<div
								class="transcript-box animate-shadow-appear relative w-full whitespace-pre-line rounded-[2rem] border-[1.5px] border-pink-100 bg-white/95 px-6 py-5 font-mono leading-relaxed text-gray-800 shadow-xl"
							>
								<div
									class={`transcript-text ${responsiveFontSize} animate-text-appear`}
									contenteditable="true"
									role="textbox"
									aria-label="Transcript editor"
									bind:this={editableTranscript}
								>
									{transcript}
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

<!-- Floating success toast - positioned fixed and independently from content -->
{#if clipboardSuccess}
	<div class="toast-container flex w-full justify-center">
		<div class="clipboard-toast {!document.hasFocus() ? 'focus-warning' : ''}" aria-live="polite">
			<!-- Ghost icon to match app theme -->
			<div class="toast-ghost">
				<svg viewBox="0 0 24 24" class="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M12,2 C7.6,2 4,5.6 4,10 L4,17 C4,18.1 4.9,19 6,19 L8,19 L8,21 C8,21.6 8.4,22 9,22 C9.3,22 9.5,21.9 9.7,21.7 L12.4,19 L18,19 C19.1,19 20,18.1 20,17 L20,10 C20,5.6 16.4,2 12,2 Z"
						fill="currentColor"
						opacity="0.9"
						transform="scale(0.95)"
					/>
					<!-- Eyes for ghost -->
					<circle cx="9" cy="10" r="1.2" fill="white" />
					<circle cx="15" cy="10" r="1.2" fill="white" />
				</svg>
			</div>
			<!-- Message with fun emojis -->
			<span>{document.hasFocus() ? getRandomCopyMessage() : focusRecoveryMessage}</span>
		</div>
	</div>
{/if}

<style>
	/* Main wrapper to ensure fixed positioning */
	.main-wrapper {
		position: relative;
		z-index: 1;
		width: 100%;
	}

	/* Position wrapper to create a stable layout without shifts */
	.position-wrapper {
		min-height: 150px; /* Increased to accommodate visualizer without pushing content */
		max-height: 600px; /* Cap the height to prevent excessive expansion */
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative; /* Ensure proper positioning context */
		overflow-y: visible; /* Allow overflow without jumping */
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
		animation: textAppear 0.5s cubic-bezier(0.1, 0.7, 0.2, 1);
		will-change: opacity, transform;
	}

	@keyframes textAppear {
		0% {
			opacity: 0;
			transform: translateY(3px);
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
		min-height: 80px;
		height: auto;
		max-height: 400px; /* Fixed pixel height instead of vh to prevent layout shifts */
		overflow-y: auto;
		/* Custom scrollbar styling */
		scrollbar-width: thin;
		scrollbar-color: rgba(249, 168, 212, 0.3) transparent;
		transition: all 0.2s ease;
		/* Performance optimization */
		will-change: transform, opacity;
		backface-visibility: hidden;
		-webkit-font-smoothing: subpixel-antialiased;
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

	/* Webkit scrollbar styling */
	.transcript-box::-webkit-scrollbar {
		width: 6px;
	}

	.transcript-box::-webkit-scrollbar-track {
		background: transparent;
	}

	.transcript-box::-webkit-scrollbar-thumb {
		background-color: rgba(249, 168, 212, 0.3);
		border-radius: 20px;
	}

	/* Make transcript editable with a cursor */
	.transcript-text {
		cursor: text;
		outline: none;
		transition: all 0.2s ease;
	}

	.transcript-text:hover {
		color: #333;
	}

	.transcript-text:focus {
		color: #000;
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

	/* Toast container for alignment with button */
	.toast-container {
		position: fixed;
		bottom: 2rem; /* 8 in Tailwind units (bottom-8) */
		left: 0;
		right: 0;
		z-index: 999;
		pointer-events: none;
	}

	@media (min-width: 768px) {
		.toast-container {
			bottom: 3rem; /* 12 in Tailwind units (md:bottom-12) */
		}
	}

	/* Toast notification - soft gradient background with subtle styling */
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
			0 8px 15px -3px rgba(212, 180, 241, 0.25),
			0 3px 8px -2px rgba(254, 205, 211, 0.15),
			0 0 0 1px rgba(255, 232, 242, 0.6) inset;
		backdrop-filter: blur(8px);
		animation:
			toast-bounce 0.4s ease-[cubic-bezier(0.34, 1.56, 0.64, 1)],
			toast-fade 3.5s ease-in-out forwards;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem; /* gap-2 */
		width: 100%;
		max-width: 600px; /* Match button width exactly */
		letter-spacing: -0.01em; /* tracking-tight */
		border: 1.5px solid rgba(249, 168, 212, 0.3);
		text-align: center;
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
			0 8px 15px -3px rgba(251, 211, 141, 0.3),
			0 3px 8px -2px rgba(254, 215, 170, 0.2),
			0 0 0 1px rgba(255, 237, 213, 0.7) inset;
		animation:
			toast-bounce 0.4s ease-[cubic-bezier(0.34, 1.56, 0.64, 1)],
			toast-fade 4.5s ease-in-out forwards;
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

	/* Button animations */
	.button-press {
		animation: button-press 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	@keyframes button-press {
		0% {
			transform: scale(1);
		}
		30% {
			transform: scale(0.95);
			background-color: #f59e0b;
			box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
		}
		60% {
			transform: scale(1.02);
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

	/* Media queries for mobile responsiveness */
	@media (max-width: 640px) {
		.transcript-box {
			padding: 1rem 1.25rem; /* Adjusted padding on mobile */
			border-radius: 1.5rem;
		}

		.clipboard-toast {
			font-size: 1rem;
			padding: 0.9rem 1.3rem;
			max-width: calc(100% - 40px);
		}

		.toast-ghost svg {
			height: 20px;
			width: 20px;
		}

		.button-container,
		.visualizer-wrapper,
		.transcript-box-wrapper {
			width: calc(100% - 20px);
		}
	}

	/* Even smaller screens */
	@media (max-width: 380px) {
		.clipboard-toast {
			font-size: 0.9rem;
			padding: 0.75rem 1.1rem;
		}

		.toast-ghost svg {
			height: 18px;
			width: 18px;
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
		animation: confetti-fall 3s ease-in-out forwards;
		opacity: 0.9;
	}

	@keyframes confetti-fall {
		0% {
			transform: translateY(-10px) rotate(0deg) scale(0.7);
			opacity: 0;
		}
		10% {
			opacity: 1;
		}
		25% {
			transform: translateY(25vh) translateX(20px) rotate(90deg) scale(1);
		}
		50% {
			transform: translateY(50vh) translateX(-15px) rotate(180deg) scale(0.9);
		}
		75% {
			transform: translateY(75vh) translateX(10px) rotate(270deg) scale(0.8);
			opacity: 1;
		}
		100% {
			transform: translateY(105vh) translateX(-20px) rotate(360deg) scale(0.7);
			opacity: 0;
		}
	}
</style>
