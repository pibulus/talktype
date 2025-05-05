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
</script>

<span 
  class="app-suffix {wiggleOnHover ? 'wiggle-on-hover' : ''} {customClass}" 
  style="--suffix-color: {color}; --suffix-size: {size};"
  aria-hidden="true"
>
  .app
</span>

<style>
  .app-suffix {
    display: inline-block;
    color: var(--suffix-color, inherit);
    font-size: var(--suffix-size, 40%);
    font-weight: 500; /* One step lighter than parent */
    line-height: 1;
    letter-spacing: -0.01em;
    font-kerning: normal;
    position: absolute;
    bottom: -0.65em; /* Position further below the baseline */
    right: -0.2em; /* Position to the right with more gap */
    font-family: inherit; /* Ensure same font as TalkType */
    font-variation-settings: inherit; /* Inherit font settings */
    transform: rotate(-2deg) translateX(-2px) translateY(4px); /* Playful positioning */
    transition: all 0.3s ease;
    opacity: 0.9;
    z-index: 1;
    filter: drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.07)); /* Subtle drop shadow */
  }
  
  .wiggle-on-hover:hover {
    transform: rotate(-4deg) translateX(-3px) translateY(3px) scale(1.05);
    filter: drop-shadow(0 1px 1px rgba(0,0,0,0.1));
  }
  
  /* Responsive adjustments */
  @media (max-width: 640px) {
    .app-suffix {
      font-size: calc(var(--suffix-size) * 0.95);
      bottom: -0.6em;
      right: -0.18em;
    }
  }
  
  @media (max-width: 480px) {
    .app-suffix {
      font-size: calc(var(--suffix-size) * 0.9);
      bottom: -0.58em;
      right: -0.15em;
      transform: rotate(-2deg) translateX(-1px) translateY(3px);
    }
  }
  
  @media (min-width: 1024px) {
    .app-suffix {
      bottom: -0.7em;
      right: -0.25em;
      transform: rotate(-2deg) translateX(-3px) translateY(5px);
    }
  }
</style>