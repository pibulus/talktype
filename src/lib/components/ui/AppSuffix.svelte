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
  export let size = "60%"; // Default: 60% of parent size
  export let customClass = ""; // Optional additional classes
  export let offsetY = "0.15em"; // Default vertical offset from baseline
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
    font-size: var(--suffix-size, 60%);
    font-weight: 500;
    margin-left: 0.3em;
    line-height: 1;
    letter-spacing: -0.01em;
    font-kerning: normal;
    vertical-align: baseline;
    position: relative;
    bottom: var(--offset-y, 0.15em);
    font-variation-settings: 'wght' 500;
    transform: rotate(-2deg);
    transition: transform 0.3s ease;
  }
  
  .wiggle-on-hover:hover {
    animation: wiggle 0.5s ease-in-out;
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