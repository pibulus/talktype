/**
 * TalkType Constants
 * 
 * Central configuration for app-wide constants to maintain DRY principles
 * and make future adjustments easier.
 */

// Theme/Vibe Configuration
export const THEMES = {
  PEACH: 'peach',
  MINT: 'mint',
  BUBBLEGUM: 'bubblegum',
  RAINBOW: 'rainbow'
};

export const DEFAULT_THEME = THEMES.PEACH;

// Local Storage Keys
export const STORAGE_KEYS = {
  THEME: 'talktype-vibe',
  FIRST_VISIT: 'hasSeenTalkTypeIntro',
  AUTO_RECORD: 'talktype-autoRecord',
  PROMPT_STYLE: 'talktype-prompt-style'
};

// Prompt Styles
export const PROMPT_STYLES = {
  STANDARD: 'standard',
  SURLY_PIRATE: 'surlyPirate',
  LEET_SPEAK: 'leetSpeak',
  SPARKLE_POP: 'sparklePop',
  CODE_WHISPERER: 'codeWhisperer',
  QUILL_AND_INK: 'quillAndInk'
};

export const DEFAULT_PROMPT_STYLE = PROMPT_STYLES.STANDARD;

// App Configuration
export const APP_CONFIG = {
  NAME: 'TalkType',
  VERSION: '0.1.1',
  DESCRIPTION: 'Fast, accurate, and free voice-to-text transcription',
  AUTHORS: 'Dennis & Pablo'
};

// Animation Timing (in ms)
export const ANIMATION = {
  // Ghost blinking
  BLINK: {
    MIN_GAP: 4000,         // Minimum time between ambient blinks
    MAX_GAP: 9000,         // Maximum time between ambient blinks
    SINGLE_DURATION: 300,  // Duration of a single blink
    DOUBLE_PAUSE: 200,     // Pause between blinks in a double-blink
    TRIPLE_PAUSE: 150      // Pause between blinks in a triple-blink
  },
  
  // Button animations
  BUTTON: {
    PRESS_DURATION: 400,   // Duration of button press animation
    HOVER_TRANSITION: 300  // Transition time for button hover effects
  },
  
  // Ghost wobble/reactions
  GHOST: {
    WOBBLE_DURATION: 600,  // Duration of ghost wobble animation
    PULSE_DURATION: 500    // Duration of ghost pulse animation
  },
  
  // Toast notifications
  TOAST: {
    DISPLAY_DURATION: 3000,  // How long toasts stay visible
    ERROR_DURATION: 5000     // How long error toasts stay visible
  },
  
  // Modal timing
  MODAL: {
    CLOSE_DELAY: 50,          // Delay before running closeModal function
    PERMISSION_ERROR_DURATION: 8000  // How long the permission error shows
  }
};

// CTA Button Phrases
export const CTA_PHRASES = [
  "Start Recording",      // Always first
  "Click & Speak",
  "Talk Now",
  "Transcribe Me Baby",
  "Start Yer Yappin'",
  "Say the Thing",
  "Feed Words Now", 
  "Just Say It",
  "Speak Up Friend",
  "Talk to Me",
  "Ready When You Are"
];

// Clipboard Success Messages
export const COPY_MESSAGES = [
  'Copied to clipboard! ✨',
  'Boom! In your clipboard! 🎉',
  'Text saved to clipboard! 👍',
  'Snagged that for you! 🙌',
  'All yours now! 💫',
  'Copied and ready to paste! 📋',
  'Captured in clipboard! ✅',
  'Text copied successfully! 🌟',
  'Got it! Ready to paste! 🚀',
  'Your text is saved! 💖',
  'Copied with magic! ✨',
  'Text safely copied! 🔮',
  'Copied and good to go! 🎯',
  'Saved to clipboard! 🎊'
];

// Offline Haikus
export const OFFLINE_HAIKUS = [
  `Connection is lost
Words float in digital void
Try again, speak soon`,

  `Microphone silent
No network to hear your words
Waiting for signals`,

  `Ghostly transcription
Cannot find your voice today
Internet missing`,

  `Voice lost in the waves
Digital silence prevails
Connect and try again`,

  `Whispers unheard now
The ghost waits patiently
Until we're online`
];

// Random haiku picker
export function getRandomHaiku() {
  return OFFLINE_HAIKUS[Math.floor(Math.random() * OFFLINE_HAIKUS.length)];
}

// Vibration Patterns
export const VIBRATION = {
  START_RECORDING: [40, 60, 40],
  STOP_RECORDING: 50,
  COPY_SUCCESS: 25,
  ERROR: [20, 150, 20],
  PERMISSION_ERROR: [20, 100, 20, 100, 20]
};