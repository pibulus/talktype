<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import './ghost-animations.css';
  import './ghost-themes.css';
  import ghostPathsUrl from './ghost-paths.svg?url';
  
  // Props to communicate state 
  export let isRecording = false;
  export let isProcessing = false;
  export let animationState = 'idle'; // 'idle', 'wobble-start', 'wobble-stop'
  export let debug = false;

  // DOM element references
  let ghostSvg;
  let leftEye;
  let rightEye;
  let backgroundElement;

  // Local state
  let blinkTimeoutId = null;
  let wobbleTimeoutId = null;
  let specialAnimationTimeoutId = null;
  let eyesClosed = false;
  let isWobbling = false;
  let eyePositionX = 0; // For horizontal eye tracking: -1 to 1
  let eyePositionY = 0; // For vertical eye tracking: -1 to 1
  let doingSpecialAnimation = false; // For rare spin animation (easter egg)
  let currentTheme = 'peach';

  // Event dispatcher
  const dispatch = createEventDispatcher();

  // Force a browser reflow to ensure animations apply correctly
  function forceReflow(element) {
    if (!element) return;
    void element.offsetWidth;
  }

  // Update theme based on document attribute
  function updateTheme() {
    if (typeof document !== 'undefined') {
      currentTheme = document.documentElement.getAttribute('data-theme') || 'peach';
    }
  }

  // Track mouse movement for eye tracking
  function handleMouseMove(event) {
    if (typeof window === 'undefined' || !ghostSvg || eyesClosed) return; 

    // Get ghost element bounding box
    const ghostRect = ghostSvg.getBoundingClientRect();
    const ghostCenterX = ghostRect.left + ghostRect.width / 2;
    const ghostCenterY = ghostRect.top + ghostRect.height / 2;

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

    // Apply eye transforms directly with inline styles
    applyEyeTransforms();
  }
  
  // Apply eye transforms based on current state
  function applyEyeTransforms() {
    if (!leftEye || !rightEye) return;
    
    if (eyesClosed) {
      leftEye.style.transform = 'scaleY(0.05)';
      rightEye.style.transform = 'scaleY(0.05)';
    } else {
      leftEye.style.transform = `translate(${eyePositionX * 4}px, ${eyePositionY * 2}px)`;
      rightEye.style.transform = `translate(${eyePositionX * 4}px, ${eyePositionY * 2}px)`;
    }
  }

  // Helper function for single blink
  function performSingleBlink(onComplete) {
    eyesClosed = true;
    applyEyeTransforms();
    
    setTimeout(() => {
      eyesClosed = false;
      applyEyeTransforms();
      
      if (onComplete) {
        onComplete();
      }
    }, 150); 
  }
  
  // Helper function for double blink
  function performDoubleBlink(onComplete) {
    eyesClosed = true;
    applyEyeTransforms();
    
    setTimeout(() => {
      eyesClosed = false;
      applyEyeTransforms();
      
      setTimeout(() => {
        eyesClosed = true;
        applyEyeTransforms();
        
        setTimeout(() => {
          eyesClosed = false;
          applyEyeTransforms();
          
          if (onComplete) {
            onComplete();
          }
        }, 150);
      }, 180);
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
      // 25% chance of double blink, 75% single blink
      if (Math.random() < 0.25) {
        performDoubleBlink(() => scheduleBlink());
      } else {
        performSingleBlink(() => scheduleBlink());
      }
    }, delay);
  }

  // Handle click events
  function handleClick() {
    dispatch('toggleRecording');
  }

  // Lifecycle hooks
  onMount(() => {
    // Update theme on mount
    if (typeof document !== 'undefined') {
      updateTheme();

      // Add initial-load class to container for entrance animation
      // Add it to document body so it persists across potential component rerenders
      document.body.classList.add('initial-load');
      
      // Remove the class after animation completes to prevent future triggers
      setTimeout(() => {
        document.body.classList.remove('initial-load');
        
        // Start greeting wobble animation after grow animation completes
        console.log('Starting greeting wobble...');
        if (ghostSvg) {
          // Apply wobble-left directly to the SVG
          ghostSvg.querySelector('svg').classList.add('wobble-left');
          
          // Clear wobble after animation completes
          setTimeout(() => {
            ghostSvg.querySelector('svg').classList.remove('wobble-left');
            
            // Then do natural double blink after wobble completes
            performDoubleBlink(() => {
              scheduleBlink(); // Start ambient blinking after greeting
            });
          }, 600);
        } else {
          // Fallback if SVG not available
          performDoubleBlink(() => {
            scheduleBlink();
          });
        }
      }, 2200); // Slightly longer than the animation duration

      // Listen for theme changes
      setTimeout(() => {
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
      }, 50);

      // Greeting animation happens after grow animation (see above)

      // Start tracking mouse movement for eye position
      document.addEventListener('mousemove', handleMouseMove, { passive: true });

      // Start special animation detection (easter egg)
      maybeDoSpecialAnimation();

      return () => {
        observer.disconnect();
        document.removeEventListener('mousemove', handleMouseMove);
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
  
  // Special animations that rarely happen (easter egg)
  function maybeDoSpecialAnimation() {
    if (typeof window === 'undefined') return;

    clearTimeout(specialAnimationTimeoutId);

    // Very rare animation (5% chance when conditions are right)
    if (
      Math.random() < 0.05 &&
      !isRecording &&
      !isProcessing &&
      !doingSpecialAnimation &&
      !eyesClosed
    ) {
      doingSpecialAnimation = true;

      // Do a special animation (full spin)
      if (ghostSvg) {
        ghostSvg.classList.add('spin');
      }

      // Return to normal after animation
      setTimeout(() => {
        if (ghostSvg) {
          ghostSvg.classList.remove('spin');
        }
        doingSpecialAnimation = false;
      }, 2000);
    }

    // Schedule next check
    specialAnimationTimeoutId = setTimeout(maybeDoSpecialAnimation, 45000); // Check every 45 seconds
  }

  // Public methods to expose animation controls
  export function pulse() {
    // Add subtle pulse animation
    if (ghostSvg) {
      ghostSvg.classList.add('ghost-pulse');
      setTimeout(() => {
        ghostSvg.classList.remove('ghost-pulse');
      }, 600); // Pulse duration
    }
  }

  export function startThinking() {
    // Add thinking hard animation for eyes
    if (leftEye && rightEye) {
      // Stop ambient blinking
      clearTimeout(blinkTimeoutId);
      
      // Thinking blink pattern
      const thinkingInterval = setInterval(() => {
        if (!isProcessing) {
          clearInterval(thinkingInterval);
          return;
        }
        
        // Close eyes
        eyesClosed = true;
        applyEyeTransforms();
        
        // Open after short delay
        setTimeout(() => {
          eyesClosed = false;
          applyEyeTransforms();
        }, 50);
      }, 1000);
    }
    
    isProcessing = true;
  }

  export function stopThinking() {
    isProcessing = false;
    
    // Resume ambient blinking
    setTimeout(() => {
      scheduleBlink();
    }, 500);
  }

  export function reactToTranscript(textLength = 0) {
    // Skip if no element
    if (!leftEye || !rightEye) return;

    clearTimeout(blinkTimeoutId);
    
    if (textLength === 0) {
      scheduleBlink();
      return;
    }

    // Small delay before reacting
    setTimeout(() => {
      if (textLength > 20) {
        // For longer transcripts, do a "satisfied" double blink
        performDoubleBlink(() => scheduleBlink());
      } else {
        // For short transcripts, just do a single blink
        performSingleBlink(() => scheduleBlink());
      }
    }, 500);
  }

  // Function to force wobble animation - works with both direct calls and animation state
  export function forceWobble(direction = '', isStartRecording = false) {
    // Make sure we're in browser context
    if (typeof window === 'undefined') return;

    // Force animation restart by setting to false first
    isWobbling = false;

    // Force a browser reflow to ensure the animation gets reapplied
    if (ghostSvg) {
      forceReflow(ghostSvg);
    }

    // Choose direction
    const wobbleDirection = direction || (Math.random() > 0.5 ? 'wobble-left' : 'wobble-right');
    
    // Apply animation class to the SVG element (child of the button)
    const svgElement = ghostSvg?.querySelector('svg');
    if (svgElement) {
      console.log(`Applying ${wobbleDirection} to SVG element`);
      svgElement.classList.add(wobbleDirection);
    } else {
      console.warn('SVG element not found for wobble animation');
    }
    
    // Now set to true to start animation
    isWobbling = true;

    // Clear any existing wobble timer
    clearTimeout(wobbleTimeoutId);

    // Schedule the wobble to end after animation completes
    wobbleTimeoutId = setTimeout(() => {
      if (svgElement) {
        svgElement.classList.remove('wobble-left', 'wobble-right');
      }
      isWobbling = false;
    }, 600);
  }

  // Track previous state to detect actual changes
  let wasRecording = false;
  let wasProcessing = false;

  // Watch for animation state changes
  $: {
    // Apply animations based on animation state
    if (animationState === 'wobble-start') {
      forceWobble('wobble-left', true);
    } else if (animationState === 'wobble-stop') {
      forceWobble('wobble-right');
    }
  }

  // Watch for changes in recording/processing state - only for blinking
  $: {
    // Track previous state for blink management
    const wasRecordingTemp = wasRecording;
    const wasProcessingTemp = wasProcessing;

    // Blink handling
    if (isRecording || isProcessing) {
      // Clear any scheduled blinks during recording/processing
      clearTimeout(blinkTimeoutId);
    } else if ((wasRecordingTemp || wasProcessingTemp) && !isRecording && !isProcessing) {
      // Restart blinking after a delay when we're fully stopped
      setTimeout(() => {
        scheduleBlink();
      }, 1000);
    }

    // Update previous state for next comparison
    wasRecording = isRecording;
    wasProcessing = isProcessing;
  }
</script>

<button
  bind:this={ghostSvg}
  class="ghost-container theme-{currentTheme} 
      {isRecording ? 'recording recording-theme-' + currentTheme + ' ghost-recording-glow-' + currentTheme : ''}
      {isWobbling ? 'ghost-wobble-' + (Math.random() > 0.5 ? 'left' : 'right') : ''} 
      {doingSpecialAnimation ? 'do-special-animation' : ''}"
  on:click={handleClick}
  on:keydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  aria-label="Toggle Recording"
  aria-pressed={isRecording.toString()}
>
  <svg
    viewBox="0 0 1024 1024"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    class="ghost-svg theme-{currentTheme} {isRecording ? 'recording' : ''}"
  >
    <defs>
      <linearGradient id="peachGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="var(--ghost-peach-start)" />
        <stop offset="35%" stop-color="var(--ghost-peach-mid1)" />
        <stop offset="65%" stop-color="var(--ghost-peach-mid2)" />
        <stop offset="85%" stop-color="var(--ghost-peach-mid3)" />
        <stop offset="100%" stop-color="var(--ghost-peach-end)" />
      </linearGradient>

      <linearGradient id="mintGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="var(--ghost-mint-start)" />
        <stop offset="35%" stop-color="var(--ghost-mint-mid1)" />
        <stop offset="65%" stop-color="var(--ghost-mint-mid2)" />
        <stop offset="85%" stop-color="var(--ghost-mint-mid3)" />
        <stop offset="100%" stop-color="var(--ghost-mint-end)" />
      </linearGradient>

      <linearGradient id="bubblegumGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="var(--ghost-bubblegum-start)" />
        <stop offset="35%" stop-color="var(--ghost-bubblegum-mid1)" />
        <stop offset="65%" stop-color="var(--ghost-bubblegum-mid2)" />
        <stop offset="85%" stop-color="var(--ghost-bubblegum-mid3)" />
        <stop offset="100%" stop-color="var(--ghost-bubblegum-end)" />
      </linearGradient>

      <linearGradient id="rainbowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="var(--ghost-rainbow-start)" />
        <stop offset="25%" stop-color="var(--ghost-rainbow-mid1)" />
        <stop offset="50%" stop-color="var(--ghost-rainbow-mid2)" />
        <stop offset="75%" stop-color="var(--ghost-rainbow-mid3)" />
        <stop offset="100%" stop-color="var(--ghost-rainbow-end)" />
      </linearGradient>
    </defs>

    <g class="ghost-layer ghost-bg" bind:this={backgroundElement}>
      <use
        xlink:href={ghostPathsUrl}
        href={ghostPathsUrl + "#ghost-background"}
        class="ghost-shape"
        fill="url(#{currentTheme}Gradient)"
      />
    </g>

    <g class="ghost-layer ghost-outline">
      <use
        xlink:href={ghostPathsUrl}
        href={ghostPathsUrl + "#ghost-body-path"}
        class="ghost-outline-path"
        fill="#000000"
        opacity="1"
      />
    </g>

    <g class="ghost-layer ghost-eyes">
      <use
        bind:this={leftEye}
        xlink:href={ghostPathsUrl}
        href={ghostPathsUrl + "#ghost-eye-left-path"}
        class="ghost-eye ghost-eye-left"
        fill="#000000"
      />
      <use
        bind:this={rightEye}
        xlink:href={ghostPathsUrl}
        href={ghostPathsUrl + "#ghost-eye-right-path"}
        class="ghost-eye ghost-eye-right"
        fill="#000000"
      />
    </g>
  </svg>
</button>

<style>
  .ghost-container {
    position: relative;
    width: 100%;
    height: 100%;
    cursor: pointer;
    background: transparent;
    border: none;
    outline: none;
    -webkit-tap-highlight-color: transparent;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .ghost-container:focus,
  .ghost-container:active,
  .ghost-container:focus-visible {
    outline: none !important;
    outline-offset: 0 !important;
    box-shadow: none !important;
    border: none !important;
  }

  .ghost-svg {
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
  }

  .ghost-layer {
    transform-origin: center center;
  }
  
  /* Apply grow animation only on initial load with a separate class */
  :global(.initial-load) .ghost-layer {
    animation: grow-ghost 2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
</style>