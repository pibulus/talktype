<script>
  /**
   * AppSuffix Component
   * 
   * A stylistic suffix that completes the product name.
   * Designed to match the brand wordmark's style but sit
   * as a distinct suffix element.
   */
  
  // Props with defaults
  export let color = "inherit"; // Default: inherit from parent
  export let size = "55%"; // Default: 55% of parent size (reduced from 60%)
  export let customClass = ""; // Optional additional classes
  export let offsetY = "0.2em"; // Default vertical offset from baseline (increased from 0.15em)
  export let wiggleOnHover = true; // Whether to add wiggle effect on hover
</script>

<span 
  class="app-suffix {wiggleOnHover ? 'wiggle-on-hover' : ''} {customClass}" 
  style="--suffix-color: {color}; --suffix-size: {size}; --offset-y: {offsetY};"
>
  .app
</span>

<style>
  .app-suffix {
    display: inline-block;
    color: var(--suffix-color, inherit);
    font-size: var(--suffix-size, 55%);
    font-weight: inherit;
    margin-left: 0.25em;
    line-height: 1;
    letter-spacing: -0.01em;
    font-kerning: normal;
    vertical-align: baseline;
    position: absolute;
    bottom: var(--offset-y, 0.2em);
    right: -1.5em;
    font-variation-settings: inherit;
    transform: rotate(-2deg);
    transition: all 0.3s ease;
    opacity: 0.85;
  }
  
  .wiggle-on-hover:hover {
    transform: translateY(-1px) rotate(-2deg) scale(1.02);
  }
  
  @keyframes wiggle {
    0% { transform: rotate(-2deg); }
    25% { transform: rotate(0deg); }
    50% { transform: rotate(-3deg); }
    75% { transform: rotate(-1deg); }
    100% { transform: rotate(-2deg); }
  }
  
  /* Responsive adjustments */
  @media (max-width: 640px) {
    .app-suffix {
      font-size: calc(var(--suffix-size) * 0.95);
    }
  }
</style>