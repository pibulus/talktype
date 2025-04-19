// Centralized stores for application state management
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import * as CONSTANTS from './constants';

// Initialize store with localStorage value if available
function createLocalStorageStore(key, initialValue) {
  // Create the writable store
  const store = writable(initialValue);
  
  // Initialize from localStorage if in browser context
  if (browser) {
    const storedValue = localStorage.getItem(key);
    if (storedValue) {
      store.set(storedValue);
    }
  }
  
  // Return a custom store that syncs with localStorage
  return {
    subscribe: store.subscribe,
    set: (value) => {
      if (browser) {
        localStorage.setItem(key, value);
      }
      store.set(value);
    },
    update: (fn) => {
      store.update(storeValue => {
        const newValue = fn(storeValue);
        if (browser) {
          localStorage.setItem(key, newValue);
        }
        return newValue;
      });
    }
  };
}

// Create centralized store for theme/vibe management
export const theme = createLocalStorageStore(CONSTANTS.STORAGE_KEYS.THEME, CONSTANTS.DEFAULT_THEME);

// Create centralized store for recording state
export const isRecording = writable(false);

// Create centralized stores for modal visibility
export const showAboutInfo = writable(false);
export const showExtensionInfo = writable(false);
export const showSettingsModal = writable(false);

// Store for first visit tracking
export const hasSeenIntro = createLocalStorageStore(CONSTANTS.STORAGE_KEYS.FIRST_VISIT, 'false');

// Store for auto-record preference
export const autoRecord = createLocalStorageStore(CONSTANTS.STORAGE_KEYS.AUTO_RECORD, 'false');

// Store for prompt style preference
export const promptStyle = createLocalStorageStore(CONSTANTS.STORAGE_KEYS.PROMPT_STYLE, CONSTANTS.DEFAULT_PROMPT_STYLE);

// Export all constants for use throughout the app
export { CONSTANTS };

// Helper function to apply theme across app components
export function applyTheme(vibeId) {
  // Update the store (which also updates localStorage)
  theme.set(vibeId);
  
  if (browser) {
    // Apply theme to document root for consistent CSS targeting
    document.documentElement.setAttribute('data-theme', vibeId);
    
    // Update ghost icon by swapping the SVG file
    const ghostBg = document.querySelector('.icon-bg');
    if (ghostBg) {
      // Set the appropriate gradient SVG based on theme
      switch(vibeId) {
        case CONSTANTS.THEMES.MINT:
          ghostBg.src = '/talktype-icon-bg-gradient-mint.svg';
          ghostBg.classList.remove('rainbow-animated');
          break;
        case CONSTANTS.THEMES.BUBBLEGUM:
          ghostBg.src = '/talktype-icon-bg-gradient-bubblegum.svg';
          ghostBg.classList.remove('rainbow-animated');
          break;
        case CONSTANTS.THEMES.RAINBOW:
          ghostBg.src = '/talktype-icon-bg-gradient-rainbow.svg';
          ghostBg.classList.add('rainbow-animated');
          break;
        default: // Default to peach
          ghostBg.src = '/talktype-icon-bg-gradient.svg';
          ghostBg.classList.remove('rainbow-animated');
          break;
      }
      
      // Force a reflow to ensure the gradient is visible
      void ghostBg.offsetWidth;
    }
  }
}