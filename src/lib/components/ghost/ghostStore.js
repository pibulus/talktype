// Minimal Ghost animation store
// Handles shared state across components without over-engineering

import { writable, derived, get } from 'svelte/store';

// Core state for the ghost
const createGhostStore = () => {
  // Base store with minimal state
  const store = writable({
    isRecording: false,
    isProcessing: false,
    theme: {
      current: 'peach', // 'peach', 'mint', 'bubblegum', 'rainbow'
      bgPath: '/talktype-icon-bg-gradient.svg'
    }
  });

  // Derived theme path updates automatically when theme changes
  const themePath = derived(store, $store => {
    const theme = $store.theme.current;
    
    switch (theme) {
      case 'mint':
        return '/talktype-icon-bg-gradient-mint.svg';
      case 'bubblegum':
        return '/talktype-icon-bg-gradient-bubblegum.svg';
      case 'rainbow':
        return '/talktype-icon-bg-gradient-rainbow.svg';
      default: // Default to peach
        return '/talktype-icon-bg-gradient.svg';
    }
  });

  // Return simple API for state changes
  return {
    subscribe: store.subscribe,
    themePath: themePath,
    
    // Recording state
    setRecording: (value) => {
      store.update(state => ({ ...state, isRecording: value }));
    },
    
    // Processing state
    setProcessing: (value) => {
      store.update(state => ({ ...state, isProcessing: value }));
    },
    
    // Theme handling
    setTheme: (theme) => {
      store.update(state => ({ 
        ...state, 
        theme: { ...state.theme, current: theme }
      }));
    },
    
    // Get current state without subscribing
    getState: () => get(store)
  };
};

// Export a singleton instance
export const ghostStore = createGhostStore();

// Convenience exports for easier component subscriptions
export const isRecording = derived(ghostStore, $store => $store.isRecording);
export const isProcessing = derived(ghostStore, $store => $store.isProcessing);
export const theme = derived(ghostStore, $store => $store.theme.current);