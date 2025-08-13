import { VIBRATION } from '$lib/constants';

export class HapticService {
	constructor() {
		this.isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
		this.isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;
		this.enabled = true;
	}

	vibrate(pattern) {
		if (!this.enabled || !this.isSupported || !this.isMobile) {
			return false;
		}

		try {
			navigator.vibrate(pattern);
			return true;
		} catch (e) {
			console.log(`Vibration failed: ${e.message}`);
			return false;
		}
	}

	startRecording() {
		return this.vibrate(VIBRATION.START_RECORDING);
	}

	stopRecording() {
		return this.vibrate(VIBRATION.STOP_RECORDING);
	}

	copySuccess() {
		return this.vibrate(VIBRATION.COPY_SUCCESS);
	}

	error() {
		return this.vibrate(VIBRATION.ERROR);
	}

	permissionError() {
		return this.vibrate(VIBRATION.PERMISSION_ERROR);
	}

	enable() {
		this.enabled = true;
	}

	disable() {
		this.enabled = false;
	}

	isEnabled() {
		return this.enabled;
	}
}

export const hapticService = new HapticService();
