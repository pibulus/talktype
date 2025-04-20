<script>
  import { onMount, onDestroy } from 'svelte';
  
  // Props to communicate recording/processing state ONLY
  // These don't control animation directly - just tell us when we can blink
  export let isRecording = false;
  export let isProcessing = false;
  
  // Local state
  let blinkTimeoutId = null;
  let wobbleTimeoutId = null;
  let eyesClosed = false;
  let isWobbling = false;
  let isRainbow = false;
  let currentTheme = 'peach';
  let bgImageSrc = '/talktype-icon-bg-gradient.svg';
  
  // --- Theme handling ---
  onMount(() => {
    // Update theme on mount
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
      
      // Start greeting animation
      setTimeout(() => {
        greetingAnimation();
      }, 1500);
      
      return () => observer.disconnect();
    }
  });
  
  // Clean up on destroy
  onDestroy(() => {
    clearTimeout(blinkTimeoutId);
    clearTimeout(wobbleTimeoutId);
  });
  
  // --- Animation Functions ---
  
  // Greeting animation
  function greetingAnimation() {
    // Skip wobble completely on page load, just do a double blink
    eyesClosed = true;
    setTimeout(() => {
      eyesClosed = false;
      setTimeout(() => {
        eyesClosed = true;
        setTimeout(() => {
          eyesClosed = false;
          
          // Start ambient blinking
          scheduleBlink();
        }, 150);
      }, 200);
    }, 150);
  }
  
  // Regular ambient blinking
  function scheduleBlink() {
    clearTimeout(blinkTimeoutId);
    
    // Don't blink during recording or processing
    if (isRecording || isProcessing) {
      return;
    }
    
    // Random delay between blinks (4-8 seconds)
    const delay = 4000 + Math.random() * 4000;
    
    blinkTimeoutId = setTimeout(() => {
      // Single or double blink
      if (Math.random() < 0.25) {
        // Double blink (25% chance)
        eyesClosed = true;
        setTimeout(() => {
          eyesClosed = false;
          setTimeout(() => {
            eyesClosed = true;
            setTimeout(() => {
              eyesClosed = false;
              scheduleBlink(); // Schedule next blink
            }, 150);
          }, 200);
        }, 150);
      } else {
        // Single blink (75% chance)
        eyesClosed = true;
        setTimeout(() => {
          eyesClosed = false;
          scheduleBlink(); // Schedule next blink
        }, 150);
      }
    }, delay);
  }
  
  // Update theme based on document attribute
  function updateTheme() {
    if (typeof document !== 'undefined') {
      currentTheme = document.documentElement.getAttribute('data-theme') || 'peach';
      isRainbow = currentTheme === 'rainbow';
      
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
  }
  
  // Dispatch toggle recording event when clicked
  function handleClick() {
    // Don't wobble on click - the reactive block will handle wobbles 
    // based on state changes - this eliminates double wobbles
    
    // Dispatch event to let page know to toggle recording
    if (typeof document !== 'undefined') {
      const event = new CustomEvent('togglerecording');
      document.dispatchEvent(event);
    }
  }
  
  // Track previous state to detect actual changes
  let wasRecording = false;
  let wasProcessing = false;
  
  // Watch for changes in recording/processing state
  $: {
    // Cancel any scheduled blinks during recording/processing
    if (isRecording || isProcessing) {
      clearTimeout(blinkTimeoutId);
      
      // Only wobble when STARTING recording (not just any state update)
      if (isRecording && !wasRecording && typeof window !== 'undefined') {
        // Clear any existing wobble timer
        clearTimeout(wobbleTimeoutId);
        
        // Start recording wobble
        isWobbling = true;
        wobbleTimeoutId = setTimeout(() => {
          isWobbling = false;
        }, 600);
      }
    } 
    // Restart blinking when finished recording/processing
    else if ((wasRecording || wasProcessing) && !isRecording && !isProcessing) {
      // Add wobble only when STOPPING recording
      if (wasRecording && typeof window !== 'undefined') {
        // Clear any existing wobble timer
        clearTimeout(wobbleTimeoutId);
        
        // Stop recording wobble
        isWobbling = true;
        wobbleTimeoutId = setTimeout(() => {
          isWobbling = false;
        }, 600);
      }
      
      // Restart blinking after a delay
      setTimeout(() => {
        scheduleBlink();
      }, 2000);
    }
    
    // Update previous state for next comparison
    wasRecording = isRecording;
    wasProcessing = isProcessing;
  }
</script>

<button
  class="icon-container {isRecording ? 'recording' : ''} {isWobbling ? 'ghost-wobble-' + (Math.random() > 0.5 ? 'left' : 'right') : ''}"
  style={isRecording ? 'filter: drop-shadow(0 0 25px rgba(255, 100, 243, 0.9)) drop-shadow(0 0 35px rgba(255, 120, 170, 0.7)) drop-shadow(0 0 45px rgba(249, 168, 212, 0.6)) !important;' : ''}
  on:click={handleClick}
  on:keydown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
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
    
    <!-- Eyes - controlled by local state with transform-based blinking -->
    <img 
      src="/assets/talktype-icon-eyes.svg" 
      alt="" 
      class="icon-eyes {eyesClosed ? 'eyes-closed' : ''}"
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
    transition: transform 0.08s ease-out; /* Fast transition for snappy blinks */
  }
  
  /* Hover effects */
  .icon-container:hover,
  .icon-container:active {
    filter: drop-shadow(0 0 18px rgba(249, 168, 212, 0.45))
      drop-shadow(0 0 30px rgba(255, 156, 243, 0.3));
    animation: gentle-float 3s ease-in-out infinite, ghost-hover 1.2s ease-in-out infinite alternate;
    animation-delay: 0s, 0s;
  }
  
  /* Recording state - both animation and direct filter for reliability */
  .recording {
    animation: recording-glow 1.5s infinite !important;
    transform: scale(1.03);
    animation-delay: 0s;
  }
  
  /* Wobble animations */
  .ghost-wobble-left {
    animation: ghost-wobble-left 0.6s ease-in-out forwards !important;
  }
  
  .ghost-wobble-right {
    animation: ghost-wobble-right 0.6s ease-in-out forwards !important;
  }
  
  /* Eyes closed state - transform-based for snappy blinks */
  .eyes-closed {
    transform: scaleY(0.05) !important;
    transition: transform 0.08s ease-out !important;
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
  
  /* Vibrant recording glow animation */
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
  
  @keyframes ghost-wobble-right {
    0% { transform: rotate(0deg) scale(1); }
    25% { transform: rotate(5deg) scale(1.02); }
    50% { transform: rotate(-3deg) scale(1.01); }
    75% { transform: rotate(2deg) scale(1.01); }
    100% { transform: rotate(0deg) scale(1); }
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