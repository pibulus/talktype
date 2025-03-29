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
	$: buttonLabel = recording
		? 'Stop Recording'
		: transcript
		? 'New Recording'
		: 'Start Recording';
</script>

<div class="w-full max-w-sm mx-auto">
  {#if recording}
    <div class="bg-white/30 backdrop-blur-md rounded-2xl p-4 shadow-md w-full mx-auto mb-6">
      <AudioVisualizer />
    </div>
  {/if}
  
  <button
    class="bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-black font-bold py-5 px-10 text-xl rounded-full shadow-xl w-full transition-all duration-150 ease-in-out hover:scale-105 focus:outline-none"
    on:click={toggleRecording}
    disabled={transcribing}
    aria-label="Toggle Recording"
  >
    {buttonLabel}
  </button>
  
  {#if transcribing && !transcript}
    <div class="flex justify-center mt-6">
      <div class="w-8 h-8 border-5 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
  {/if}
  
  {#if errorMessage}
    <p class="mt-4 text-red-500 text-center font-medium">{errorMessage}</p>
  {/if}
  
  {#if transcript}
    <div class="bg-white rounded-3xl p-6 text-base font-mono leading-relaxed text-gray-800 shadow-lg w-full mx-auto mt-8 whitespace-pre-line border border-gray-100">
      {transcript}
    </div>
    
    <button
      class="bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-black font-bold py-5 px-10 rounded-full text-xl mt-6 shadow-xl w-full transition-all duration-150 ease-in-out hover:scale-105 focus:outline-none"
      on:click={toggleRecording}
    >
      New Recording
    </button>
    
    {#if clipboardSuccess}
      <p class="text-center text-gray-500 text-base mt-3 font-medium">Copied to clipboard</p>
    {:else}
      <div class="flex justify-center mt-3">
        <button
          class="text-gray-500 text-base underline hover:text-gray-700 font-medium"
          on:click={manualCopyToClipboard}
        >
          Copy to clipboard
        </button>
      </div>
    {/if}
  {/if}
</div>