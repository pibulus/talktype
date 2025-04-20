<script>
  export let eyesClosed = false;
  export let isWobbling = false;
  export let isRecording = false;
  export let isProcessing = false;
  
  // Event handler for click events
  function handleClick() {
    // Dispatch event to parent component
    const event = new CustomEvent('togglerecording');
    document.dispatchEvent(event);
  }
</script>

<button
  class="icon-container {isRecording ? 'recording' : ''} {isWobbling ? 'ghost-wobble' : ''}"
  on:click={handleClick}
  aria-label="Toggle Recording"
  aria-pressed={isRecording.toString()}
>
  <div class="icon-layers">
    <!-- Background gradient -->
    <img src="/talktype-icon-bg-gradient.svg" alt="" class="icon-bg" />
    
    <!-- Base ghost image -->
    <img src="/assets/talktype-icon-base.svg" alt="" class="icon-base" />
    
    <!-- Eyes that blink -->
    <img 
      src="/assets/talktype-icon-eyes.svg" 
      alt="" 
      class="icon-eyes {eyesClosed ? 'eyes-closed' : ''} {isProcessing ? 'eyes-thinking' : ''}" 
    />
  </div>
</button>

<style>
  .icon-container {
    position: relative;
    width: 120px;
    height: 120px;
    cursor: pointer;
    background: transparent;
    border: none;
    outline: none;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.3s ease;
  }
  
  .icon-layers {
    position: relative;
    width: 100%;
    height: 100%;
  }
  
  .icon-bg, .icon-base, .icon-eyes {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    transition: all 0.2s ease;
  }
  
  /* Recording state */
  .recording {
    animation: pulse 2s infinite ease-in-out;
  }
  
  /* Wobble animation */
  .ghost-wobble {
    animation: wobble 0.5s ease-in-out;
  }
  
  /* Blinking */
  .eyes-closed {
    opacity: 0;
  }
  
  /* Processing/thinking animation */
  .eyes-thinking {
    animation: blink-thinking 0.5s infinite alternate;
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  
  @keyframes wobble {
    0% { transform: rotate(0deg); }
    25% { transform: rotate(-5deg); }
    50% { transform: rotate(3deg); }
    75% { transform: rotate(-2deg); }
    100% { transform: rotate(0deg); }
  }
  
  @keyframes blink-thinking {
    0% { opacity: 1; }
    100% { opacity: 0.3; }
  }
</style>