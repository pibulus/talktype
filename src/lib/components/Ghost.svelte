<script>
  import { onMount, onDestroy } from 'svelte';
  
  // Props to communicate recording/processing state ONLY
  // These don't control animation directly - just tell us when we can blink
  export let isRecording = false;
  export let isProcessing = false;
  
  // Local state
  let blinkTimeoutId = null;
  let wobbleTimeoutId = null;
  let inactivityTimeoutId = null;
  let specialAnimationTimeoutId = null;
  
  let eyesClosed = false;
  let isWobbling = false;
  let isRainbow = false;
  let eyePositionX = 0; // For horizontal eye tracking: -1 to 1
  let eyePositionY = 0; // For vertical eye tracking: -1 to 1
  let isAwake = true; // For sleep state
  let doingSpecialAnimation = false; // For rare animations
  
  // Mouse tracking
  let ghostElement = null; // Reference to the container element
  
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
      
      // Start tracking mouse movement for eye position
      document.addEventListener('mousemove', trackMousePosition, { passive: true });
      
      // Start inactivity detection
      resetInactivity();
      
      // Start special animation detection
      maybeDoSpecialAnimation();
      
      // Set up event listeners for activity
      document.addEventListener('mousemove', resetInactivity);
      
      return () => {
        observer.disconnect();
        document.removeEventListener('mousemove', trackMousePosition);
        document.removeEventListener('mousemove', resetInactivity);
      };
    }
  });
  
  // Clean up on destroy
  onDestroy(() => {
    clearTimeout(blinkTimeoutId);
    clearTimeout(wobbleTimeoutId);
    clearTimeout(inactivityTimeoutId);
    clearTimeout(specialAnimationTimeoutId);
    
    // Clean up document event listeners if they exist
    if (typeof document !== 'undefined') {
      document.removeEventListener('mousemove', trackMousePosition);
      document.removeEventListener('mousemove', resetInactivity);
    }
  });
  
  // --- Animation Functions ---
  
  // Greeting animation
  function greetingAnimation() {
    // Add a quicker, snappier wobble and blinks
    isWobbling = true;
    wobbleTimeoutId = setTimeout(() => {
      isWobbling = false;
      
      // Snappier double blink for greeting
      eyesClosed = true;
      setTimeout(() => {
        eyesClosed = false;
        setTimeout(() => {
          eyesClosed = true;
          setTimeout(() => {
            eyesClosed = false;
            
            // Start ambient blinking
            scheduleBlink();
          }, 100); // Faster close
        }, 120); // Faster between blinks
      }, 100); // Faster open
    }, 400); // Shorter initial wobble (was 600ms)
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
  
  // Theme-specific glow colors
  let glowColors = {
    peach: {
      primary: 'rgba(255, 184, 208, 0.9)',   // Soft pink/peach
      secondary: 'rgba(253, 164, 175, 0.7)', // Light peachy pink
      tertiary: 'rgba(252, 231, 243, 0.6)'   // Very soft pink glow
    },
    mint: {
      primary: 'rgba(52, 211, 153, 0.9)',    // Bright mint green
      secondary: 'rgba(16, 185, 129, 0.7)',  // Medium mint
      tertiary: 'rgba(110, 231, 183, 0.6)'   // Light mint
    },
    bubblegum: {
      primary: 'rgba(244, 114, 182, 0.9)',   // Bright bubblegum
      secondary: 'rgba(236, 72, 153, 0.7)',  // Medium bubblegum
      tertiary: 'rgba(249, 168, 212, 0.6)'   // Light bubblegum
    },
    rainbow: {
      // Use dynamic colors with CSS variables to allow animation
      primary: 'var(--rainbow-primary, rgba(124, 58, 237, 0.9))',
      secondary: 'var(--rainbow-secondary, rgba(67, 56, 202, 0.7))',
      tertiary: 'var(--rainbow-tertiary, rgba(79, 70, 229, 0.6))'
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
  
  // Dispatch toggle recording event when clicked
  function handleClick(event) {
    // Make sure to reset inactivity timer on interaction
    resetInactivity();
    
    // ALWAYS wobble on click directly - don't wait for state change
    clearTimeout(wobbleTimeoutId);
    isWobbling = true;
    wobbleTimeoutId = setTimeout(() => {
      isWobbling = false;
    }, 600);
    
    // Make the eyes "look at" where they were clicked briefly
    if (!eyesClosed && typeof window !== 'undefined' && ghostElement) {
      // Use the click coordinates to update eye position
      trackMousePosition(event);
      
      // Hold the eyes in this position briefly
      setTimeout(() => {
        // Then gradually return to tracking
      }, 300);
    }
    
    // Dispatch event to let page know to toggle recording
    if (typeof document !== 'undefined') {
      const event = new CustomEvent('togglerecording');
      document.dispatchEvent(event);
    }
  }
  
  // Track previous state to detect actual changes
  let wasRecording = false;
  let wasProcessing = false;
  let wasRecordingTimestamp = null; // Track when recording started
  
  // Track mouse movement to move eyes
  function trackMousePosition(event) {
    if (typeof window === 'undefined' || !ghostElement || !isAwake || 
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
  bind:this={ghostElement}
  class="icon-container theme-{currentTheme}
         {isRecording ? 'recording' : ''}
         {isWobbling ? 'ghost-wobble-' + (Math.random() > 0.5 ? 'left' : 'right') : ''} 
         {!isAwake ? 'sleeping' : ''}
         {doingSpecialAnimation ? 'do-special-animation' : ''}"
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
    
    <!-- Eyes - controlled by local state with transform-based blinking and 2D mouse-following -->
    <img 
      src="/assets/talktype-icon-eyes.svg" 
      alt="" 
      class="icon-eyes {eyesClosed ? 'eyes-closed' : ''} {!isAwake ? 'sleepy-eyes' : ''}"
      style={
        eyesClosed ? 'transform: scaleY(0.05);' : 
        !isAwake ? `transform: translate(${eyePositionX * 3}px, ${eyePositionY * 1.5}px) scaleY(0.3);` :
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
  
  /* Base hover effects */
  .icon-container:hover,
  .icon-container:active {
    animation: gentle-float 3s ease-in-out infinite, ghost-hover 1.2s ease-in-out infinite alternate;
    animation-delay: 0s, 0s;
    filter: drop-shadow(0 0 18px rgba(252, 231, 243, 0.45))
      drop-shadow(0 0 30px rgba(255, 184, 208, 0.3));
  }
  
  /* Theme-specific hover glow effects */
  .icon-container:hover, /* Default theme is peach */
  .icon-container.theme-peach:hover {
    filter: drop-shadow(0 0 18px rgba(252, 231, 243, 0.45))
      drop-shadow(0 0 30px rgba(255, 184, 208, 0.3));
  }
  
  .icon-container.theme-mint:hover {
    filter: drop-shadow(0 0 18px rgba(110, 231, 183, 0.45))
      drop-shadow(0 0 30px rgba(52, 211, 153, 0.3));
  }
  
  .icon-container.theme-bubblegum:hover {
    filter: drop-shadow(0 0 18px rgba(249, 168, 212, 0.45))
      drop-shadow(0 0 30px rgba(244, 114, 182, 0.3));
  }
  
  .icon-container.theme-rainbow:hover {
    animation: rainbow-hover-glow 6s ease-in-out infinite !important;
  }
  
  @keyframes rainbow-hover-glow {
    0% { filter: drop-shadow(0 0 15px rgba(255, 102, 204, 0.3)) drop-shadow(0 0 25px rgba(255, 153, 204, 0.2)); }
    25% { filter: drop-shadow(0 0 15px rgba(153, 102, 255, 0.3)) drop-shadow(0 0 25px rgba(204, 153, 255, 0.2)); }
    50% { filter: drop-shadow(0 0 15px rgba(102, 153, 255, 0.3)) drop-shadow(0 0 25px rgba(153, 204, 255, 0.2)); }
    75% { filter: drop-shadow(0 0 15px rgba(153, 204, 255, 0.3)) drop-shadow(0 0 25px rgba(153, 255, 204, 0.2)); }
    100% { filter: drop-shadow(0 0 15px rgba(255, 102, 204, 0.3)) drop-shadow(0 0 25px rgba(255, 153, 204, 0.2)); }
  }
  
  /* Recording state - base styles shared across themes */
  .recording {
    transform: scale(1.03);
    animation-delay: 0s, 0s;
    will-change: filter, transform; /* GPU hint for smooth filter animations */
    animation: gentle-float 3s ease-in-out infinite !important; /* Always keep gentle floating */
  }
  
  /* Theme-specific recording glow animations */
  .recording.theme-peach {
    animation: recording-glow-peach 1.5s infinite, gentle-float 3s ease-in-out infinite !important;
  }
  
  .recording.theme-mint {
    animation: recording-glow-mint 1.5s infinite, gentle-float 3s ease-in-out infinite !important;
  }
  
  .recording.theme-bubblegum {
    animation: recording-glow-bubblegum 1.5s infinite, gentle-float 3s ease-in-out infinite !important;
  }
  
  .recording.theme-rainbow {
    animation: recording-glow-rainbow 8s ease-in-out infinite, gentle-float 3s ease-in-out infinite !important;
  }
  
  /* Wobble animations - simple direct class matching */
  .ghost-wobble-left {
    animation: ghost-wobble-left 0.6s ease-in-out forwards !important;
    will-change: transform; /* Hint for browser optimization */
  }
  
  .ghost-wobble-right {
    animation: ghost-wobble-right 0.6s ease-in-out forwards !important;
    will-change: transform; /* Hint for browser optimization */
  }
  
  /* Eyes closed state is now handled via inline style for better coordination with movement */
  .eyes-closed {
    transition: transform 0.08s ease-out !important; /* Smoother, more natural close */
  }
  
  /* Sleepy eyes state - now coordinated with inline style */
  .sleepy-eyes {
    opacity: 0.8 !important; /* Sleepy state */
    transition: transform 0.5s ease, opacity 0.5s ease !important;
  }
  
  /* Sleeping state for whole ghost */
  .sleeping {
    animation: gentle-sleep 4s ease-in-out infinite !important;
    filter: saturate(0.8) brightness(0.95) !important;
  }
  
  /* Special animation base class */
  .do-special-animation {
    animation: do-spin 2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards !important;
  }
  
  /* Theme-specific special animation glow */
  .do-special-animation.theme-peach {
    filter: drop-shadow(0 0 20px rgba(255, 184, 208, 0.7)) !important;
  }
  
  .do-special-animation.theme-mint {
    filter: drop-shadow(0 0 20px rgba(52, 211, 153, 0.7)) !important;
  }
  
  .do-special-animation.theme-bubblegum {
    filter: drop-shadow(0 0 20px rgba(244, 114, 182, 0.7)) !important;
  }
  
  .do-special-animation.theme-rainbow {
    animation: rainbow-special-glow 5s ease-in-out infinite !important;
  }
  
  @keyframes rainbow-special-glow {
    0% { filter: drop-shadow(0 0 20px rgba(255, 102, 204, 0.6)) !important; }
    25% { filter: drop-shadow(0 0 20px rgba(153, 102, 255, 0.6)) !important; }
    50% { filter: drop-shadow(0 0 20px rgba(102, 153, 255, 0.6)) !important; }
    75% { filter: drop-shadow(0 0 20px rgba(102, 204, 255, 0.6)) !important; }
    100% { filter: drop-shadow(0 0 20px rgba(255, 102, 204, 0.6)) !important; }
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
  
  /* Each theme has its own recording glow animation class */
  @keyframes recording-glow-peach {
    0% {
      filter: drop-shadow(0 0 15px rgba(255, 184, 208, 0.5))
        drop-shadow(0 0 25px rgba(252, 231, 243, 0.4));
    }
    50% {
      filter: drop-shadow(0 0 25px rgba(255, 184, 208, 0.8))
        drop-shadow(0 0 35px rgba(253, 164, 175, 0.5))
        drop-shadow(0 0 40px rgba(252, 231, 243, 0.4));
    }
    100% {
      filter: drop-shadow(0 0 15px rgba(255, 184, 208, 0.5))
        drop-shadow(0 0 25px rgba(252, 231, 243, 0.4));
    }
  }
  
  @keyframes recording-glow-mint {
    0% {
      filter: drop-shadow(0 0 15px rgba(52, 211, 153, 0.5))
        drop-shadow(0 0 25px rgba(110, 231, 183, 0.4));
    }
    50% {
      filter: drop-shadow(0 0 25px rgba(52, 211, 153, 0.8))
        drop-shadow(0 0 35px rgba(16, 185, 129, 0.5))
        drop-shadow(0 0 40px rgba(110, 231, 183, 0.4));
    }
    100% {
      filter: drop-shadow(0 0 15px rgba(52, 211, 153, 0.5))
        drop-shadow(0 0 25px rgba(110, 231, 183, 0.4));
    }
  }
  
  @keyframes recording-glow-bubblegum {
    0% {
      filter: drop-shadow(0 0 15px rgba(244, 114, 182, 0.5))
        drop-shadow(0 0 25px rgba(249, 168, 212, 0.4));
    }
    50% {
      filter: drop-shadow(0 0 25px rgba(244, 114, 182, 0.8))
        drop-shadow(0 0 35px rgba(236, 72, 153, 0.5))
        drop-shadow(0 0 40px rgba(249, 168, 212, 0.4));
    }
    100% {
      filter: drop-shadow(0 0 15px rgba(244, 114, 182, 0.5))
        drop-shadow(0 0 25px rgba(249, 168, 212, 0.4));
    }
  }
  
  @keyframes recording-glow-rainbow {
    0% {
      --rainbow-primary: rgba(255, 102, 204, 0.7); /* Pink-purple */
      --rainbow-secondary: rgba(204, 102, 255, 0.5); /* Light purple */
      --rainbow-tertiary: rgba(153, 102, 255, 0.3); /* Purple */
      filter: drop-shadow(0 0 15px var(--rainbow-primary))
        drop-shadow(0 0 25px var(--rainbow-tertiary));
    }
    25% {
      --rainbow-primary: rgba(153, 102, 255, 0.7); /* Purple */
      --rainbow-secondary: rgba(102, 153, 255, 0.5); /* Purple-blue */
      --rainbow-tertiary: rgba(102, 204, 255, 0.3); /* Light blue */
      filter: drop-shadow(0 0 20px var(--rainbow-primary))
        drop-shadow(0 0 30px var(--rainbow-secondary))
        drop-shadow(0 0 35px var(--rainbow-tertiary));
    }
    50% {
      --rainbow-primary: rgba(102, 153, 255, 0.7); /* Blue */
      --rainbow-secondary: rgba(102, 204, 255, 0.5); /* Light blue */
      --rainbow-tertiary: rgba(102, 255, 204, 0.3); /* Blue-green */
      filter: drop-shadow(0 0 15px var(--rainbow-primary))
        drop-shadow(0 0 25px var(--rainbow-tertiary));
    }
    75% {
      --rainbow-primary: rgba(102, 204, 255, 0.7); /* Light blue */
      --rainbow-secondary: rgba(153, 255, 204, 0.5); /* Blue-green */
      --rainbow-tertiary: rgba(204, 153, 255, 0.3); /* Light purple */
      filter: drop-shadow(0 0 20px var(--rainbow-primary))
        drop-shadow(0 0 30px var(--rainbow-secondary))
        drop-shadow(0 0 35px var(--rainbow-tertiary));
    }
    100% {
      --rainbow-primary: rgba(255, 102, 204, 0.7); /* Pink-purple */
      --rainbow-secondary: rgba(204, 102, 255, 0.5); /* Light purple */
      --rainbow-tertiary: rgba(153, 102, 255, 0.3); /* Purple */
      filter: drop-shadow(0 0 15px var(--rainbow-primary))
        drop-shadow(0 0 25px var(--rainbow-tertiary));
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