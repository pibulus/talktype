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

	// Fun copy confirmation messages
	const copyMessages = [
		'Copied! ✨',
		'Boom! Copied.',
		'In your clipboard!',
		'Text grabbed!',
		'Copied to clipboard!',
		'All yours!',
		'Snagged it!',
		'Text copied!',
		'Saved to clipboard!',
		'Done! ✓'
	];

	function getRandomCopyMessage() {
		return copyMessages[Math.floor(Math.random() * copyMessages.length)];
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

					// Short delay before showing the transcript for a smooth transition
					await new Promise((resolve) => setTimeout(resolve, 1500));
					// Automatically copy to clipboard when transcription finishes
					if (transcript) {
						await copyToClipboard(transcript);
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

	function toggleRecording() {
		if (recording) {
			stopRecording();
		} else {
			// Blink ghost icon when starting a new recording
			const ghostIcon = document.querySelector('.icon-container');
			if (ghostIcon) {
				ghostIcon.classList.add('ghost-blink');
				setTimeout(() => {
					ghostIcon.classList.remove('ghost-blink');
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

	async function copyToClipboard(text) {
		try {
			await navigator.clipboard.writeText(text);
			console.log('📋 Transcript copied to clipboard');
			clipboardSuccess = true;

			// Auto-hide the clipboard success message after 1.5 seconds
			if (clipboardTimer) clearTimeout(clipboardTimer);
			clipboardTimer = setTimeout(() => {
				clipboardSuccess = false;
			}, 1500);
		} catch (err) {
			console.error('❌ Failed to copy transcript to clipboard: ', err);
			clipboardSuccess = false;
			errorMessage = 'Transcription copied to page, but could not copy to clipboard automatically.';
		}
	}

	function manualCopyToClipboard() {
		copyToClipboard(transcript);

		// Add animation to the button when clicked
		const copyButton = document.querySelector('.copy-button');
		if (copyButton) {
			copyButton.classList.add('copy-button-pop');
			setTimeout(() => {
				copyButton.classList.remove('copy-button-pop');
			}, 300);
		}
	}

	// Computed button label: if recording, show "Stop Recording"; else if transcript exists, show "New Recording"; otherwise, "Start Recording"
	$: buttonLabel = recording ? 'Stop Recording' : transcript ? 'New Recording' : 'Start Recording';
</script>

<!-- Main wrapper with fixed position to prevent pushing page layout -->
<div class="main-wrapper mx-auto w-full max-w-sm">
	<!-- Recording button/progress bar section - always in same position -->
	<div class="button-section relative w-full">
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
				class="w-full rounded-full bg-amber-400 px-10 py-5 text-xl font-bold text-black shadow-md shadow-black/10 transition-all duration-150 ease-in-out hover:scale-105 hover:bg-amber-300 focus:outline-none active:bg-amber-500"
				on:click={toggleRecording}
				disabled={transcribing}
				aria-label="Toggle Recording"
			>
				{buttonLabel}
			</button>
		{/if}
	</div>

	<!-- Dynamic content area - fixed height with absolute positioning -->
	<div class="dynamic-content mb-16 mt-4">
		<!-- Fixed height container to prevent layout shifts -->
		<div class="content-container relative" style="min-height: 200px;">
			<!-- Audio visualizer - only visible when recording -->
			{#if recording}
				<div
					class="visualizer-wrapper animate-fadeIn rounded-2xl bg-white/30 p-4 shadow-md shadow-black/10 backdrop-blur-md"
				>
					<AudioVisualizer />
				</div>
			{/if}

			<!-- Transcript output - only visible when not recording and has transcript -->
			{#if transcript && !recording}
				<div class="transcript-wrapper animate-fadeIn">
					<!-- Speech bubble with transcript -->
					<div
						class="transcript-box w-full whitespace-pre-line rounded-[2rem] border-[1.5px] border-pink-100 bg-white/95 px-8 py-10 font-mono text-base leading-relaxed text-gray-800 shadow-xl md:text-base"
					>
						<div class="transcript-text animate-text-appear">
							{transcript}
						</div>
					</div>

					<!-- Copy button positioned directly below transcript box -->
					<div class="mt-4 w-full text-center">
						<button
							class="copy-button relative rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-600 shadow-md shadow-black/10 transition-all duration-300 hover:bg-white hover:text-indigo-600"
							on:click={manualCopyToClipboard}
						>
							Copy to clipboard
						</button>
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
	<div class="clipboard-toast" aria-live="polite">
		{getRandomCopyMessage()}
	</div>
{/if}

<!-- Fixed footer -->
<footer class="app-footer">
	<div class="mx-auto max-w-7xl px-4">
		<p>© 2025 TalkType • Transcribe with ease</p>
	</div>
</footer>

<style>
	/* Main wrapper to ensure fixed positioning */
	.main-wrapper {
		position: relative;
		z-index: 1;
	}

	/* Content container with controlled height */
	.content-container {
		position: relative;
		overflow: visible;
	}

	/* Common animation for fading elements in */
	.animate-fadeIn {
		animation: localFadeIn 0.8s ease-out forwards;
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

	.animate-text-appear {
		animation: textAppear 0.8s ease-out;
	}

	@keyframes textAppear {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
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
		max-height: 60vh;
		overflow-y: auto;
		padding-bottom: 24px; /* Add padding to avoid text being hidden behind copy button */

		/* Custom scrollbar styling */
		scrollbar-width: thin;
		scrollbar-color: rgba(249, 168, 212, 0.3) transparent;
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

	/* Make text smaller when content is long */
	.transcript-text:not(:only-child) {
		font-size: 0.875rem;
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

	/* Toast notification */
	.clipboard-toast {
		position: fixed;
		bottom: 24px;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(255, 255, 255, 0.98);
		color: rgb(79, 70, 229);
		font-weight: 600;
		padding: 0.75rem 1.5rem;
		border-radius: 2rem;
		box-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.1);
		z-index: 999; /* Ensure it's above everything */
		animation: toast-animation 1.5s ease-in-out forwards;
		pointer-events: none; /* Let clicks pass through */
	}

	@keyframes toast-animation {
		0% {
			opacity: 0;
			transform: translate(-50%, 10px) scale(0.95);
		}
		15% {
			opacity: 1;
			transform: translate(-50%, 0) scale(1);
		}
		85% {
			opacity: 1;
			transform: translate(-50%, 0) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -10px) scale(0.95);
		}
	}

	/* Copy button styling */
	.copy-button {
		backdrop-filter: blur(8px);
		transition: all 0.3s ease-in-out;
	}

	.copy-button:hover {
		box-shadow:
			0 10px 15px -3px rgba(99, 102, 241, 0.1),
			0 4px 6px -4px rgba(99, 102, 241, 0.05);
		transform: translateY(-1px);
		color: rgb(79, 70, 229);
	}

	/* Fixed footer */
	.app-footer {
		position: fixed;
		bottom: 0;
		left: 0;
		width: 100%;
		background-color: rgba(254, 250, 244, 0.8);
		backdrop-filter: blur(8px);
		border-top: 1px solid rgba(0, 0, 0, 0.05);
		z-index: 10;
		padding: 0.75rem 0;
		font-size: 0.875rem;
		color: #888;
		text-align: center;
	}

	/* Button pop animation when clicked */
	:global(.copy-button-pop) {
		animation: button-pop 0.3s ease-in-out;
	}

	@keyframes button-pop {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.05);
		}
		100% {
			transform: scale(1);
		}
	}

	/* Ghost icon animations */
	@keyframes ghost-blink {
		0% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.7;
			transform: scale(1.1);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}

	:global(.ghost-blink) {
		animation: ghost-blink 0.5s ease-in-out;
	}
</style>
