<script>
	import { geminiService } from '$lib/services/geminiService';

	let recording = false;
	let mediaRecorder;
	let audioChunks = [];
	let transcript = '';
	let errorMessage = '';

	async function startRecording() {
		errorMessage = '';
		transcript = '';
		recording = true;
		audioChunks = [];

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

<svelte:head>
	<title>Audio to Text</title>
</svelte:head>

<main class="container">
	<h1>Audio to Text</h1>

	<button class="record-button" on:click={toggleRecording}>
		{#if recording}
			Stop Recording
		{:else}
			Start Recording
		{/if}
	</button>

	{#if errorMessage}
		<p class="error-message">Error: {errorMessage}</p>
	{/if}

	{#if transcript}
		<div class="transcript-container">
			<h2>Transcription:</h2>
			<pre class="transcript-text">{transcript}</pre>
			<p class="clipboard-message">Transcription automatically copied to clipboard!</p>
		</div>
	{/if}
</main>

<style>
	.container {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem;
		font-family: sans-serif;
	}

	h1 {
		margin-bottom: 1rem;
	}

	.record-button {
		padding: 1rem 2rem;
		font-size: 1rem;
		background-color: #007bff;
		color: white;
		border: none;
		border-radius: 5px;
		cursor: pointer;
		margin-bottom: 1rem;
	}

	.record-button:hover {
		background-color: #0056b3;
	}

	.error-message {
		color: red;
		margin-bottom: 1rem;
	}

	.transcript-container {
		margin-top: 2rem;
		border: 1px solid #ccc;
		padding: 1rem;
		border-radius: 5px;
		background-color: #f9f9f9;
		width: 80%;
		max-width: 800px;
	}

	h2 {
		margin-top: 0;
		margin-bottom: 0.5rem;
	}

	.transcript-text {
		white-space: pre-wrap; /* or 'pre-line' */
		font-family: monospace;
		background-color: #eee;
		padding: 0.5rem;
		border-radius: 3px;
		overflow-x: auto; /* Add horizontal scroll if needed */
	}

	.clipboard-message {
		font-size: 0.9rem;
		color: green;
		margin-top: 0.5rem;
	}
</style>
