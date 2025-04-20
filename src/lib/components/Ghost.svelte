<script>
  import { onMount, onDestroy } from 'svelte';
  
  // Props to communicate recording/processing state ONLY
  // These don't control animation directly - just tell us when we can blink
  export let isRecording = false;
  export let isProcessing = false;
  
  // Local state
  let blinkTimeoutId = null;
  let wobbleTimeoutId = null;
  let lookAroundTimeoutId = null;
  let inactivityTimeoutId = null;
  let specialAnimationTimeoutId = null;
  
  let eyesClosed = false;
  let isWobbling = false;
  let isRainbow = false;
  let lookDirection = null; // For eye movement: 'left', 'right', or null
  let isAwake = true; // For sleep state
  let doingSpecialAnimation = false; // For rare animations
  
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
      
      // Start occasional eye movement
      occasionallyLookAround();
      
      // Start inactivity detection
      resetInactivity();
      
      // Start special animation detection
      maybeDoSpecialAnimation();
      
      // Set up event listeners for activity
      document.addEventListener('mousemove', resetInactivity);
      document.addEventListener('keydown', resetInactivity);
      
      return () => {
        observer.disconnect();
        document.removeEventListener('mousemove', resetInactivity);
        document.removeEventListener('keydown', resetInactivity);
      };
    }
  });
  
  // Clean up on destroy
  onDestroy(() => {
    clearTimeout(blinkTimeoutId);
    clearTimeout(wobbleTimeoutId);
    clearTimeout(lookAroundTimeoutId);
    clearTimeout(inactivityTimeoutId);
    clearTimeout(specialAnimationTimeoutId);
    
    // Clean up document event listeners if they exist
    if (typeof document !== 'undefined') {
      document.removeEventListener('mousemove', resetInactivity);
      document.removeEventListener('keydown', resetInactivity);
    }
  });
  
  // --- Animation Functions ---
  
  // Greeting animation
  function greetingAnimation() {
    // Add a quick greeting wobble with faster, snappier blinks
    isWobbling = true;
    wobbleTimeoutId = setTimeout(() => {
      isWobbling = false;
      
      // Natural double blink with good vibe
      eyesClosed = true;
      setTimeout(() => {
        eyesClosed = false;
        setTimeout(() => {
          eyesClosed = true;
          setTimeout(() => {
            eyesClosed = false;
            
            // Start ambient blinking
            scheduleBlink();
          }, 150); // More natural close time
        }, 180); // Better pause between blinks
      }, 150); // More natural open time
    }, 600); // Short initial wobble
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
      // Single or double blink with good vibe from old commits
      if (Math.random() < 0.25) {
        // Double blink (25% chance) - natural feel
        eyesClosed = true;
        setTimeout(() => {
          eyesClosed = false;
          setTimeout(() => {
            eyesClosed = true;
            setTimeout(() => {
              eyesClosed = false;
              scheduleBlink(); // Schedule next blink
            }, 150); // Original timing
          }, 180); // Smoother between blinks
        }, 150); // Original timing
      } else {
        // Single blink (75% chance) - natural timing
        eyesClosed = true;
        setTimeout(() => {
          eyesClosed = false;
          scheduleBlink(); // Schedule next blink
        }, 150); // Original timing
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
    // Make sure to reset inactivity timer on interaction
    resetInactivity();
    
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
  
  // Occasional random looking around
  function occasionallyLookAround() {
    if (typeof window === 'undefined') return;
    
    // Clear any existing timeout
    clearTimeout(lookAroundTimeoutId);
    
    // Only look around when idle and awake
    if (Math.random() < 0.3 && !isRecording && !isProcessing && isAwake) { // 30% chance when idle
      // Don't look around during blinks
      if (!eyesClosed) {
        const direction = Math.random() > 0.5 ? 'left' : 'right';
        lookDirection = direction;
        
        // Look back to center after a moment
        setTimeout(() => {
          lookDirection = null;
        }, 800);
      }
    }
    
    // Schedule next check with random interval
    const nextCheck = 3000 + Math.random() * 5000; // Between 3-8 seconds
    lookAroundTimeoutId = setTimeout(occasionallyLookAround, nextCheck);
  }
  
  // Reset inactivity timer
  function resetInactivity() {
    if (typeof window === 'undefined') return;
    
    clearTimeout(inactivityTimeoutId);
    
    // Wake up if sleeping
    if (!isAwake) {
      isAwake = true;
    }
    
    // Set timer for sleep state
    inactivityTimeoutId = setTimeout(() => {
      if (!isRecording && !isProcessing) {
        isAwake = false;
      }
    }, 60000); // Sleep after 1 minute of inactivity
  }
  
  // Special animations that rarely happen
  function maybeDoSpecialAnimation() {
    if (typeof window === 'undefined') return;
    
    clearTimeout(specialAnimationTimeoutId);
    
    // Very rare animation (5% chance when conditions are right)
    if (Math.random() < 0.05 && !isRecording && !isProcessing && 
        !doingSpecialAnimation && isAwake && !eyesClosed) {
      
      doingSpecialAnimation = true;
      
      // Do a special animation (full spin)
      // We'll handle this with CSS animation classes
      
      // Return to normal after animation
      setTimeout(() => {
        doingSpecialAnimation = false;
      }, 2000);
    }
    
    // Schedule next check
    specialAnimationTimeoutId = setTimeout(maybeDoSpecialAnimation, 45000); // Check every 45 seconds
  }
  
  // Watch for changes in recording/processing state
  $: {
    // Cancel any scheduled blinks during recording/processing
    if (isRecording || isProcessing) {
      clearTimeout(blinkTimeoutId);
      
      // Reset inactivity on state change
      resetInactivity();
      
      // Only wobble when STARTING recording (not just any state update)
      if (isRecording && !wasRecording && typeof window !== 'undefined') {
        // Clear any existing wobble timer
        clearTimeout(wobbleTimeoutId);
        
        // Start recording wobble
        isWobbling = true;
        wobbleTimeoutId = setTimeout(() => {
          isWobbling = false;
        }, 600);
        
        // Cancel any eye movement during recording
        lookDirection = null;
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
  class="icon-container {isRecording ? 'recording' : ''} 
                {isWobbling ? 'ghost-wobble-' + (Math.random() > 0.5 ? 'left' : 'right') : ''} 
                {!isAwake ? 'sleeping' : ''}
                {doingSpecialAnimation ? 'do-special-animation' : ''}"
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
    
    <!-- Eyes - controlled by local state with transform-based blinking and movement -->
    <img 
      src="/assets/talktype-icon-eyes.svg" 
      alt="" 
      class="icon-eyes {eyesClosed ? 'eyes-closed' : ''} {!isAwake ? 'sleepy-eyes' : ''}"
      style={!eyesClosed && lookDirection ? `transform: translateX(${lookDirection === 'left' ? -2 : 2}px);` : ''}
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
    transition: transform 0.08s ease-out; /* More natural blink timing */
    will-change: transform; /* GPU acceleration hint */
    transform: translateZ(0); /* Force GPU rendering */
  }
  
  /* Hover effects */
  .icon-container:hover,
  .icon-container:active {
    filter: drop-shadow(0 0 18px rgba(249, 168, 212, 0.45))
      drop-shadow(0 0 30px rgba(255, 156, 243, 0.3));
    animation: gentle-float 3s ease-in-out infinite, ghost-hover 1.2s ease-in-out infinite alternate;
    animation-delay: 0s, 0s;
  }
  
  /* Recording state - keep gentle floating while adding glow */
  .recording {
    animation: recording-glow 1.5s infinite, gentle-float 3s ease-in-out infinite !important;
    transform: scale(1.03);
    animation-delay: 0s, 0s;
    will-change: filter, transform; /* GPU hint for smooth filter animations */
  }
  
  /* Wobble animations */
  .ghost-wobble-left {
    animation: ghost-wobble-left 0.6s ease-in-out forwards !important;
  }
  
  .ghost-wobble-right {
    animation: ghost-wobble-right 0.6s ease-in-out forwards !important;
  }
  
  /* Eyes closed state - transform-based with natural feel */
  .eyes-closed {
    transform: scaleY(0.05) !important; /* Not too extreme closure */
    transition: transform 0.08s ease-out !important; /* Smoother, more natural close */
  }
  
  /* Sleepy eyes state */
  .sleepy-eyes {
    transform: scaleY(0.3) !important; /* Half-lidded eyes */
    opacity: 0.8; /* Sleepy state */
    transition: transform 0.5s ease, opacity 0.5s ease !important;
  }
  
  /* Sleeping state for whole ghost */
  .sleeping {
    animation: gentle-sleep 4s ease-in-out infinite !important;
    filter: saturate(0.8) brightness(0.95) !important;
  }
  
  /* Special animation class */
  .do-special-animation {
    animation: do-spin 2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards !important;
    filter: drop-shadow(0 0 20px rgba(255, 100, 243, 0.7)) !important;
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
      transform: translateY(0) rotate(0deg);
    }
    50% {
      transform: translateY(-3px) rotate(0.5deg);
    }
  }
  
  @keyframes gentle-sleep {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(2px); /* Sleepy bob is down, not up */
    }
  }
  
  @keyframes do-spin {
    0% { transform: rotate(0deg) scale(1); }
    25% { transform: rotate(90deg) scale(1.05); }
    50% { transform: rotate(180deg) scale(1.08); }
    75% { transform: rotate(270deg) scale(1.05); }
    100% { transform: rotate(360deg) scale(1); }
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