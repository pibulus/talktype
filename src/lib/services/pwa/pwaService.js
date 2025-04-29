import { browser } from '$app/environment';
import { writable, derived } from 'svelte/store';

// PWA state keys
const PWA_INSTALL_PROMPT_THRESHOLD = 5;
const TRANSCRIPTION_COUNT_KEY = 'talktype-transcription-count';
const PWA_PROMPT_SHOWN_KEY = 'talktype-pwa-prompt-shown';
const PWA_PROMPT_COUNT_KEY = 'talktype-pwa-prompt-count';
const PWA_LAST_PROMPT_DATE_KEY = 'talktype-pwa-last-prompt-date';
const PWA_INSTALLED_KEY = 'talktype-pwa-installed';

// PWA stores
export const deferredInstallPrompt = writable(null);
export const transcriptionCount = writable(0);
export const showPwaInstallPrompt = writable(false);
export const isPwaInstalled = writable(false);

// Derived store to determine if prompt should be shown
export const shouldShowPrompt = derived(
  [transcriptionCount, isPwaInstalled],
  ([$count, $isInstalled]) => {
    if (!browser || $isInstalled) return false;
    return $count >= PWA_INSTALL_PROMPT_THRESHOLD;
  }
);

export class PwaService {
  constructor() {
    this.debug = false;
    
    if (browser) {
      this.initializeFromStorage();
      this.setupEventListeners();
      this.checkIfRunningAsPwa();
    }
  }

  setDebug(value) {
    this.debug = !!value;
  }

  log(message) {
    if (this.debug) {
      console.log(`[PwaService] ${message}`);
    }
  }

  initializeFromStorage() {
    // Load transcription count
    const count = this.getTranscriptionCount();
    transcriptionCount.set(count);
    
    // Check if installed
    const isInstalled = localStorage.getItem(PWA_INSTALLED_KEY) === 'true';
    isPwaInstalled.set(isInstalled);
    
    this.log(`Initialized: count=${count}, installed=${isInstalled}`);
  }

  setupEventListeners() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Store the event for later use
      deferredInstallPrompt.set(e);
      this.log('Captured beforeinstallprompt event');
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      this.log('App installed successfully');
      this.markAsInstalled();
      deferredInstallPrompt.set(null);
      showPwaInstallPrompt.set(false);
    });
  }

  getTranscriptionCount() {
    if (!browser) return 0;
    
    try {
      const countStr = localStorage.getItem(TRANSCRIPTION_COUNT_KEY);
      const count = parseInt(countStr || '0', 10);
      return isNaN(count) ? 0 : count;
    } catch (error) {
      console.error('Error reading transcription count:', error);
      return 0;
    }
  }

  incrementTranscriptionCount() {
    if (!browser) return 0;
    
    try {
      const currentCount = this.getTranscriptionCount();
      const newCount = currentCount + 1;
      
      localStorage.setItem(TRANSCRIPTION_COUNT_KEY, newCount.toString());
      transcriptionCount.set(newCount);
      
      this.log(`Transcription count incremented to ${newCount}`);
      
      // Check if we should show the prompt
      if (this.shouldShowPwaPrompt()) {
        this.log('Conditions met for showing PWA prompt');
        showPwaInstallPrompt.set(true);
      }
      
      return newCount;
    } catch (error) {
      console.error('Error incrementing transcription count:', error);
      return 0;
    }
  }

  shouldShowPwaPrompt() {
    if (!browser) return false;
    
    try {
      // Don't show if already installed
      if (localStorage.getItem(PWA_INSTALLED_KEY) === 'true') {
        return false;
      }

      // Check conditions based on transcription count and last prompt
      const transcriptionCount = this.getTranscriptionCount();
      const hasShownPrompt = localStorage.getItem(PWA_PROMPT_SHOWN_KEY) === 'true';
      const promptCount = parseInt(localStorage.getItem(PWA_PROMPT_COUNT_KEY) || '0', 10);
      const lastPromptDate = localStorage.getItem(PWA_LAST_PROMPT_DATE_KEY);

      // If we've never shown the prompt before, show it after threshold
      if (!hasShownPrompt && transcriptionCount >= PWA_INSTALL_PROMPT_THRESHOLD) {
        return true;
      }

      // If we've shown the prompt 1-2 times before
      if (hasShownPrompt && promptCount < 3) {
        const daysSinceLastPrompt = lastPromptDate
          ? Math.floor((Date.now() - new Date(lastPromptDate).getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        // Show again after at least 3 days and 5 more transcriptions
        if (daysSinceLastPrompt >= 3 && transcriptionCount >= 5) {
          return true;
        }
      }

      // If we've shown the prompt 3+ times, be more conservative
      if (promptCount >= 3) {
        const daysSinceLastPrompt = lastPromptDate
          ? Math.floor((Date.now() - new Date(lastPromptDate).getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        // Show again after at least 14 days and 10 more transcriptions
        if (daysSinceLastPrompt >= 14 && transcriptionCount >= 10) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking if PWA prompt should be shown:', error);
      return false;
    }
  }

  recordPromptShown() {
    if (!browser) return;
    
    try {
      // Mark that we've shown the prompt
      localStorage.setItem(PWA_PROMPT_SHOWN_KEY, 'true');

      // Get and increment the prompt count
      const promptCount = parseInt(localStorage.getItem(PWA_PROMPT_COUNT_KEY) || '0', 10);
      localStorage.setItem(PWA_PROMPT_COUNT_KEY, (promptCount + 1).toString());

      // Record the current date
      localStorage.setItem(PWA_LAST_PROMPT_DATE_KEY, new Date().toISOString());

      this.log(`PWA installation prompt shown (count: ${promptCount + 1})`);
    } catch (error) {
      console.error('Error recording PWA prompt shown:', error);
    }
  }

  markAsInstalled() {
    if (!browser) return;
    
    try {
      localStorage.setItem(PWA_INSTALLED_KEY, 'true');
      isPwaInstalled.set(true);
      this.log('PWA marked as installed');
    } catch (error) {
      console.error('Error marking PWA as installed:', error);
    }
  }

  checkIfRunningAsPwa() {
    if (!browser) return false;
    
    try {
      // Different ways to detect if running as PWA
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
      const isMinimalUi = window.matchMedia('(display-mode: minimal-ui)').matches;
      const isInPWA = navigator.standalone || // iOS
        isStandalone || isFullscreen || isMinimalUi;

      // If we detect it's a PWA, mark it in localStorage
      if (isInPWA) {
        this.markAsInstalled();
      }

      return isInPWA;
    } catch (error) {
      console.error('Error checking if running as PWA:', error);
      return false;
    }
  }

  dismissPrompt() {
    showPwaInstallPrompt.set(false);
  }
}

export const pwaService = new PwaService();