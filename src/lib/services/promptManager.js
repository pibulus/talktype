import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { promptTemplates, applyTemplate } from './promptTemplates';

// Create a store for the current prompt style
const STORAGE_KEY = 'talktype-prompt-style';
const DEFAULT_STYLE = 'standard';

// Initialize with stored preference or default
const createPromptStyleStore = () => {
  const store = writable(DEFAULT_STYLE);
  
  // Initialize from localStorage if in browser
  if (browser) {
    const storedStyle = localStorage.getItem(STORAGE_KEY);
    if (storedStyle && promptTemplates[storedStyle]) {
      store.set(storedStyle);
    }
  }
  
  // Return the store with custom methods
  return {
    ...store,
    setStyle: (style) => {
      if (!promptTemplates[style]) {
        console.error(`Prompt style '${style}' not found`);
        return false;
      }
      
      store.set(style);
      
      // Save to localStorage if in browser
      if (browser) {
        localStorage.setItem(STORAGE_KEY, style);
      }
      
      return true;
    },
    getAvailableStyles: () => {
      return Object.keys(promptTemplates);
    }
  };
};

// Create and export the store
export const promptStyleStore = createPromptStyleStore();

// Prompt manager functions
export const promptManager = {
  // Get the current prompt style
  getCurrentStyle: () => get(promptStyleStore),
  
  // Set the current prompt style
  setStyle: (style) => promptStyleStore.setStyle(style),
  
  // Get available prompt styles
  getAvailableStyles: () => promptStyleStore.getAvailableStyles(),
  
  // Get a prompt for a specific operation using the current style
  getPrompt: (operation, variables = {}) => {
    const currentStyle = get(promptStyleStore);
    
    // Get the template for the current style and operation
    if (!promptTemplates[currentStyle]) {
      console.error(`Prompt style '${currentStyle}' not found, falling back to standard`);
      return applyTemplate(promptTemplates.standard[operation].text, variables);
    }
    
    if (!promptTemplates[currentStyle][operation]) {
      console.error(`Operation '${operation}' not found in style '${currentStyle}', falling back to standard`);
      return applyTemplate(promptTemplates.standard[operation].text, variables);
    }
    
    return applyTemplate(promptTemplates[currentStyle][operation].text, variables);
  },
  
  // Subscribe to style changes
  subscribe: (callback) => promptStyleStore.subscribe(callback)
};
