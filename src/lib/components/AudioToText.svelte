<script>
	import { geminiService } from '$lib/services/geminiService';

	let recording = false;
	let mediaRecorder;
	let audioChunks = [];
	let transcript = '';
	let errorMessage = '';
	let loadingDots = ''; // For loading animation

	async function startRecording() {
		errorMessage = '';
		transcript = '';
		recording = true;
		audioChunks = [];
		loadingDots = ''; // Reset loading dots

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
				const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
				try {
					console.log('🤖 Transcription started');
					transcript = await geminiService.transcribeAudio(audioBlob);
					navigator.clipboard.writeText(transcript).then(() => {
						console.log('📋 Transcript copied to clipboard');
					}, (err) => {
						console.error('❌ Failed to copy transcript to clipboard: ', err);
						errorMessage = 'Transcription copied to page, but could not copy to clipboard.';
					});
				} catch (error) {
					console.error('❌ Transcription error:', error);
					errorMessage = error.message;
					transcript = '';
				} finally {
					recording = false;
				}
			};

			mediaRecorder.start();
			console.log('✅ Recording started');
		} catch (err) {
			clearInterval(intervalId); // Stop loading dots animation in case of error
			loadingDots = ''; // Clear loading dots
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
</script>

<div class="card w-96 bg-base-100 shadow-xl">
	<div class="card-body">
		<h2 class="card-title">Audio to Text Component</h2>
		<button class="btn btn-primary" on:click={toggleRecording} disabled={recording && loadingDots.length > 0}>
			{#if recording}
				Stop Recording{loadingDots}
			{:else}
				Start Recording
			{/if}
		</button>

		{#if errorMessage}
			<p class="text-error mt-4">{errorMessage}</p>
		{/if}

		{#if transcript}
			<div class="mt-4 p-4 rounded-lg bg-base-200">
				<h3 class="text-lg font-bold mb-2">Transcription:</h3>
				<pre class="whitespace-pre-wrap font-mono bg-base-300 p-2 rounded-box overflow-x-auto">{transcript}</pre>
				<p class="text-success mt-2">Transcription automatically copied to clipboard!</p>
			</div>
		{/if}
	</div>
</div>
