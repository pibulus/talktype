<script>
	import { geminiService } from '$lib/services/geminiService';
	import AudioVisualizer from './AudioVisualizer.svelte'; // Import the new component

	let recording = false;
	let mediaRecorder;
	let audioChunks = [];
	let transcript = '';
	let errorMessage = '';
	let loadingDots = ''; // For loading animation
	let transcribing = false;
	let clipboardSuccess = false; // Track clipboard success


	async function startRecording() {
		errorMessage = '';
		transcript = '';
		recording = true;
		audioChunks = [];
		loadingDots = ''; // Reset loading dots
		transcribing = false;
		clipboardSuccess = false; // Reset clipboard success

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


			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunks.push(event.data);
				}
			};

			mediaRecorder.onstop = async () => {
				clearInterval(intervalId); // Stop loading dots animation
				loadingDots = ''; // Clear loading dots
				transcribing = true;


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

		<!-- Audio Level Visualizer Component -->
		{#if recording}
			<div class="mt-2">
				<AudioVisualizer  />
			</div>
		{/if}

		{#if errorMessage}
			<p class="mt-4 text-error">{errorMessage}</p>
		{/if}

		{#if transcript}
			<div class="mt-4 rounded-lg bg-base-200 p-4">
				<h3 class="mb-2 text-lg font-bold">Transcription:</h3>
				<pre
					class="overflow-x-auto whitespace-pre-wrap rounded-box bg-base-300 p-2 font-mono">{transcript}</pre>
				<div class="mt-2 flex items-center justify-between">
					{#if clipboardSuccess}
						<p class="text-success">Copied to clipboard!</p>
					{:else if transcript && !clipboardSuccess && errorMessage === ''}
						<p class="text-warning">Copy to clipboard failed automatically.</p>
					{/if}
					<button
						class="btn btn-outline btn-sm"
						on:click={manualCopyToClipboard}
						disabled={transcribing}
					>
						Copy
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
