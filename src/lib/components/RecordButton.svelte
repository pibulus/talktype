<script>
  import { ANIMATION, CTA_PHRASES, COPY_MESSAGES, getRandomFromArray } from '$lib/constants';
  
  // Props
  export let recording = false;
  export let transcribing = false;
  export let clipboardSuccess = false;
  export let recordingDuration = 0;
  export let isPremiumUser = false;
  export let buttonLabel = CTA_PHRASES[0];
  export let progress = 0; // Add progress prop for transcription progress

  // Element refs
  let recordButtonElement;
  
  // Handlers
  export function animateButtonPress() {
    if (recordButtonElement) {
      recordButtonElement.classList.remove('button-press');
      void recordButtonElement.offsetWidth; // Force reflow
      recordButtonElement.classList.add('button-press');
      setTimeout(() => {
        if (recordButtonElement) {
          recordButtonElement.classList.remove('button-press');
        }
      }, ANIMATION.BUTTON.PRESS_DURATION);
    }
  }
  
  function handleKeyDown(event) {
    // Space or Enter key to toggle recording when focused
    if ((event.key === 'Enter' || event.key === ' ') && !transcribing) {
      event.preventDefault(); // Prevent default space/enter behavior
      dispatch('click');
    }
  }
  
  // Event handling
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  
  // Generate a random success message for the clipboard
  function getRandomCopyMessage() {
    return getRandomFromArray(COPY_MESSAGES);
  }
</script>

{#if transcribing}
  <div
    class="progress-container relative h-[72px] w-full max-w-[500px] overflow-hidden rounded-full bg-amber-200 shadow-md shadow-black/10 sm:h-[66px]"
    role="progressbar"
    aria-label="Transcription progress"
    aria-valuenow={progress}
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div
      class="flex items-center justify-center h-full transition-all duration-300 progress-bar bg-gradient-to-r from-amber-400 to-rose-300"
      style="width: {progress}%;"
    ></div>
  </div>
{:else}
  <button
    bind:this={recordButtonElement}
    class="record-button duration-400 w-[90%] rounded-full transition-all ease-out sm:w-full {clipboardSuccess
      ? 'border border-purple-200 bg-purple-50 text-black'
      : 'bg-amber-400 text-black'} mx-auto max-w-[500px] px-6 py-6 text-center text-xl font-bold shadow-md hover:scale-105 hover:bg-amber-300 focus:outline focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 active:scale-95 active:bg-amber-500 active:shadow-inner sm:px-10 sm:py-5 {!recording &&
    buttonLabel === 'Start Recording' &&
    !clipboardSuccess
      ? 'pulse-subtle'
      : ''} {clipboardSuccess ? 'notification-pulse' : ''}"
    style="min-width: 300px; min-height: 72px; transform-origin: center center;"
    on:click={() => dispatch('click')}
    on:mouseenter={() => dispatch('preload')}
    on:keydown={handleKeyDown}
    disabled={transcribing}
    aria-label={recording ? 'Stop Recording' : 'Start Recording'}
    aria-pressed={recording}
    aria-busy={transcribing}
  >
    <span
      class="cta-text relative inline-block min-h-[28px] whitespace-nowrap transition-all duration-300 ease-out"
    >
      <span
        class="absolute inset-0 flex transform items-center justify-center transition-all duration-300 ease-out {clipboardSuccess
          ? 'scale-100 opacity-100'
          : 'scale-95 opacity-0'}"
        style="visibility: {clipboardSuccess ? 'visible' : 'hidden'};"
      >
        <span class="flex items-center justify-center gap-1">
          <svg
            class="w-4 h-4 mr-1 text-purple-500"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12,2 C7.6,2 4,5.6 4,10 L4,17 C4,18.1 4.9,19 6,19 L8,19 L8,21 C8,21.6 8.4,22 9,22 C9.3,22 9.5,21.9 9.7,21.7 L12.4,19 L18,19 C19.1,19 20,18.1 20,17 L20,10 C20,5.6 16.4,2 12,2 Z"
              fill="currentColor"
              opacity="0.8"
            />
            <circle cx="9" cy="10" r="1.2" fill="white" />
            <circle cx="15" cy="10" r="1.2" fill="white" />
          </svg>
          {getRandomCopyMessage()}
        </span>
      </span>
      <span
        class="transform transition-all duration-300 ease-out {clipboardSuccess
          ? 'scale-90 opacity-0'
          : 'scale-100 opacity-100'}"
        style="visibility: {clipboardSuccess ? 'hidden' : 'visible'};"
      >
        {buttonLabel}
      </span>
    </span>
  </button>
  
  {#if recording}
    <div class="mt-3 recording-timer-container">
      <div
        class="recording-timer-display {recordingDuration >=
        ANIMATION.RECORDING.FREE_LIMIT - ANIMATION.RECORDING.WARNING_THRESHOLD
          ? 'warning'
          : ''} {recordingDuration >=
        ANIMATION.RECORDING.FREE_LIMIT - ANIMATION.RECORDING.DANGER_THRESHOLD
          ? 'danger'
          : ''}"
        role="timer"
        aria-label="Recording time"
      >
        {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60)
          .toString()
          .padStart(2, '0')}
      </div>
    </div>
  {/if}
{/if}