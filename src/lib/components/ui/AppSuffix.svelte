<script>
  /**
   * AppSuffix Component
   * 
   * A small tag-like suffix that appears adjacent to a product name,
   * designed to feel like a printed label rather than a continuation of the title.
   */
  
  // Props with defaults
  export let color = "inherit"; // Default: inherit from parent
  export let size = "30%"; // Default: 30% of parent size (smaller suffix)
  export let customClass = ""; // Optional additional classes
  export let offsetX = "-0.2em"; // Horizontal positioning
  export let offsetY = "6px"; // Vertical positioning
  export let position = "bottom-right"; // Position preset
</script>

<span 
  class="app-suffix {customClass} {position}" 
  style="--suffix-color: {color}; --suffix-size: {size}; --offset-x: {offsetX}; --offset-y: {offsetY};"
  aria-hidden="true"
>
  .app
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
    bottom: -0.8em;
    right: var(--offset-x, -0.2em);
    margin-left: 0;
    font-family: inherit;
    font-variation-settings: inherit;
    transform: translateY(var(--offset-y, 6px));
    opacity: 0.85;
    z-index: 1;
    filter: drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.07));
  }
  
  /* Position variations */
  /* Bottom positions */
  .bottom-right,
  .bottom-left {
    bottom: -0.8em;
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