// Import services for local usage in initialization function
import { eventBus as eventBusInstance } from './infrastructure/eventBus';
import { hapticService as hapticServiceInstance } from './infrastructure/hapticService';
import { audioService as audioServiceInstance } from './audio/audioService';
import { transcriptionService as transcriptionServiceInstance } from './transcription/transcriptionService';
import { themeService as themeServiceInstance } from './theme/themeService';
import { modalService as modalServiceInstance } from './modals/modalService';
import { resetStores } from './infrastructure/stores';

// Re-export services for external usage
export { eventBus } from './infrastructure/eventBus';
export { hapticService } from './infrastructure/hapticService';
export { themeService } from './theme/themeService';
export { modalService } from './modals/modalService';

// Audio services
export { AudioStates } from './audio/audioStates';
export { audioService, AudioEvents } from './audio/audioService';

// Transcription services
export { transcriptionService, TranscriptionEvents } from './transcription/transcriptionService';

// Store exports
export { 
  audioState, 
  recordingState, 
  transcriptionState, 
  uiState, 
  userPreferences,
  isRecording,
  isTranscribing,
  transcriptionProgress,
  transcriptionText,
  errorMessage,
  waveformData,
  hasPermissionError,
  recordingDuration,
  audioActions,
  transcriptionActions,
  uiActions
} from './infrastructure/stores';

// Convenience function to initialize all services
export function initializeServices(options = {}) {
  const { debug = false, haptic = true } = options;
  
  // Reset stores to initial state
  resetStores();
  
  // Enable debugging if requested
  if (debug) {
    eventBusInstance.setDebug(true);
  }
  
  // Configure haptic feedback
  if (!haptic) {
    hapticServiceInstance.disable();
  }
  
  console.log('🚀 TalkType services initialized with Svelte stores');
  
  return {
    eventBus: eventBusInstance,
    audioService: audioServiceInstance,
    transcriptionService: transcriptionServiceInstance,
    hapticService: hapticServiceInstance,
    themeService: themeServiceInstance,
    modalService: modalServiceInstance
  };
}