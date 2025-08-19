/**
 * Consolidated Ghost Service
 * Combines animation, blinking, and state management in one place
 */

// Animation configuration
const ANIMATION_CONFIG = {
	IDLE: {
		blinkInterval: { min: 7000, max: 16000 },
		blinkProbability: { single: 0.6, double: 0.3, triple: 0.1 }
	},
	RECORDING: {
		animation: 'blink-thinking 4s infinite'
	},
	PROCESSING: {
		animation: 'blink-thinking-hard 1.5s infinite'
	}
};

class GhostService {
	constructor() {
		this.state = 'IDLE';
		this.blinkTimeouts = [];
		this.eyesElement = null;
		this.isInitialized = false;
		this.debug = false;
	}

	// Initialize the ghost with DOM elements
	init(eyesElement, options = {}) {
		this.eyesElement = eyesElement;
		this.debug = options.debug || false;
		this.isInitialized = true;

		// Start ambient blinking after a short delay
		setTimeout(() => {
			this.startAmbientBlinking();
		}, 800);
	}

	// State management
	setState(newState) {
		if (this.state === newState) return;

		const oldState = this.state;
		this.state = newState;

		if (this.eyesElement) {
			this.eyesElement.style.animation = 'none';
			this.eyesElement.classList.remove('blink-once', 'recording', 'processing');
		}

		// Apply new state animations
		switch (newState) {
			case 'IDLE':
				this.startAmbientBlinking();
				break;
			case 'RECORDING':
				this.eyesElement?.classList.add('recording');
				break;
			case 'PROCESSING':
				this.eyesElement?.classList.add('processing');
				break;
		}
	}

	// Blinking animations
	performSingleBlink() {
		if (!this.eyesElement) return;

		this.eyesElement.classList.add('blink-once');
		setTimeout(() => {
			this.eyesElement.classList.remove('blink-once');
		}, 400);
	}

	performDoubleBlink() {
		if (!this.eyesElement) return;

		this.eyesElement.classList.add('blink-once');
		setTimeout(() => {
			this.eyesElement.classList.remove('blink-once');
			setTimeout(() => {
				this.eyesElement.classList.add('blink-once');
				setTimeout(() => {
					this.eyesElement.classList.remove('blink-once');
				}, 300);
			}, 180);
		}, 300);
	}

	performTripleBlink() {
		if (!this.eyesElement) return;

		let blinkCount = 0;
		const blink = () => {
			this.eyesElement.classList.add('blink-once');
			setTimeout(() => {
				this.eyesElement.classList.remove('blink-once');
				blinkCount++;
				if (blinkCount < 3) {
					setTimeout(blink, 150);
				}
			}, 250);
		};
		blink();
	}

	// Ambient blinking system
	startAmbientBlinking() {
		if (this.state !== 'IDLE') return;

		const config = ANIMATION_CONFIG.IDLE;

		const scheduleNextBlink = () => {
			if (this.state !== 'IDLE') return;

			const interval = Math.floor(
				config.blinkInterval.min +
					Math.random() * (config.blinkInterval.max - config.blinkInterval.min)
			);

			const timeout = setTimeout(() => {
				if (this.state !== 'IDLE') return;

				// Choose blink type
				const rand = Math.random();
				if (rand < config.blinkProbability.single) {
					this.performSingleBlink();
				} else if (rand < config.blinkProbability.single + config.blinkProbability.double) {
					this.performDoubleBlink();
				} else {
					this.performTripleBlink();
				}

				scheduleNextBlink();
			}, interval);

			this.blinkTimeouts.push(timeout);
		};

		scheduleNextBlink();
	}

	// Clear all scheduled blinks
	clearAllBlinks() {
		this.blinkTimeouts.forEach((timeout) => clearTimeout(timeout));
		this.blinkTimeouts = [];
	}

	// Start recording
	startRecording() {
		// Random start behavior for personality
		const startBehavior = Math.random();
		if (startBehavior < 0.7) {
			this.performSingleBlink();
		} else if (startBehavior < 0.9) {
			this.performDoubleBlink();
		} else {
			this.performTripleBlink();
		}

		setTimeout(() => {
			this.setState('RECORDING');
		}, 600);
	}

	// Stop recording
	stopRecording() {
		this.setState('IDLE');
		this.performSingleBlink();
	}

	// Start processing
	startProcessing() {
		this.setState('PROCESSING');
	}

	// Stop processing
	stopProcessing() {
		this.setState('IDLE');
	}

	// Cleanup
	destroy() {
		this.clearAllBlinks();
		this.eyesElement = null;
		this.isInitialized = false;
	}
}

// Export singleton instance
export default new GhostService();
