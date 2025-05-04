<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import Ghost from '$lib/components/ghost/Ghost.svelte';
  import { theme as appTheme } from '$lib';
  
  // Props passed from the parent
  export let isRecording = false;
  export let isProcessing = false;
  
  // Event dispatcher to communicate with parent
  const dispatch = createEventDispatcher();

  // Component references
  let ghostComponent;

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
  
  // Public methods to control ghost animations - forwarded to Ghost component
  export function startWobbleAnimation() {
    if (ghostComponent) {
      ghostComponent.forceWobble('wobble-left');
    }
  }
  
  export function stopWobbleAnimation() {
    if (ghostComponent) {
      ghostComponent.forceWobble('wobble-right');
    }
  }
  
  // Ghost animation methods forwarded to component
  export function pulse() {
    if (ghostComponent) {
      ghostComponent.pulse();
    }
  }
  
  export function startThinking() {
    if (ghostComponent) {
      ghostComponent.startThinking();
    }
  }
  
  export function stopThinking() {
    if (ghostComponent) {
      ghostComponent.stopThinking();
    }
  }
  
  export function forceWobble(options) {
    if (ghostComponent) {
      ghostComponent.forceWobble(options);
    }
  }
  
  export function reactToTranscript(textLength) {
    if (ghostComponent) {
      ghostComponent.reactToTranscript(textLength);
    }
  }
</script>

<!-- Ghost Icon -->
<div class="ghost-icon-wrapper mb-4 h-32 w-32 sm:h-36 sm:w-36 md:mb-4 md:h-48 md:w-48 lg:h-56 lg:w-56">
  <Ghost
    bind:this={ghostComponent}
    isRecording={isRecording}
    isProcessing={isProcessing}
    animationState={isRecording ? 'wobble-start' : isProcessing ? 'processing' : 'idle'}
    externalTheme={appTheme}
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
      margin-bottom: 1rem;
    }
  }
  
  @media (max-width: 640px) {
    .ghost-icon-wrapper {
      margin-bottom: 1rem;
    }
  }
</style>