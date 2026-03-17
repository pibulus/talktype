/**
 * @module hapticService
 * @description Provides haptic vibration feedback for recording actions on supported mobile devices.
 */

import { VIBRATION } from '$lib/constants';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('Haptics');

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
			log.log(`Vibration failed: ${e.message}`);
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
