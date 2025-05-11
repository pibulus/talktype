<script>
  import { onMount, onDestroy } from 'svelte';
  
  // Props
  export let enabled = import.meta.env ? import.meta.env.MODE === 'development' : false;
  
  // Local state
  let debugButton;
  let isDebugging = false;
  
  // Debug functionality
  function debugSuffix() {
    isDebugging = !isDebugging;
    
    if (!isDebugging) {
      // Clean up debug styles if debugging is turned off
      resetStyles();
      return;
    }
    
    // Get all app suffix elements
    const suffixes = document.querySelectorAll('.app-suffix');
    console.log('Found app suffix elements:', suffixes.length);
    
    // Apply direct styles to make them absolutely visible
    suffixes.forEach((suffix, index) => {
      suffix.style.position = 'absolute';
      suffix.style.bottom = '-0.5em';
      suffix.style.right = '-0.35em';
      suffix.style.zIndex = '9999';
      suffix.style.opacity = '1';
      suffix.style.background = 'rgba(255,255,255,0.5)';
      suffix.style.padding = '5px';
      suffix.style.borderRadius = '3px';
      suffix.style.border = '1px solid red';
      suffix.style.pointerEvents = 'none';
      
      console.log(`Suffix ${index} modified`);
    });
    
    // Also check the wrapper structure
    const wrappers = document.querySelectorAll('.suffix-wrapper');
    console.log('Found wrapper elements:', wrappers.length);
    
    wrappers.forEach((wrapper, index) => {
      wrapper.style.position = 'absolute';
      wrapper.style.border = '1px solid blue';
      wrapper.style.background = 'rgba(0,0,255,0.1)';
      wrapper.style.zIndex = '9998';
      wrapper.style.padding = '5px';
      wrapper.style.bottom = '-0.5em';
      
      console.log(`Wrapper ${index} modified`);
    });
    
    // Check the app text elements
    const appTexts = document.querySelectorAll('.app-text');
    console.log('Found app-text elements:', appTexts.length);
    
    appTexts.forEach((text, index) => {
      text.style.border = '1px solid green';
      text.style.padding = '5px';
      text.style.color = 'black !important';
      text.style.background = 'white !important';
      
      console.log(`Text ${index} content:`, text.textContent);
    });
  }
  
  // Reset any applied styles
  function resetStyles() {
    const elements = [
      ...document.querySelectorAll('.app-suffix'),
      ...document.querySelectorAll('.suffix-wrapper'),
      ...document.querySelectorAll('.app-text')
    ];
    
    elements.forEach(el => {
      el.removeAttribute('style');
    });
    
    console.log('Debug styles removed');
  }
  
  // Lifecycle management
  onMount(() => {
    if (!enabled) {
      console.log('Debug tools disabled in production mode');
    }
  });
  
  onDestroy(() => {
    // Clean up any debug styles when component is destroyed
    if (isDebugging) {
      resetStyles();
    }
  });
</script>

{#if enabled}
  <button
    bind:this={debugButton}
    class="debug-button {isDebugging ? 'active' : ''}"
    on:click={debugSuffix}
  >
    {isDebugging ? 'Reset Debug' : 'Debug AppSuffix'}
  </button>
{/if}

<style>
  .debug-button {
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 10000;
    padding: 10px;
    background: red;
    color: white;
    font-weight: bold;
    border-radius: 5px;
    cursor: pointer;
    border: none;
    outline: none;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    transition: background-color 0.2s ease;
  }
  
  .debug-button:hover {
    background: darkred;
  }
  
  .debug-button.active {
    background: #00aa55;
  }
  
  .debug-button.active:hover {
    background: #008844;
  }
</style>