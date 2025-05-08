import { writable, derived } from 'svelte/store';

// Create a store to track if app animations should be active
export const appActive = writable(true);

// Keep a cached version of the active state
let cachedActiveState = true;

// Create a subscription to keep the cached state updated
if (typeof window !== 'undefined') {
    appActive.subscribe(value => {
        cachedActiveState = value;
    });
}

// Initialize visibility listener if in browser environment
if (typeof document !== 'undefined') {
    // Set initial state based on document visibility
    appActive.set(document.visibilityState === 'visible');
    
    // Update state when visibility changes
    document.addEventListener('visibilitychange', () => {
        appActive.set(document.visibilityState === 'visible');
    });
}

// Export optimized utility function that uses the cached value
export function shouldAnimate() {
    return cachedActiveState;
}