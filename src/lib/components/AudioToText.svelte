<script>
	import { geminiService } from '$lib/services/geminiService';
	import AudioVisualizer from './AudioVisualizer.svelte';

	let recording = false;
	let mediaRecorder;
	let audioChunks = [];
	let transcript = '';
	let errorMessage = '';
	let loadingDots = ''; // (No longer used in the visual, but you can remove it if desired)
	let transcribing = false;
	let clipboardSuccess = false;

	async function startRecording() {
		errorMessage = '';
		transcript = '';
		recording = true;
		audioChunks = [];
		clipboardSuccess = false;

		// Start a loading dots animation if needed (optional)
		// Removed visual loadingDots in favor of a floating spinner

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
	$: buttonLabel = recording
		? 'Stop Recording'
		: transcript
		? 'New Recording'
		: 'Start Recording';
</script>

<!-- AudioToText.svelte (HTML markup only) -->
<div class="relative shadow-2xl card bg-base-300 bg-opacity-90 backdrop-blur-md animate-fadeIn border border-secondary border-opacity-30">
  {#if transcribing && !transcript}
    <!-- Floating loading indicator -->
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <span class="loading loading-dots loading-lg text-primary"></span>
    </div>
  {/if}
  
  <div class="p-6 card-body" transition:slide>
    <button
      class="w-full max-w-xs mx-auto transition-transform btn btn-primary hover:scale-105 focus:outline-none text-lg font-semibold"
      on:click={toggleRecording}
      disabled={transcribing}
      aria-label="Toggle Recording"
    >
      {buttonLabel}
    </button>

    {#if recording}
      <div class="mt-4">
        <AudioVisualizer />
      </div>
    {/if}

    {#if errorMessage}
      <p class="mt-4 text-error">{errorMessage}</p>
    {/if}

    {#if transcript}
      <div class="p-4 mt-6 text-left rounded-lg bg-base-200">
        <h3 class="mb-2 text-lg font-bold text-secondary">Transcription:</h3>
        <pre class="p-2 overflow-x-auto font-mono whitespace-pre-wrap rounded-md bg-base-300 text-secondary">
{transcript}
        </pre>
        <div class="flex items-center justify-between mt-2">
          {#if clipboardSuccess}
            <p class="text-success">Copied to clipboard!</p>
          {:else if transcript && !clipboardSuccess && errorMessage === ''}
            <p class="text-warning">Copy to clipboard failed automatically.</p>
          {/if}
          <button
            class="transition-all btn btn-outline btn-sm hover:scale-105 focus:outline-none"
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
