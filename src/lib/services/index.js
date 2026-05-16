import { browser } from '$app/environment';
import { eventBus as eventBusInstance } from './infrastructure/index';
import { hapticService as hapticServiceInstance } from './infrastructure/index';
import { audioService as audioServiceInstance } from './audio/audioService';
import { transcriptionService as transcriptionServiceInstance } from './transcription/transcriptionService';
import { modalService as modalServiceInstance } from './modals/modalService';
import { firstVisitService as firstVisitServiceInstance } from './first-visit/firstVisitService';
import { pwaService as pwaServiceInstance } from './pwa/pwaService';
import { resetStores } from './infrastructure/stores';
export { eventBus, hapticService, StorageUtils } from './infrastructure/index';
export { modalService } from './modals/modalService';
export { firstVisitService, isFirstVisit } from './first-visit/firstVisitService';
export {
	pwaService,
	deferredInstallPrompt,
	transcriptionCount,
	showPwaInstallPrompt,
	isPwaInstalled,
	shouldShowPrompt
} from './pwa/pwaService';

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
	setSupporterStatus,
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

let servicesInitialized = false;
let pendingDraftRestoreStarted = false;

// Convenience function to initialize all services
export function initializeServices(options = {}) {
	const { debug = false, haptic = true, reset = !servicesInitialized } = options;

	if (reset) {
		resetStores();
	}

	if (browser && !pendingDraftRestoreStarted) {
		pendingDraftRestoreStarted = true;
		transcriptionServiceInstance
			.restorePendingRecordingDraft()
			.catch((error) => console.warn('Failed to restore pending recording:', error));
	}

	// Enable debugging if requested
	if (debug) {
		eventBusInstance.setDebug(true);
	}

	// Configure haptic feedback
	if (!haptic) {
		hapticServiceInstance.disable();
	}

	servicesInitialized = true;
	return getServices();
}

export function resetServiceInitializationForTesting() {
	servicesInitialized = false;
	pendingDraftRestoreStarted = false;
	resetStores();
}

function getServices() {
	return {
		eventBus: eventBusInstance,
		audioService: audioServiceInstance,
		transcriptionService: transcriptionServiceInstance,
		hapticService: hapticServiceInstance,
		modalService: modalServiceInstance,
		firstVisitService: firstVisitServiceInstance,
		pwaService: pwaServiceInstance
	};
}
