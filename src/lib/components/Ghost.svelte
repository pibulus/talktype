<script>
  import { onMount, onDestroy } from 'svelte';
  
  // Props to communicate recording/processing state ONLY
  // These don't control animation directly - just tell us when we can blink
  export let isRecording = false;
  export let isProcessing = false;
  
  // Local state
  let blinkTimeoutId = null;
  let wobbleTimeoutId = null;
  let specialAnimationTimeoutId = null;
  let eyesClosed = false;
  let isWobbling = false;
  let isRainbow = false;
  let eyePositionX = 0; // For horizontal eye tracking: -1 to 1
  let eyePositionY = 0; // For vertical eye tracking: -1 to 1
  let doingSpecialAnimation = false; // For rare spin animation (easter egg)
  let currentTheme = 'peach';
  let bgImageSrc = '/talktype-icon-bg-gradient.svg';
  
  // Mouse tracking
  let ghostElement = null; // Reference to the container element
  
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
      
      // Start tracking mouse movement for eye position
      document.addEventListener('mousemove', trackMousePosition, { passive: true });
      
      // Function reference for ghost-wobble event
      const handleGhostWobble = () => {
        console.log('Ghost received wobble event from AudioToText');
        forceWobble();
      };
      
      // Start special animation detection (easter egg)
      maybeDoSpecialAnimation();
      
      // Add the event listener with the named function
      document.addEventListener('ghost-wobble', handleGhostWobble);
      
      return () => {
        observer.disconnect();
        document.removeEventListener('mousemove', trackMousePosition);
        document.removeEventListener('ghost-wobble', handleGhostWobble);
        clearTimeout(specialAnimationTimeoutId);
        clearTimeout(wobbleTimeoutId);
      };
    }
  });
  
  // Clean up on destroy
  onDestroy(() => {
    clearTimeout(blinkTimeoutId);
    clearTimeout(wobbleTimeoutId);
    clearTimeout(specialAnimationTimeoutId);
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
  
  // Theme-specific glow colors - extra saturated with morning dew vibe
  let glowColors = {
    peach: {
      // Extra vibrant peachy pink with sunrise glow
      primary: 'rgba(255, 120, 170, 0.95)',    // More saturated peachy pink (main)
      secondary: 'rgba(255, 180, 215, 0.9)',   // Brighter pink highlight 
      tertiary: 'rgba(255, 220, 235, 0.8)'     // Intense morning light glow
    },
    mint: {
      // Super fresh mint with dewy glow
      primary: 'rgba(50, 245, 175, 0.95)',     // More saturated bright mint (main)
      secondary: 'rgba(110, 255, 200, 0.9)',   // Brighter mint highlight
      tertiary: 'rgba(180, 255, 225, 0.8)'     // Intense dewy glow layer
    },
    bubblegum: {
      // Purple-blue bubblegum theme (completely different color)
      primary: 'rgba(170, 120, 255, 0.95)',    // Purple-blue main color
      secondary: 'rgba(200, 160, 255, 0.9)',   // Softer purple highlight
      tertiary: 'rgba(230, 200, 255, 0.8)'     // Soft purple glow
    },
    rainbow: {
      // Rainbow now uses a special CSS gradient approach
      primary: 'var(--rainbow-primary, rgba(255, 0, 128, 0.95))',
      secondary: 'var(--rainbow-secondary, rgba(255, 140, 200, 0.9))', 
      tertiary: 'var(--rainbow-tertiary, rgba(255, 200, 230, 0.8))'
    }
  };
  
  // Current theme's glow colors
  let currentGlowColors = glowColors.peach;
  
  // Update theme based on document attribute
  function updateTheme() {
    if (typeof document !== 'undefined') {
      currentTheme = document.documentElement.getAttribute('data-theme') || 'peach';
      isRainbow = currentTheme === 'rainbow';
      
      // Update glow colors based on theme
      currentGlowColors = glowColors[currentTheme] || glowColors.peach;
      
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
  
  // Special animations that rarely happen (easter egg)
  function maybeDoSpecialAnimation() {
    if (typeof window === 'undefined') return;
    
    clearTimeout(specialAnimationTimeoutId);
    
    // Very rare animation (5% chance when conditions are right)
    if (Math.random() < 0.05 && !isRecording && !isProcessing && 
        !doingSpecialAnimation && !eyesClosed) {
      
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
  
  // Track mouse movement to move eyes
  function trackMousePosition(event) {
    if (typeof window === 'undefined' || !ghostElement || 
        eyesClosed) return; // Allow tracking during recording for better tactility
    
    // Get ghost element bounding box
    const ghostRect = ghostElement.getBoundingClientRect();
    const ghostCenterX = ghostRect.left + (ghostRect.width / 2);
    const ghostCenterY = ghostRect.top + (ghostRect.height / 2);
    
    // Calculate mouse position relative to ghost center
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    const distanceX = mouseX - ghostCenterX;
    const distanceY = mouseY - ghostCenterY;
    
    // Normalize to values between -1 and 1
    const maxDistanceX = window.innerWidth / 3; // More responsive horizontal tracking
    const maxDistanceY = window.innerHeight / 3; // Vertical tracking
    const normalizedX = Math.max(-1, Math.min(1, distanceX / maxDistanceX));
    const normalizedY = Math.max(-1, Math.min(1, distanceY / maxDistanceY));
    
    // Add smaller dead zone for more responsiveness
    if (Math.abs(normalizedX) < 0.05) {
      eyePositionX = 0;
    } else {
      // Apply faster smoothing for better tactility - 20% toward target
      eyePositionX = eyePositionX + (normalizedX - eyePositionX) * 0.2;
    }
    
    // Vertical tracking with smaller movement range
    if (Math.abs(normalizedY) < 0.05) {
      eyePositionY = 0;
    } else {
      // Apply faster smoothing for better tactility - 20% toward target
      eyePositionY = eyePositionY + (normalizedY - eyePositionY) * 0.2;
    }
  }
  
  // Dispatch toggle recording event when clicked
  function handleClick() {
    // Directly apply wobble class without relying on reactive statements
    // This is absolutely critical for it to work consistently
    forceWobble();
    
    // Dispatch event to let page know to toggle recording
    if (typeof document !== 'undefined') {
      const event = new CustomEvent('togglerecording');
      document.dispatchEvent(event);
    }
  }
  
  // Separate function to force wobble animation that can be called from anywhere
  function forceWobble() {
    console.log('🪄 FORCE WOBBLE triggered - DEBUG: isWobbling before=', isWobbling);
    
    // Force animation restart by setting to false first
    isWobbling = false;
    
    // Force a browser reflow to ensure the animation gets reapplied
    if (ghostElement) {
      void ghostElement.offsetWidth;
    }
    
    // Now set to true to start animation
    isWobbling = true;
    console.log('🪄 FORCE WOBBLE - DEBUG: isWobbling after=', isWobbling);
    
    // Clear any existing wobble timer
    clearTimeout(wobbleTimeoutId);
    
    // Schedule the wobble to end after animation completes
    wobbleTimeoutId = setTimeout(() => {
      console.log('🪄 FORCE WOBBLE ended');
      isWobbling = false;
    }, 600);
  }
  
  // Track previous state to detect actual changes
  let wasRecording = false;
  let wasProcessing = false;
  
  // Watch for changes in recording/processing state
  $: {
    if (isRecording || isProcessing) {
      // Clear any scheduled blinks during recording/processing
      clearTimeout(blinkTimeoutId);
      
      // Only wobble when STARTING recording (not just any state update)
      if (isRecording && !wasRecording && typeof window !== 'undefined') {
        console.log('Ghost wobble: START recording detected');
        // Use the same reusable function
        forceWobble();
      }
    } 
    // Restart blinking when finished recording/processing
    else if ((wasRecording || wasProcessing) && !isRecording && !isProcessing) {
      // Add wobble only when STOPPING recording
      if (wasRecording && typeof window !== 'undefined') {
        console.log('Ghost wobble: STOP recording detected');
        // Use the same reusable function
        forceWobble();
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
  bind:this={ghostElement}
  class="icon-container theme-{currentTheme} {isRecording ? 'recording' : ''} {isWobbling ? 'ghost-wobble-' + (Math.random() > 0.5 ? 'left' : 'right') : ''} {doingSpecialAnimation ? 'do-special-animation' : ''}"
  style={isRecording ? `filter: drop-shadow(0 0 25px ${currentGlowColors.primary}) drop-shadow(0 0 35px ${currentGlowColors.secondary}) drop-shadow(0 0 45px ${currentGlowColors.tertiary}) !important;` : ''}
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
      style={
        eyesClosed ? 'transform: scaleY(0.05);' : 
        `transform: translate(${eyePositionX * 4}px, ${eyePositionY * 2}px);`
      }
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
  
  /* Recording state - theme-specific animations with bobbing */
  .recording.theme-peach {
    animation: recording-glow-peach 2s ease-in-out infinite, gentle-float 3s ease-in-out infinite !important;
    transform: scale(1.03);
  }
  
  .recording.theme-mint {
    animation: recording-glow-mint 2s ease-in-out infinite, gentle-float 3s ease-in-out infinite !important;
    transform: scale(1.03);
  }
  
  .recording.theme-bubblegum {
    animation: recording-glow-bubblegum 2s ease-in-out infinite, gentle-float 3s ease-in-out infinite !important;
    transform: scale(1.03);
  }
  
  .recording.theme-rainbow {
    /* Rainbow uses different animation with actual color cycling */
    animation: rainbow-color-cycle 5s linear infinite, recording-glow-pulse 2s ease-in-out infinite, gentle-float 3s ease-in-out infinite !important;
    transform: scale(1.03);
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
  
  /* Theme-specific recording glow animations */
  @keyframes recording-glow-peach {
    /* Extra saturated sunrise glow with THREE VISIBLY DISTINCT COLORS */
    0%, 5%, 95%, 100% {
      filter: drop-shadow(0 0 15px rgba(255, 80, 150, 1.0)) /* Bright hot pink - most visible */
        drop-shadow(0 0 35px rgba(255, 150, 100, 0.9)) /* Orange accent - second layer */
        drop-shadow(0 0 55px rgba(255, 240, 200, 0.8)); /* Pale yellow glow - outer layer */
    }
    50% {
      filter: drop-shadow(0 0 25px rgba(255, 80, 150, 1.0)) /* Bright hot pink intensified */
        drop-shadow(0 0 60px rgba(255, 150, 100, 0.95)) /* Orange accent expanded */
        drop-shadow(0 0 90px rgba(255, 240, 200, 0.9)); /* Pale yellow expanded */
    }
  }
  
  @keyframes recording-glow-mint {
    /* Fresh mint with THREE VISIBLY DISTINCT COLORS */
    0%, 5%, 95%, 100% {
      filter: drop-shadow(0 0 15px rgba(0, 220, 150, 1.0)) /* Bright teal/mint - most visible */
        drop-shadow(0 0 35px rgba(100, 255, 210, 0.9)) /* Lighter mint green - second layer */
        drop-shadow(0 0 55px rgba(160, 255, 230, 0.8)); /* Very pale mint - outer layer */
    }
    50% {
      filter: drop-shadow(0 0 25px rgba(0, 220, 150, 1.0)) /* Bright teal/mint intensified */
        drop-shadow(0 0 60px rgba(100, 255, 210, 0.95)) /* Lighter mint expanded */
        drop-shadow(0 0 90px rgba(160, 255, 230, 0.9)); /* Pale mint expanded */
    }
  }
  
  @keyframes recording-glow-bubblegum {
    /* New purple-blue with THREE VISIBLY DISTINCT COLORS */
    0%, 5%, 95%, 100% {
      filter: drop-shadow(0 0 15px rgba(140, 80, 255, 1.0)) /* Rich purple - most visible */
        drop-shadow(0 0 35px rgba(180, 120, 255, 0.9)) /* Medium purple - second layer */
        drop-shadow(0 0 55px rgba(210, 180, 255, 0.8)); /* Pale lilac - outer layer */
    }
    50% {
      filter: drop-shadow(0 0 25px rgba(140, 80, 255, 1.0)) /* Rich purple intensified */
        drop-shadow(0 0 60px rgba(180, 120, 255, 0.95)) /* Medium purple expanded */
        drop-shadow(0 0 90px rgba(210, 180, 255, 0.9)); /* Pale lilac expanded */
    }
  }
  
  /* New animation that ACTUALLY cycles through rainbow colors */
  @keyframes rainbow-color-cycle {
    0%, 100% {
      filter: drop-shadow(0 0 20px rgba(255, 50, 150, 1.0)); /* Pink/magenta */
    }
    16.6% {
      filter: drop-shadow(0 0 20px rgba(255, 90, 90, 1.0)); /* Red */
    }
    33.3% {
      filter: drop-shadow(0 0 20px rgba(255, 180, 80, 1.0)); /* Orange */
    }
    50% {
      filter: drop-shadow(0 0 20px rgba(255, 230, 100, 1.0)); /* Yellow */
    }
    66.6% {
      filter: drop-shadow(0 0 20px rgba(80, 220, 120, 1.0)); /* Green */
    }
    83.3% {
      filter: drop-shadow(0 0 20px rgba(80, 160, 255, 1.0)); /* Blue */
    }
  }
  
  /* Separate pulsing animation for rainbow theme */
  @keyframes recording-glow-pulse {
    0%, 5%, 95%, 100% {
      filter: drop-shadow(0 0 25px currentColor)
             drop-shadow(0 0 40px currentColor);
    }
    50% {
      filter: drop-shadow(0 0 35px currentColor)
             drop-shadow(0 0 60px currentColor)
             drop-shadow(0 0 90px currentColor);
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