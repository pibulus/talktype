<script>
  /**
   * AppSuffix Component
   * 
   * A small tag-like suffix that appears adjacent to a product name,
   * designed to feel like a printed label rather than a continuation of the title.
   */
  
  // Props with defaults
  export let color = "inherit"; // Default: inherit from parent
  export let size = "40%"; // Default: 40% of parent size (smaller suffix)
  export let customClass = ""; // Optional additional classes
  export let wiggleOnHover = true; // Whether to add wiggle effect on hover
  export let offsetX = "-0.2em"; // Horizontal positioning
  export let offsetY = "6px"; // Vertical positioning
  export let position = "bottom-right"; // Position preset
</script>

<span 
  class="app-suffix {wiggleOnHover ? 'wiggle-on-hover' : ''} {customClass} {position}" 
  style="--suffix-color: {color}; --suffix-size: {size}; --offset-x: {offsetX}; --offset-y: {offsetY};"
  aria-hidden="true"
>
  .app
</span>

<style>
  .app-suffix {
    display: inline-block;
    color: var(--suffix-color, inherit);
    font-size: var(--suffix-size, 40%);
    font-weight: 500; /* Medium weight as suggested */
    line-height: 1;
    letter-spacing: -0.01em;
    font-kerning: normal;
    position: absolute;
    bottom: -0.5em; /* Adjusted to sit in the "pocket" of the letters */
    right: var(--offset-x, -0.2em);
    margin-left: 6px;
    font-family: inherit;
    font-variation-settings: inherit;
    transform: rotate(-2deg) translateY(var(--offset-y, 6px)); /* Restore the slight rotation */
    transition: all 0.25s ease;
    opacity: 0.9;
    z-index: 1;
    filter: drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.07));
  }
  
  .wiggle-on-hover:hover {
    transform: rotate(-4deg) translateY(calc(var(--offset-y, 6px) - 2px)) scale(1.05);
    opacity: 1;
    filter: drop-shadow(0 1px 1px rgba(0,0,0,0.1));
  }
  
  /* Position variations */
  /* Bottom positions */
  .bottom-right,
  .bottom-left {
    bottom: -0.5em; /* Sits in the "pocket" of the final letters */
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
  
  /* Responsive adjustments */
  @media (max-width: 640px) {
    .app-suffix {
      font-size: calc(var(--suffix-size) * 0.95);
      transform: rotate(-2deg) translateY(var(--offset-y, 6px));
    }
    
    .bottom-right, .bottom-left {
      bottom: -0.5em;
    }
    
    .top-right, .top-left {
      top: -0.5em;
    }
  }
  
  @media (max-width: 480px) {
    .app-suffix {
      font-size: calc(var(--suffix-size) * 0.9);
      transform: rotate(-2deg) translateY(var(--offset-y, 6px));
      margin-left: 5px;
    }
    
    .bottom-right, .bottom-left {
      bottom: -0.48em;
    }
    
    .top-right, .top-left {
      top: -0.48em;
    }
  }
  
  @media (min-width: 1024px) {
    .app-suffix {
      transform: rotate(-2deg) translateY(var(--offset-y, 6px));
    }
    
    .bottom-right, .bottom-left {
      bottom: -0.52em;
    }
    
    .top-right, .top-left {
      top: -0.52em;
    }
  }
</style>