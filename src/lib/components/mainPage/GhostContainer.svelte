<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import Ghost from '$lib/components/ghost/Ghost.svelte';
  import { 
    ghostAnimationStore, 
    isGhostRecording, 
    isGhostProcessing, 
    ghostAnimationState 
  } from '$lib/components/ghost/stores';

  // Props passed from the parent
  export let isRecording = false;
  export let isProcessing = false;
  
  // Event dispatcher to communicate with parent
  const dispatch = createEventDispatcher();

  // Component references
  let ghostComponent;
  
  // Sync props with the store
  $: if (isRecording !== $isGhostRecording) {
    ghostAnimationStore.setRecording(isRecording);
  }
  
  $: if (isProcessing !== $isGhostProcessing) {
    ghostAnimationStore.setProcessing(isProcessing);
  }

  // Debug helper
  function debug(message) {
    // Uncomment the line below during development for verbose logging
    // console.log(`[GhostContainer] ${message}`);
  }

  // Function to handle toggle recording action
  function handleToggleRecording() {
    debug('Toggle recording triggered by Ghost component');
    dispatch('toggleRecording');
  }

  // Public method to trigger ghost click for parent
  export function triggerGhostClick() {
    debug('Triggering ghost click');
    handleToggleRecording();
  }
  
  // Public methods to control ghost animations using the store
  export function startWobbleAnimation() {
    ghostAnimationStore.startWobbleAnimation();
  }
  
  export function stopWobbleAnimation() {
    ghostAnimationStore.stopWobbleAnimation();
  }
  
  // Ghost animation methods using the store
  export function pulse() {
    ghostAnimationStore.pulse();
  }
  
  export function startThinking() {
    ghostAnimationStore.startThinking();
  }
  
  export function stopThinking() {
    ghostAnimationStore.stopThinking();
  }
  
  export function forceWobble(options) {
    ghostAnimationStore.forceWobble(options);
  }
  
  export function reactToTranscript(textLength) {
    ghostAnimationStore.reactToTranscript(textLength);
  }
</script>

<!-- Ghost Icon -->
<div class="ghost-icon-wrapper mb-4 h-36 w-36 sm:h-40 sm:w-40 md:mb-0 md:h-56 md:w-56 lg:h-64 lg:w-64">
  <Ghost
    bind:this={ghostComponent}
    isRecording={$isGhostRecording}
    isProcessing={$isGhostProcessing}
    animationState={$ghostAnimationState}
    on:toggleRecording={handleToggleRecording}
  />
</div>

<style>
  /* Ghost icon wrapper styling */
  .ghost-icon-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
  }
  
  @media (min-width: 768px) {
    .ghost-icon-wrapper {
      margin-bottom: 1.5rem;
    }
  }
</style>