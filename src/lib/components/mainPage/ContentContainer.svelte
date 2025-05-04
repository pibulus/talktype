<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import AudioToText from './audio-transcript/AudioToText.svelte';
  import AnimatedTitle from './AnimatedTitle.svelte';

  // Props passed from the parent
  export let ghostComponent = null;
  export let speechModelPreloaded = false;
  export let onPreloadRequest = null;

  // Event dispatcher to communicate with parent
  const dispatch = createEventDispatcher();

  // Animation state variables
  let titleAnimationComplete = false;
  let subtitleAnimationComplete = false;

  // Component references
  let audioToTextComponent;

  // Debug helper
  function debug(message) {
    // Uncomment the line below during development for verbose logging
    // console.log(`[ContentContainer] ${message}`);
  }

  // Function to handle title animation complete
  function handleTitleAnimationComplete() {
    debug('Title animation complete');
    titleAnimationComplete = true;
    dispatch('titleAnimationComplete');
  }

  // Function to handle subtitle animation complete
  function handleSubtitleAnimationComplete() {
    debug('Subtitle animation complete');
    subtitleAnimationComplete = true;
    dispatch('subtitleAnimationComplete');
  }

  // Public methods for parent to access
  export function startRecording() {
    if (audioToTextComponent) {
      debug('Starting recording from parent');
      audioToTextComponent.startRecording();
    }
  }

  export function stopRecording() {
    if (audioToTextComponent) {
      debug('Stopping recording from parent');
      audioToTextComponent.stopRecording();
    }
  }

  // Event forwarding functions
  function forwardRecordingStart() {
    dispatch('recordingstart');
  }

  function forwardRecordingStop() {
    dispatch('recordingstop');
  }

  function forwardProcessingStart() {
    dispatch('processingstart');
  }

  function forwardProcessingEnd() {
    dispatch('processingend');
  }

  function forwardTranscriptionCompleted(event) {
    dispatch('transcriptionCompleted', event.detail);
  }
</script>

<AnimatedTitle 
  on:titleAnimationComplete={handleTitleAnimationComplete}
  on:subtitleAnimationComplete={handleSubtitleAnimationComplete}
/>

<!-- Audio component - Wider container for better transcript layout -->
<div class="w-full max-w-xl mt-2 sm:mt-0 sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
  <AudioToText
    bind:this={audioToTextComponent}
    isModelPreloaded={speechModelPreloaded}
    onPreloadRequest={onPreloadRequest}
    {ghostComponent}
    on:transcriptionCompleted={forwardTranscriptionCompleted}
    on:recordingstart={forwardRecordingStart}
    on:recordingstop={forwardRecordingStop}
    on:processingstart={forwardProcessingStart}
    on:processingend={forwardProcessingEnd}
  />
</div>