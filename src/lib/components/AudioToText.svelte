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
	let progressInterval;
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
					// Don't automatically copy to clipboard - wait for manual copy
					// await copyToClipboard(transcript);
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
			if (progressInterval) clearInterval(progressInterval);
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
	}

	// Computed button label: if recording, show "Stop Recording"; else if transcript exists, show "New Recording"; otherwise, "Start Recording"
	$: buttonLabel = recording ? 'Stop Recording' : transcript ? 'New Recording' : 'Start Recording';
</script>

<div class="mx-auto w-full max-w-sm">
	<!-- Combined recording button and progress bar -->
	<div class="relative w-full">
		{#if transcribing}
			<!-- Progress bar (transforms the button) -->
			<div
				class="progress-container relative h-[66px] w-full overflow-hidden rounded-full bg-amber-200 shadow-xl"
			>
				<div
					class="progress-bar flex h-full items-center justify-center bg-gradient-to-r from-amber-400 to-rose-300 transition-all duration-300"
					style="width: {transcriptionProgress}%;"
				></div>
			</div>
		{:else}
			<!-- Recording button -->
			<button
				class="w-full rounded-full bg-amber-400 px-10 py-5 text-xl font-bold text-black shadow-xl transition-all duration-150 ease-in-out hover:scale-105 hover:bg-amber-300 focus:outline-none active:bg-amber-500"
				on:click={toggleRecording}
				disabled={transcribing}
				aria-label="Toggle Recording"
			>
				{buttonLabel}
			</button>
		{/if}
	</div>

	<!-- Content area below button - animates between states -->
	<div class="relative mt-4 min-h-[200px]">
		<!-- Audio visualizer when recording -->
		<div
			class="absolute left-0 right-0 top-0 w-full rounded-2xl bg-white/30 p-4 shadow-md backdrop-blur-md transition-all duration-500"
			class:opacity-100={recording}
			class:opacity-0={!recording}
			class:pointer-events-none={!recording}
			style="transform: {recording ? 'translateY(0)' : 'translateY(-20px)'};"
		>
			{#if recording}
				<AudioVisualizer />
			{/if}
		</div>

		<!-- Transcript output -->
		{#if transcript}
			<!-- Speech bubble with transcript -->
			<div
				class="transcript-box absolute left-0 right-0 top-0 w-full animate-fadeIn whitespace-pre-line rounded-[2rem] border-[1.5px] border-pink-100 bg-white/95 px-8 py-10 font-mono text-base leading-relaxed text-gray-800 shadow-xl transition-all duration-500 md:text-base"
			>
				<div class="transcript-text animate-text-appear">
					{transcript}
				</div>
			</div>

			<!-- Copy button positioned below the transcript box -->
			<div class="mt-[270px] flex justify-center">
				<button
					class="copy-button relative z-20 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-600 shadow-md transition-all duration-300 hover:bg-white hover:text-gray-800"
					class:opacity-0={clipboardSuccess}
					class:pointer-events-none={clipboardSuccess}
					on:click={manualCopyToClipboard}
				>
					Copy to clipboard
				</button>
			</div>
		{/if}

		<!-- Error message -->
		{#if errorMessage}
			<p class="absolute left-0 right-0 top-0 mt-4 text-center font-medium text-red-500">
				{errorMessage}
			</p>
		{/if}
	</div>
</div>

<!-- Floating success toast - positioned fixed separately from other UI elements -->
{#if clipboardSuccess}
	<div class="clipboard-toast" aria-live="polite">
		{getRandomCopyMessage()}
	</div>
{/if}

<style>
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
		min-height: 100px;
		height: auto;
		max-height: 60vh;
		overflow-y: auto;
		padding-bottom: 24px; /* Add padding to avoid text being hidden behind copy button */
	}

	/* Make text smaller when content is long */
	.transcript-text:not(:only-child) {
		font-size: 0.875rem;
	}

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

	.clipboard-toast {
		position: fixed;
		bottom: 8px; /* Match the button's bottom position */
		left: 50%;
		transform: translateX(-50%);
		background: rgba(255, 255, 255, 0.98);
		color: rgb(79, 70, 229);
		font-weight: 600;
		padding: 0.75rem 1.5rem;
		border-radius: 2rem;
		box-shadow: 0 4px 15px -2px rgba(0, 0, 0, 0.15);
		z-index: 999; /* Ensure it's above everything */
		animation: toast-animation 1.5s ease-in-out forwards;
		pointer-events: none; /* Let clicks pass through */
	}

	@keyframes toast-animation {
		0% {
			opacity: 0;
			transform: translate(-50%, 0) scale(0.95);
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
			transform: translate(-50%, 0) scale(0.95);
		}
	}

	.copy-button {
		backdrop-filter: blur(8px);
		transition: opacity 0.3s ease-in-out;
	}

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
