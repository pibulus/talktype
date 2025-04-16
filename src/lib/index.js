// Centralized stores for application state management
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

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
export const theme = createLocalStorageStore('talktype-vibe', 'peach');

// Create centralized store for recording state
export const isRecording = writable(false);

// Create centralized stores for modal visibility
export const showAboutInfo = writable(false);
export const showExtensionInfo = writable(false);
export const showSettingsModal = writable(false);

// Store for first visit tracking
export const hasSeenIntro = createLocalStorageStore('hasSeenTalkTypeIntro', 'false');

// Store for auto-record preference
export const autoRecord = createLocalStorageStore('talktype-autoRecord', 'false');

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
        case 'mint':
          ghostBg.src = '/talktype-icon-bg-gradient-mint.svg';
          ghostBg.classList.remove('rainbow-animated');
          break;
        case 'bubblegum':
          ghostBg.src = '/talktype-icon-bg-gradient-bubblegum.svg';
          ghostBg.classList.remove('rainbow-animated');
          break;
        case 'rainbow':
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