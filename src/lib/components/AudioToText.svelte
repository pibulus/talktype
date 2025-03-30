<script>
	import { geminiService } from '$lib/services/geminiService';
	import AudioVisualizer from './AudioVisualizer.svelte';

	let recording = false;
	let mediaRecorder;
	let audioChunks = [];
	let transcript = '';
	let errorMessage = '';
	let transcribing = false;
	let clipboardSuccess = false;

	async function startRecording() {
		errorMessage = '';
		transcript = '';
		recording = true;
		audioChunks = [];
		clipboardSuccess = false;

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
				try {
					console.log('🤖 Transcription started');
					transcript = await geminiService.transcribeAudio(audioBlob);
					await copyToClipboard(transcript);
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

	// Computed button label: if recording, show "Stop Recording"; else if transcript exists, show "New Recording"; otherwise, "Start Recording"
	$: buttonLabel = recording ? 'Stop Recording' : transcript ? 'New Recording' : 'Start Recording';
</script>

<div class="mx-auto w-full max-w-sm">
	{#if recording}
		<div class="mx-auto mb-6 w-full rounded-2xl bg-white/30 p-4 shadow-md backdrop-blur-md">
			<AudioVisualizer />
		</div>
	{/if}

	<button
		class="w-full rounded-full bg-amber-400 px-10 py-5 text-xl font-bold text-black shadow-xl transition-all duration-150 ease-in-out hover:scale-105 hover:bg-amber-300 focus:outline-none active:bg-amber-500"
		on:click={toggleRecording}
		disabled={transcribing}
		aria-label="Toggle Recording"
	>
		{buttonLabel}
	</button>

	{#if transcribing && !transcript}
		<div class="mt-6 flex justify-center">
			<div
				class="border-5 h-8 w-8 animate-spin rounded-full border-amber-400 border-t-transparent"
			></div>
		</div>
	{/if}

	{#if errorMessage}
		<p class="mt-4 text-center font-medium text-red-500">{errorMessage}</p>
	{/if}

	{#if transcript}
		<div
			class="mx-auto mt-8 w-full whitespace-pre-line rounded-3xl border border-gray-100 bg-white p-6 font-mono text-base leading-relaxed text-gray-800 shadow-lg"
		>
			{transcript}
		</div>

		<button
			class="mt-6 w-full rounded-full bg-amber-400 px-10 py-5 text-xl font-bold text-black shadow-xl transition-all duration-150 ease-in-out hover:scale-105 hover:bg-amber-300 focus:outline-none active:bg-amber-500"
			on:click={toggleRecording}
		>
			New Recording
		</button>

		{#if clipboardSuccess}
			<p class="mt-3 text-center text-base font-medium text-gray-500">Copied to clipboard</p>
		{:else}
			<div class="mt-3 flex justify-center">
				<button
					class="text-base font-medium text-gray-500 underline hover:text-gray-700"
					on:click={manualCopyToClipboard}
				>
					Copy to clipboard
				</button>
			</div>
		{/if}
	{/if}
</div>
