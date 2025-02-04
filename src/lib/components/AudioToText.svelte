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

<div class="shadow-2xl card bg-background bg-opacity-80 backdrop-blur-md">
  <div class="p-6 card-body">
    <button
      class="transition-transform btn btn-primary hover:scale-105 focus:outline-none"
      on:click={toggleRecording}
      disabled={transcribing}
      aria-label="Toggle Recording"
    >
      {#if recording}
        Stop Recording
        {#if transcribing}
          <span class="ml-2 loading loading-ring loading-sm"></span>
        {/if}
      {:else}
        Start Recording
      {/if}
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
      <div class="p-4 mt-6 bg-gray-700 bg-opacity-50 rounded-lg">
        <h3 class="mb-2 text-lg font-bold text-secondary">Transcription:</h3>
        <pre class="p-2 overflow-x-auto font-mono whitespace-pre-wrap bg-gray-600 rounded-md text-secondary">
          {transcript}
        </pre>
        <div class="flex items-center justify-between mt-2">
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