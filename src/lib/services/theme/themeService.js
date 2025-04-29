import { browser } from '$app/environment';

export class ThemeService {
  constructor() {
    this.storageKey = 'talktype-vibe';
    this.defaultTheme = 'peach';
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
    
    const savedTheme = localStorage.getItem(this.storageKey);
    if (!savedTheme) {
      localStorage.setItem(this.storageKey, this.defaultTheme);
      document.documentElement.setAttribute('data-theme', this.defaultTheme);
    } else {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }
}

export const themeService = new ThemeService();