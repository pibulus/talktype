<script>
	import { onMount } from 'svelte';
	import { pipeline, read_audio } from '@xenova/transformers';

	let isLoading = false;
	let isRecording = false;
	let transcriptionResult = '';
	let error = null;
	let mediaRecorder = null;
	let audioChunks = [];
	let transcriber = null;
	let modelLoaded = false;

	onMount(async () => {
		// Pre-load the model
		await loadModel();
	});

	async function loadModel() {
		try {
			isLoading = true;
			error = null;
			console.log('Loading Whisper model...');
			
			// Load the simplest working model
			transcriber = await pipeline(
				'automatic-speech-recognition',
				'Xenova/whisper-tiny.en'
			);
			
			modelLoaded = true;
			console.log('Model loaded successfully!');
		} catch (err) {
			error = `Failed to load model: ${err.message}`;
			console.error('Model loading error:', err);
		} finally {
			isLoading = false;
		}
	}

	async function startRecording() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mediaRecorder = new MediaRecorder(stream);
			audioChunks = [];

			mediaRecorder.ondataavailable = (event) => {
				audioChunks.push(event.data);
			};

			mediaRecorder.onstop = async () => {
				const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
				await transcribeAudio(audioBlob);
			};

			mediaRecorder.start();
			isRecording = true;
		} catch (err) {
			error = `Microphone access failed: ${err.message}`;
		}
	}

	function stopRecording() {
		if (mediaRecorder && isRecording) {
			mediaRecorder.stop();
			mediaRecorder.stream.getTracks().forEach(track => track.stop());
			isRecording = false;
		}
	}

	async function transcribeAudio(audioBlob) {
		if (!transcriber) {
			error = 'Model not loaded';
			return;
		}

		try {
			isLoading = true;
			error = null;
			transcriptionResult = '';
			
			console.log('Starting transcription...');
			console.log('Audio blob type:', audioBlob.type);
			console.log('Audio blob size:', audioBlob.size);
			
			// Convert blob to Float32Array using transformers' read_audio
			const audioUrl = URL.createObjectURL(audioBlob);
			const audioData = await read_audio(audioUrl, 16000);
			URL.revokeObjectURL(audioUrl);
			
			console.log('Audio converted to Float32Array, length:', audioData.length);
			
			// Transcribe with the Float32Array
			const result = await transcriber(audioData, {
				task: 'transcribe',
				language: 'english'
			});
			
			transcriptionResult = result.text || 'No transcription available';
			console.log('Transcription complete:', transcriptionResult);
		} catch (err) {
			error = `Transcription failed: ${err.message}`;
			console.error('Transcription error:', err);
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-8">
	<div class="mx-auto max-w-2xl">
		<h1 class="mb-8 text-4xl font-bold text-white">🎤 Simple Whisper Test</h1>
		
		<div class="rounded-xl bg-white/20 p-6 backdrop-blur-md">
			<!-- Model Status -->
			<div class="mb-4 rounded-lg bg-black/30 p-4">
				<div class="text-white">
					Model Status: 
					{#if isLoading}
						<span class="text-yellow-300">Loading...</span>
					{:else if modelLoaded}
						<span class="text-green-300">✅ Ready</span>
					{:else}
						<span class="text-red-300">❌ Not loaded</span>
					{/if}
				</div>
			</div>

			<!-- Recording Button -->
			<div class="mb-4">
				{#if !isRecording}
					<button
						on:click={startRecording}
						disabled={isLoading || !modelLoaded}
						class="w-full rounded-lg bg-green-500 px-6 py-3 font-bold text-white hover:bg-green-600 disabled:bg-gray-500 disabled:opacity-50"
					>
						🎤 Start Recording
					</button>
				{:else}
					<button
						on:click={stopRecording}
						class="w-full rounded-lg bg-red-500 px-6 py-3 font-bold text-white hover:bg-red-600 animate-pulse"
					>
						⏹️ Stop Recording
					</button>
				{/if}
			</div>

			<!-- Loading Indicator -->
			{#if isLoading}
				<div class="mb-4 rounded-lg bg-blue-500/30 p-4 text-center">
					<div class="text-white">Processing...</div>
				</div>
			{/if}

			<!-- Transcription Result -->
			{#if transcriptionResult}
				<div class="mb-4 rounded-lg bg-green-500/30 p-4">
					<h3 class="mb-2 font-bold text-white">Transcription:</h3>
					<p class="text-white">{transcriptionResult}</p>
				</div>
			{/if}

			<!-- Error Display -->
			{#if error}
				<div class="rounded-lg bg-red-500/30 p-4">
					<h3 class="mb-2 font-bold text-white">Error:</h3>
					<p class="text-white">{error}</p>
				</div>
			{/if}
		</div>

		<!-- Debug Info -->
		<div class="mt-6 rounded-lg bg-black/30 p-4 text-sm text-white/80">
			<h3 class="mb-2 font-bold">Debug Info:</h3>
			<ul class="list-inside list-disc">
				<li>Using Xenova/whisper-tiny.en (39MB)</li>
				<li>Direct blob transcription (no conversion)</li>
				<li>Minimal options for compatibility</li>
				<li>Check console for detailed logs</li>
			</ul>
		</div>
	</div>
</div>