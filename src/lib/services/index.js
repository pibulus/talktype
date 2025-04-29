// Import services for local usage in initialization function
import { eventBus as eventBusInstance } from './infrastructure/eventBus';
import { hapticService as hapticServiceInstance } from './infrastructure/hapticService';
import { audioService as audioServiceInstance } from './audio/audioService';
import { transcriptionService as transcriptionServiceInstance } from './transcription/transcriptionService';

// Re-export services for external usage
export { eventBus } from './infrastructure/eventBus';
export { hapticService } from './infrastructure/hapticService';

// Audio services
export { AudioStates } from './audio/audioStates';
export { audioService, AudioEvents } from './audio/audioService';

// Transcription services
export { transcriptionService, TranscriptionEvents } from './transcription/transcriptionService';

// Convenience function to initialize all services
export function initializeServices(options = {}) {
  const { debug = false, haptic = true } = options;
  
  // Enable debugging if requested
  if (debug) {
    eventBusInstance.setDebug(true);
  }
  
  // Configure haptic feedback
  if (!haptic) {
    hapticServiceInstance.disable();
  }
  
  console.log('🚀 TalkType services initialized');
  
  return {
    eventBus: eventBusInstance,
    audioService: audioServiceInstance,
    transcriptionService: transcriptionServiceInstance,
    hapticService: hapticServiceInstance
  };
}