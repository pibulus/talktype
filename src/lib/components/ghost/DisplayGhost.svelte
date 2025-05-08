<script>
  import './ghost-animations.css';
  import './ghost-themes.css';
  import ghostPathsUrl from './ghost-paths.svg?url';
  import { initGradientAnimation, cleanupAnimation, cleanupAllAnimations } from './gradientAnimator';
  import { onMount, onDestroy } from 'svelte';
  
  // Direct theme prop - no store subscription
  export let theme = 'peach';
  export let size = '40px';
  export let seed = Math.floor(Math.random() * 10000);
  export let disableJsAnimation = false; // Option to disable JS animation for performance
  
  // DOM references
  let ghostSvg;
  let leftEye;
  let rightEye;
  let eyesClosed = false;
  
  // Simple blink animation with random timing based on seed
  let blinkTimeoutId;
  let blinkCounter = 0;
  
  // Seeded random function
  function seedRandom(min, max) {
    const x = Math.sin(seed + blinkCounter++) * 10000;
    const random = x - Math.floor(x);
    return min + random * (max - min);
  }
  
  // Simplified blink scheduler
  function scheduleBlink() {
    clearTimeout(blinkTimeoutId);
    
    // Random delay with seed for unique timing per ghost
    const delay = 4000 + seedRandom(0, 1) * 5000;
    
    blinkTimeoutId = setTimeout(() => {
      // Single blink animation
      eyesClosed = true;
      updateEyes();
      
      // Open eyes after short delay
      setTimeout(() => {
        eyesClosed = false;
        updateEyes();
        
        // Schedule next blink
        scheduleBlink();
      }, 300);
    }, delay);
  }
  
  // Apply eye state
  function updateEyes() {
    if (!leftEye || !rightEye) return;
    
    if (eyesClosed) {
      leftEye.style.transform = `scaleY(0.05)`;
      rightEye.style.transform = `scaleY(0.05)`;
    } else {
      leftEye.style.transform = `translate(0, 0)`;
      rightEye.style.transform = `translate(0, 0)`;
    }
  }
  
  // Force reflow helper
  function forceReflow(element) {
    if (!element) return;
    void element.offsetWidth;
  }
  
  // Lifecycle
  onMount(() => {
    // Initialize gradient animation for current theme (if not disabled)
    if (ghostSvg && !disableJsAnimation) {
      const svgElement = ghostSvg.querySelector('svg');
      if (svgElement) {
        initGradientAnimation(theme, svgElement);
      }
    }
    
    // Start blinking (always enable this for visual consistency)
    scheduleBlink();
  });
  
  onDestroy(() => {
    clearTimeout(blinkTimeoutId);
    // Only clean up animations if they were initialized
    if (!disableJsAnimation) {
      cleanupAllAnimations();
    }
  });
</script>

<div class="display-ghost" style="width:{size}; height:{size};">
  <div bind:this={ghostSvg} class="ghost-container theme-{theme}">
    <svg
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      class="ghost-svg theme-{theme}"
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

      <g class="ghost-layer ghost-bg">
        <use
          xlink:href={ghostPathsUrl}
          href={ghostPathsUrl + '#ghost-background'}
          class="ghost-shape"
          id="ghost-shape"
          fill="url(#{theme}Gradient)"
        />
      </g>

      <g class="ghost-layer ghost-outline">
        <use
          xlink:href={ghostPathsUrl}
          href={ghostPathsUrl + '#ghost-body-path'}
          class="ghost-outline-path"
          fill="#000000"
          opacity="1"
        />
      </g>

      <g class="ghost-layer ghost-eyes">
        <use
          bind:this={leftEye}
          xlink:href={ghostPathsUrl}
          href={ghostPathsUrl + '#ghost-eye-left-path'}
          class="ghost-eye ghost-eye-left"
          fill="#000000"
        />
        <use
          bind:this={rightEye}
          xlink:href={ghostPathsUrl}
          href={ghostPathsUrl + '#ghost-eye-right-path'}
          class="ghost-eye ghost-eye-right"
          fill="#000000"
        />
      </g>
    </svg>
  </div>
</div>

<style>
  .display-ghost {
    position: relative;
    overflow: hidden;
  }
  
  .ghost-container {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
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

  /* Override default theme glows for DisplayGhost to be more subtle */
  :global(.display-ghost .ghost-container.theme-peach) {
    filter: drop-shadow(0 0 2px rgba(255, 120, 160, 0.2));
    will-change: filter;
    transform: translateZ(0);
    backface-visibility: hidden;
  }

  :global(.display-ghost .ghost-container.theme-mint) {
    filter: drop-shadow(0 0 2px rgba(80, 235, 170, 0.2));
    will-change: filter;
    transform: translateZ(0);
    backface-visibility: hidden;
  }

  :global(.display-ghost .ghost-container.theme-bubblegum) {
    filter: drop-shadow(0 0 2px rgba(200, 140, 255, 0.2));
    will-change: filter;
    transform: translateZ(0);
    backface-visibility: hidden;
  }

  :global(.display-ghost .ghost-container.theme-rainbow) {
    filter: drop-shadow(0 0 2px rgba(255, 170, 190, 0.2));
    will-change: filter;
    transform: translateZ(0);
    backface-visibility: hidden;
  }
</style>
