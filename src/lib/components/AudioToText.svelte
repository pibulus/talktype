<script>
	import { geminiService } from '$lib/services/geminiService';

	let recording = false;
	let mediaRecorder;
	let audioChunks = [];
	let transcript = '';
	let errorMessage = '';
	let loadingDots = ''; // For loading animation
	let transcribing = false;
	let clipboardSuccess = false; // Track clipboard success

	// Audio level visualization variables
	let audioContext;
	let analyser;
	let audioDataArray;
	let animationFrameId;
	let audioLevel = 0; // 0 to 100

	async function startRecording() {
		errorMessage = '';
		transcript = '';
		recording = true;
		audioChunks = [];
		loadingDots = ''; // Reset loading dots
		transcribing = false;
		clipboardSuccess = false; // Reset clipboard success
		audioLevel = 0; // Reset audio level

		// Start loading dots animation
		const intervalId = setInterval(() => {
			loadingDots += '.';
			if (loadingDots.length > 3) {
				loadingDots = '';
			}
		}, 500);

		try {
			console.log('🎤 Start recording');
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mediaRecorder = new MediaRecorder(stream);

			// Setup audio analysis for volume meter
			audioContext = new (globalThis.window.AudioContext || globalThis.window.webkitAudioContext)();
			analyser = audioContext.createAnalyser();
			const source = audioContext.createMediaStreamSource(stream);
			source.connect(analyser);
			analyser.fftSize = 256;
			const bufferLength = analyser.frequencyBinCount;
			audioDataArray = new Float32Array(bufferLength);

			// Start visualizer update loop
			function updateVisualizer() {
				if (!recording) return; // Stop if not recording
				analyser.getFloatFrequencyData(audioDataArray);
				let sum = 0;
				for (let i = 0; i < bufferLength; i++) {
					sum += audioDataArray[i];
				}
				audioLevel = Math.max(0, Math.min(100, (sum / bufferLength + 140) * (100 / 140))); // Normalize and scale to 0-100
				animationFrameId = requestAnimationFrame(updateVisualizer);
			}
			updateVisualizer();


			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunks.push(event.data);
				}
			};

			mediaRecorder.onstop = async () => {
				clearInterval(intervalId); // Stop loading dots animation
				loadingDots = ''; // Clear loading dots
				transcribing = true;
				cancelAnimationFrame(animationFrameId); // Stop visualizer update
				audioLevel = 0; // Reset audio level when stopped
				if (audioContext) {
					audioContext.close(); // Close audio context
					audioContext = null;
					analyser = null;
				}


				const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
				try {
					console.log('🤖 Transcription started');
					transcript = await geminiService.transcribeAudio(audioBlob);
					await copyToClipboard(transcript); // Call clipboard function
				} catch (error) {
					console.error('❌ Transcription error:', error);
					errorMessage = error.message;
					transcript = '';
				} finally {
					recording = false;
					transcribing = false;
				}
			};

			mediaRecorder.start();
			console.log('✅ Recording started');
		} catch (err) {
			clearInterval(intervalId); // Stop loading dots animation in case of error
			loadingDots = ''; // Clear loading dots
			transcribing = false;
			cancelAnimationFrame(animationFrameId); // Stop visualizer update in error case
			audioLevel = 0; // Reset audio level in error case
			if (audioContext) {
				audioContext.close(); // Close audio context in error case
				audioContext = null;
				analyser = null;
			}
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
			startRecording();
		}
	}

	async function copyToClipboard(text) {
		try {
			await navigator.clipboard.writeText(text);
			console.log('📋 Transcript copied to clipboard');
			clipboardSuccess = true;
		} catch (err) {
			console.error('❌ Failed to copy transcript to clipboard: ', err);
			clipboardSuccess = false;
			errorMessage = 'Transcription copied to page, but could not copy to clipboard automatically.';
		}
	}

	function manualCopyToClipboard() {
		copyToClipboard(transcript);
	}
</script>

<div class="card bg-base-100 shadow-xl">
	<div class="card-body">
		<h2 class="card-title">Audio to Text Component</h2>
		<button class="btn btn-primary" on:click={toggleRecording} disabled={transcribing}>
			{#if recording}
				Stop Recording
				{#if transcribing}
					<span class="loading loading-ring loading-sm"></span>
				{/if}
			{:else}
				Start Recording
			{/if}
		</button>

		<!-- Audio Level Visualizer -->
		{#if recording}
			<div class="mt-2 bg-base-200 rounded-full h-4 overflow-hidden">
				<div
					class="bg-primary h-full rounded-full"
					style="width: {audioLevel}%"
				></div>
			</div>
		{/if}

		{#if errorMessage}
			<p class="text-error mt-4">{errorMessage}</p>
		{/if}

		{#if transcript}
			<div class="mt-4 p-4 rounded-lg bg-base-200">
				<h3 class="text-lg font-bold mb-2">Transcription:</h3>
				<pre class="whitespace-pre-wrap font-mono bg-base-300 p-2 rounded-box overflow-x-auto">{transcript}</pre>
				<div class="flex justify-between items-center mt-2">
					{#if clipboardSuccess}
						<p class="text-success">Copied to clipboard!</p>
					{:else if transcript && !clipboardSuccess && errorMessage === ''}
						<p class="text-warning">Copy to clipboard failed automatically.</p>
					{/if}
					<button class="btn btn-sm btn-outline" on:click={manualCopyToClipboard} disabled={transcribing}>
						Copy
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
