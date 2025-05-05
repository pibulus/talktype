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

<!-- Ghost Icon - Size reduced slightly and moved up -->
<div class="ghost-icon-wrapper" style="inline-size: clamp(154px, 20vw, 220px); margin-block-end: 1.5em;">
  <Ghost
    bind:this={ghostComponent}
    isRecording={isRecording}
    isProcessing={isProcessing}
    animationState={isRecording ? 'wobble-start' : isProcessing ? 'processing' : 'idle'}
    externalTheme={appTheme}
    on:toggleRecording={handleToggleRecording}
    class={isRecording ? 'ghost recording' : ''}
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
  
  /* Recording ghost effect - enhanced contrast for accessibility */
  :global(.ghost.recording) {
    filter: drop-shadow(0 0 12px rgba(0,180,140,.85));
    /* Enhanced outline for better contrast on cream backgrounds */
    outline: 2px solid rgba(0,120,100,.4);
    outline-offset: 2px;
    border-radius: 50%;
  }
</style>