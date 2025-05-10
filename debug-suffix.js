// Debug script to fix AppSuffix display issues
// Run this in the browser console when the app is running

// Only execute in development mode
if (import.meta.env && import.meta.env.MODE === 'development') {
  // Create a function to be called on demand
  function debugSuffix() {
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

  // Wait for DOM to be fully loaded
  function initDebugTools() {
    // Create a button to run the debug
    const btn = document.createElement('button');
    btn.textContent = 'Debug AppSuffix';
    btn.style.position = 'fixed';
    btn.style.top = '10px';
    btn.style.right = '10px';
    btn.style.zIndex = '10000';
    btn.style.padding = '10px';
    btn.style.background = 'red';
    btn.style.color = 'white';
    btn.style.fontWeight = 'bold';
    btn.style.borderRadius = '5px';
    btn.style.cursor = 'pointer';

    btn.onclick = debugSuffix;

    document.body.appendChild(btn);

    console.log('Debug script loaded - click the red button in the top right corner');
  }

  // Initialize when document is loaded
  if (document.readyState === 'complete') {
    initDebugTools();
  } else {
    window.addEventListener('DOMContentLoaded', initDebugTools);
  }
} else {
  console.log('Debug tools disabled in production mode');
}