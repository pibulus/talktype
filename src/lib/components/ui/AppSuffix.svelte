<script>
  import { theme as themeStore } from '$lib/components/ghost/themeStore.js';
  import { THEMES } from '$lib/constants';
  
  /**
   * AppSuffix Component
   * 
   * A small tag-like suffix that appears adjacent to a product name,
   * designed to feel like a printed label rather than a continuation of the title.
   */
  
  // Props with defaults
  export let color = "inherit"; // Default: inherit from parent
  export let size = "35%"; // Default: 35% of parent size (smaller suffix)
  export let customClass = ""; // Optional additional classes
  export let offsetX = "-0.2em"; // Horizontal positioning
  export let offsetY = "6px"; // Vertical positioning
  export let position = "bottom-right"; // Position preset
  
  // Keep current theme in sync with the global theme
  $: theme = $themeStore || THEMES.PEACH;
</script>

<span 
  class="app-suffix {customClass} {position} theme-{theme}" 
  style="--suffix-color: {color}; --suffix-size: {size}; --offset-x: {offsetX}; --offset-y: {offsetY};"
  aria-hidden="true"
>
  <span class="app-text" data-text=".app">.app</span>
</span>

<style>
  .app-suffix {
    display: inline-block;
    color: var(--suffix-color, inherit);
    font-size: var(--suffix-size, 30%);
    font-weight: 500;
    line-height: 1;
    letter-spacing: -0.01em;
    font-kerning: normal;
    position: absolute;
    bottom: -0.92em;
    right: var(--offset-x, -0.2em);
    margin-left: 0;
    font-family: inherit;
    font-variation-settings: inherit;
    transform: translateY(var(--offset-y, 6px));
    opacity: 0.8;
    z-index: 1;
    filter: drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.07));
  }
  
  .app-text {
    background-clip: text !important;
    -webkit-background-clip: text !important;
    color: transparent !important;
    text-shadow: 0 1px 1px rgba(0,0,0,0.04);
    transition: all 0.3s ease;
    display: inline-block;
    position: relative;
    transform-origin: center;
    padding: 0.1em 0; /* Add some padding for hover effect */
    will-change: transform;
  }
  
  /* Theme-specific gradients - softer */
  .theme-peach .app-text {
    background-image: linear-gradient(to bottom right, #fdba74, #fc7a90);
  }
  
  .theme-mint .app-text {
    background-image: linear-gradient(to bottom right, #4ad8cb, #67e799);
  }
  
  .theme-bubblegum .app-text {
    background-image: linear-gradient(to bottom right, #b67df8, #8183f4);
  }
  
  .theme-rainbow .app-text {
    background-image: linear-gradient(to bottom right, #ff9933, #33ffaa, #33b5ff);
  }
  
  /* Playful hover effects */
  .app-suffix:hover .app-text {
    filter: brightness(1.1) saturate(1.2);
    transform: rotate(-3deg) scale(1.05);
    transition: all 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28);
  }
  
  /* Position variations */
  /* Bottom positions */
  .bottom-right,
  .bottom-left {
    bottom: -0.92em;
  }
  
  /* Top positions */
  .top-right,
  .top-left {
    top: -0.5em;
    bottom: auto;
  }
  
  /* Right positions */
  .bottom-right,
  .top-right {
    right: var(--offset-x, -0.2em);
  }
  
  /* Left positions */
  .bottom-left,
  .top-left {
    left: var(--offset-x, -0.2em);
    right: auto;
  }
  
  /* Simple responsive adjustments */
  @media (max-width: 640px) {
    .app-suffix {
      font-size: calc(var(--suffix-size) * 0.95);
    }
  }
  
  @media (max-width: 480px) {
    .app-suffix {
      font-size: calc(var(--suffix-size) * 0.9);
    }
    
    .bottom-right, .bottom-left {
      bottom: -0.8em;
    }
    
    .top-right, .top-left {
      top: -0.48em;
    }
  }
  
  @media (min-width: 1024px) {
    .bottom-right, .bottom-left {
      bottom: -0.8em;
    }
    
    .top-right, .top-left {
      top: -0.52em;
    }
  }
</style>