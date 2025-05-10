import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import { StorageUtils } from '../infrastructure/storageUtils';
import { STORAGE_KEYS } from '../../constants';

// Store to track first visit status
export const isFirstVisit = writable(false);

export class FirstVisitService {
  constructor() {
    this.debug = false;
  }

  setDebug(value) {
    this.debug = !!value;
  }

  log(message) {
    if (this.debug) {
      console.log(`[FirstVisitService] ${message}`);
    }
  }

  checkFirstVisit() {
    if (!browser) return false;

    const hasSeenIntro = StorageUtils.getItem(STORAGE_KEYS.FIRST_VISIT);
    const firstVisit = !hasSeenIntro;
    
    this.log(`Checking first visit: ${firstVisit}`);
    isFirstVisit.set(firstVisit);
    
    return firstVisit;
  }

  markIntroAsSeen() {
    if (!browser) return;
    
    StorageUtils.setItem(STORAGE_KEYS.FIRST_VISIT, 'true');
    isFirstVisit.set(false);
    this.log('Marked intro as seen in localStorage');
  }

  // Check if we should show the intro modal (first visit)
  shouldShowIntroModal() {
    if (!browser) return false;
    return this.checkFirstVisit();
  }

  // This function is now called by the IntroModal component when it's ready
  showIntroModal(modalId = 'intro_modal') {
    if (!browser || !this.checkFirstVisit()) return null;

    this.log('IntroModal is displaying');

    return new Promise((resolve) => {
      const modal = document.getElementById(modalId);
      if (modal) {
        // Set up event listener to handle modal close
        const handleClose = () => {
          this.log('Intro modal closed, marking intro as seen');
          this.markIntroAsSeen();
          modal.removeEventListener('close', handleClose);
          resolve(true);
        };

        modal.addEventListener('close', handleClose, { once: true });
        resolve(modal);
      } else {
        console.error('Intro modal element not found');
        this.log('Intro modal element not found');
        resolve(null);
      }
    });
  }
}

export const firstVisitService = new FirstVisitService();