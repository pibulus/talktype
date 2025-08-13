export const AudioStates = {
	IDLE: 'idle',
	INITIALIZING: 'initializing',
	REQUESTING_PERMISSIONS: 'requesting_permissions',
	PERMISSION_DENIED: 'permission_denied',
	READY: 'ready',
	RECORDING: 'recording',
	STOPPING: 'stopping',
	CLEANING: 'cleaning',
	PAUSED: 'paused',
	ERROR: 'error'
};

export class AudioStateManager {
	constructor() {
		this.state = AudioStates.IDLE;
		this.listeners = [];
		this.error = null;
	}

	getState() {
		return this.state;
	}

	setState(newState, options = {}) {
		const oldState = this.state;

		// Special case for STOPPING state to force state transition
		if (newState === AudioStates.STOPPING) {
			// Force state change even if already stopping
			this.state = newState;
			this.error = options.error || null;
			this.notifyListeners(oldState, newState, this.error);
			return;
		}

		if (oldState === newState) {
			return;
		}

		this.state = newState;
		this.error = options.error || null;

		this.notifyListeners(oldState, newState, this.error);
	}

	addListener(callback) {
		this.listeners.push(callback);
		return () => this.removeListener(callback);
	}

	removeListener(callback) {
		const index = this.listeners.indexOf(callback);
		if (index !== -1) {
			this.listeners.splice(index, 1);
		}
	}

	notifyListeners(oldState, newState, error) {
		this.listeners.forEach((listener) => {
			try {
				listener({
					oldState,
					newState,
					error
				});
			} catch (err) {
				console.error('[AudioStateManager] Error in state change listener:', err);
			}
		});
	}

	// Helper method to check if recording
	isRecording() {
		return this.state === AudioStates.RECORDING;
	}
}
