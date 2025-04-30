import { browser } from '$app/environment';

export class ThemeService {
  constructor() {
    this.storageKey = 'talktype-vibe';
    this.defaultTheme = 'peach';
    this.initialized = false;
  }

  getCurrentTheme() {
    if (!browser) return this.defaultTheme;
    return localStorage.getItem(this.storageKey) || this.defaultTheme;
  }

  applyTheme(themeId) {
    if (!browser) return;
    
    localStorage.setItem(this.storageKey, themeId);
    document.documentElement.setAttribute('data-theme', themeId);
  }

  initializeTheme() {
    if (!browser) return;
    
    // Check if theme was already initialized by the inline script
    if (typeof window !== 'undefined' && window.themeInitialized) {
      this.initialized = true;
      return;
    }
    
    // Only initialize if not already done
    if (this.initialized) return;
    
    const savedTheme = localStorage.getItem(this.storageKey);
    const currentTheme = document.documentElement.getAttribute('data-theme');
    
    if (!savedTheme) {
      localStorage.setItem(this.storageKey, this.defaultTheme);
      if (currentTheme !== this.defaultTheme) {
        document.documentElement.setAttribute('data-theme', this.defaultTheme);
      }
    } else if (currentTheme !== savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
    
    // Force browser reflow to ensure theme is applied immediately
    if (typeof document !== 'undefined') {
      void document.documentElement.offsetWidth;
    }
    
    this.initialized = true;
  }
}

export const themeService = new ThemeService();