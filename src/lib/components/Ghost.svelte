<script>
  // State props
  export let eyesClosed = false;
  export let isWobbling = false;
  export let isRecording = false;
  export let isProcessing = false;
  
  // Local variables for theme handling
  import { onMount } from 'svelte';
  let currentTheme = 'peach';
  let bgImageSrc = '/talktype-icon-bg-gradient.svg';
  let isRainbow = false;
  
  // Check for theme on mount and update accordingly
  onMount(() => {
    if (typeof document !== 'undefined') {
      updateTheme();
      // Listen for theme changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'data-theme') {
            updateTheme();
          }
        });
      });
      
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      });
      
      return () => observer.disconnect();
    }
  });
  
  // Update the theme based on document attribute
  function updateTheme() {
    currentTheme = document.documentElement.getAttribute('data-theme') || 'peach';
    isRainbow = currentTheme === 'rainbow';
    
    // Set the appropriate gradient SVG based on theme
    switch(currentTheme) {
      case 'mint':
        bgImageSrc = '/talktype-icon-bg-gradient-mint.svg';
        break;
      case 'bubblegum':
        bgImageSrc = '/talktype-icon-bg-gradient-bubblegum.svg';
        break;
      case 'rainbow':
        bgImageSrc = '/talktype-icon-bg-gradient-rainbow.svg';
        break;
      default: // Default to peach
        bgImageSrc = '/talktype-icon-bg-gradient.svg';
        break;
    }
  }
  
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
  on:keydown={(e) => {
    // Trigger on Enter or Spacebar
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault(); // Prevent page scroll on Spacebar
      handleClick();
    }
  }}
  aria-label="Toggle Recording"
  aria-pressed={isRecording.toString()}
>
  <div class="icon-layers">
    <!-- Background gradient -->
    <img src={bgImageSrc} alt="" class="icon-bg {isRainbow ? 'rainbow-animated' : ''}" />
    
    <!-- Base ghost image -->
    <img src="/assets/talktype-icon-base.svg" alt="" class="icon-base" />
    
    <!-- Eyes - NO blinking, just static -->
    <img 
      src="/assets/talktype-icon-eyes.svg" 
      alt="" 
      class="icon-eyes" 
    />
  </div>
</button>

<style>
  .icon-container {
    position: relative;
    width: 100%;
    height: 100%;
    cursor: pointer;
    background: transparent;
    border: none;
    outline: none;
    -webkit-tap-highlight-color: transparent;
    filter: drop-shadow(0 0 8px rgba(255, 156, 243, 0.15));
    transition: all 0.8s cubic-bezier(0.19, 1, 0.22, 1);
    animation: gentle-float 3s ease-in-out infinite;
    animation-delay: 2.5s;
    transform: translateY(0);
  }
  
  .icon-container:focus, 
  .icon-container:active, 
  .icon-container:focus-visible {
    outline: none !important;
    outline-offset: 0 !important;
    box-shadow: none !important;
    border: none !important;
  }
  
  .icon-layers {
    position: relative;
    width: 100%;
    height: 100%;
  }
  
  .icon-bg, 
  .icon-base, 
  .icon-eyes {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    transition: all 0.3s ease;
    user-select: none;
    -webkit-user-drag: none;
  }
  
  /* Stack layers correctly */
  .icon-bg {
    z-index: 1; /* Bottom layer */
  }
  
  .icon-base {
    z-index: 2; /* Middle layer */
  }
  
  .icon-eyes {
    z-index: 3; /* Top layer */
    transform-origin: center center;
  }
  
  /* Hover effects */
  .icon-container:hover,
  .icon-container:active {
    filter: drop-shadow(0 0 18px rgba(249, 168, 212, 0.45))
      drop-shadow(0 0 30px rgba(255, 156, 243, 0.3));
    animation: gentle-float 3s ease-in-out infinite, ghost-hover 1.2s ease-in-out infinite alternate;
    animation-delay: 0s, 0s;
  }
  
  /* Recording state */
  .recording {
    animation: recording-glow 1.5s infinite !important;
    transform: scale(1.03);
    animation-delay: 0s;
  }
  
  /* Recording state for ghost eyes */
  .recording .icon-eyes {
    transform-origin: center center;
  }
  
  /* Wobble animation */
  .ghost-wobble {
    animation: ghost-wobble-left 0.6s ease-in-out forwards !important;
  }
  
  /* Blinking - proper scale transform */
  .blink-once {
    animation: blink-once 0.18s forwards !important;
    transform-origin: center center;
  }
  
  /* Processing/thinking animation */
  .eyes-thinking {
    animation: blink-thinking-hard 1.5s infinite !important;
    transform-origin: center center;
  }
  
  /* Rainbow animation for ghost svg */
  .rainbow-animated {
    animation: rainbowFlow 7s linear infinite;
    filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.6));
    transform-origin: center center;
  }
  
  .icon-container:hover .rainbow-animated {
    animation: rainbowFlow 4.5s linear infinite, sparkle 2s ease-in-out infinite;
    filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
  }
  
  /* Animation keyframes */
  @keyframes gentle-float {
    0%, 10%, 90%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-3px);
    }
  }
  
  @keyframes ghost-hover {
    0% {
      transform: scale(1.005) translateY(0);
    }
    100% {
      transform: scale(1.015) translateY(-3px);
    }
  }
  
  @keyframes recording-glow {
    0% {
      filter: drop-shadow(0 0 15px rgba(255, 100, 243, 0.5))
        drop-shadow(0 0 25px rgba(249, 168, 212, 0.4));
    }
    50% {
      filter: drop-shadow(0 0 25px rgba(255, 100, 243, 0.8))
        drop-shadow(0 0 35px rgba(255, 120, 170, 0.5))
        drop-shadow(0 0 40px rgba(249, 168, 212, 0.4));
    }
    100% {
      filter: drop-shadow(0 0 15px rgba(255, 100, 243, 0.5))
        drop-shadow(0 0 25px rgba(249, 168, 212, 0.4));
    }
  }
  
  @keyframes ghost-wobble-left {
    0% { transform: rotate(0deg) scale(1); }
    25% { transform: rotate(-5deg) scale(1.02); }
    50% { transform: rotate(3deg) scale(1.01); }
    75% { transform: rotate(-2deg) scale(1.01); }
    100% { transform: rotate(0deg) scale(1); }
  }
  
  @keyframes blink-once {
    0%, 100% {
      transform: scaleY(1);
      opacity: 1;
    }
    50% {
      transform: scaleY(0.15);
      opacity: 0.9;
    }
  }
  
  @keyframes blink-thinking-hard {
    0%, 10%, 50%, 60%, 100% {
      transform: scaleY(1);
    }
    12%, 48% {
      transform: scaleY(0);
    }
    90% {
      transform: scaleY(0.2);
    }
  }
  
  @keyframes rainbowFlow {
    0% { filter: hue-rotate(0deg) saturate(1.4) brightness(1.15); }
    100% { filter: hue-rotate(360deg) saturate(1.5) brightness(1.2); }
  }
  
  @keyframes sparkle {
    0%, 100% { filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.7)) drop-shadow(0 0 8px rgba(255, 61, 127, 0.6)); }
    25% { filter: drop-shadow(0 0 6px rgba(255, 141, 60, 0.8)) drop-shadow(0 0 10px rgba(255, 249, 73, 0.7)); }
    50% { filter: drop-shadow(0 0 6px rgba(77, 255, 96, 0.7)) drop-shadow(0 0 9px rgba(53, 222, 255, 0.7)); }
    75% { filter: drop-shadow(0 0 7px rgba(159, 122, 255, 0.8)) drop-shadow(0 0 9px rgba(255, 61, 127, 0.6)); }
  }
  
  /* Media queries for larger screens */
  @media (min-width: 768px) {
    .icon-container {
      filter: drop-shadow(0 0 12px rgba(249, 168, 212, 0.25))
        drop-shadow(0 0 15px rgba(255, 156, 243, 0.15));
    }
    
    .icon-container:hover {
      filter: drop-shadow(0 0 25px rgba(249, 168, 212, 0.5))
        drop-shadow(0 0 35px rgba(255, 156, 243, 0.4));
    }
  }
</style>