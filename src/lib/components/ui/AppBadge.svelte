<script>
  /**
   * AppBadge Component
   * 
   * A reusable UI component that displays a small .app badge next to product titles.
   * It's designed to feel like a playful but integral part of the brand identity,
   * with a light, charming, and confident presence.
   */
  
  // Props with defaults
  export let color = "#9c6ee7"; // Default purple-ish tone
  export let bgColor = "#fbefff"; // Default soft pastel background
  export let size = "0.75rem"; // Default size that works well with most titles
  export let customClass = ""; // Optional additional classes
</script>

<span 
  class="app-badge {customClass}" 
  style="--badge-color: {color}; --badge-bg-color: {bgColor}; --badge-size: {size};"
>
  .app
</span>

<style>
  .app-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: var(--badge-size, 0.75rem);
    color: var(--badge-color, #9c6ee7);
    background-color: var(--badge-bg-color, #fbefff);
    padding: 2px 8px;
    border-radius: 999px;
    margin-left: 0.15em;
    margin-bottom: 0.2em;
    transform-origin: center;
    cursor: default;
    user-select: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    line-height: 1;
    vertical-align: middle;
    position: relative;
    bottom: 0.1em;
    letter-spacing: -0.01em;
    font-weight: 500;
    box-shadow: 0 1px 2px rgba(156, 110, 231, 0.1);
  }
  
  .app-badge:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 4px rgba(156, 110, 231, 0.15);
  }
  
  /* Responsive adjustments */
  @media (max-width: 640px) {
    .app-badge {
      font-size: calc(var(--badge-size) * 0.95);
      padding: 1px 6px;
    }
  }
  
  @media (max-width: 480px) {
    .app-badge {
      font-size: calc(var(--badge-size) * 0.9);
      padding: 1px 5px;
    }
  }
</style>