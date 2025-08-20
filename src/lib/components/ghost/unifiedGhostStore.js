import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import {
	ANIMATION_STATES,
	ANIMATION_TRANSITIONS,
	CSS_CLASSES,
	WOBBLE_CONFIG,
	BLINK_CONFIG,
	ANIMATION_TIMING
} from './animationConfig.js';

// ===================================================================
// UNIFIED GHOST STORE - Combines state, animations, and themes
// ===================================================================

function createUnifiedGhostStore() {
	const state = writable({
		// Animation state
		current: ANIMATION_STATES.INITIAL,
		previous: null,
		isRecording: false,
		isProcessing: false,

		// Eye state
		eyesClosed: false,
		eyePosition: { x: 0, y: 0 },
		isEyeTrackingEnabled: true,

		// Theme
		theme: 'peach',

		// Meta
		isFirstVisit: false,
		debug: false,
		stateTimeouts: {},
		inactivityTimerId: null
	});

	// Animation helpers
	const animations = {
		blink() {
			state.update((s) => ({ ...s, eyesClosed: true }));
			setTimeout(() => {
				state.update((s) => ({ ...s, eyesClosed: false }));
			}, BLINK_CONFIG.DURATION);
		},

		wobble(direction = 'left') {
			if (!browser) return;

			const element = document.querySelector('.ghost-wobble-group');
			if (!element) return;

			element.classList.remove('wobble-left', 'wobble-right');
			void element.offsetWidth; // Force reflow
			element.classList.add(`wobble-${direction}`);

			setTimeout(() => {
				element.classList.remove(`wobble-${direction}`);
			}, WOBBLE_CONFIG.DURATION);
		},

		pulse() {
			if (!browser) return;

			const element = document.getElementById('ghost-shape');
			if (!element) return;

			element.classList.add('ghost-pulse');
			setTimeout(() => {
				element.classList.remove('ghost-pulse');
			}, 600);
		},

		transition(toState) {
			const currentState = get(state);

			// Validate transition
			if (!ANIMATION_TRANSITIONS[currentState.current]?.includes(toState)) {
				if (currentState.debug) {
					console.warn(`[Ghost] Invalid transition: ${currentState.current} -> ${toState}`);
				}
				return false;
			}

			state.update((s) => ({
				...s,
				previous: s.current,
				current: toState
			}));

			return true;
		}
	};

	// Theme management
	const themes = {
		set(themeName) {
			state.update((s) => ({ ...s, theme: themeName }));

			if (browser) {
				// Update CSS variables
				document.documentElement.setAttribute('data-ghost-theme', themeName);
			}
		},

		get() {
			return get(state).theme;
		}
	};

	// Recording state handlers
	const recording = {
		start() {
			state.update((s) => ({ ...s, isRecording: true }));
			animations.transition(ANIMATION_STATES.RECORDING);
			animations.wobble('right');
		},

		stop() {
			state.update((s) => ({ ...s, isRecording: false }));
			animations.transition(ANIMATION_STATES.IDLE);
		}
	};

	// Processing state handlers
	const processing = {
		start() {
			state.update((s) => ({ ...s, isProcessing: true }));
			animations.transition(ANIMATION_STATES.PROCESSING);
		},

		stop() {
			state.update((s) => ({ ...s, isProcessing: false }));
			animations.transition(ANIMATION_STATES.IDLE);
		}
	};

	// Eye tracking
	const eyes = {
		track(x, y) {
			state.update((s) => ({ ...s, eyePosition: { x, y } }));
		},

		blink() {
			animations.blink();
		},

		close() {
			state.update((s) => ({ ...s, eyesClosed: true }));
		},

		open() {
			state.update((s) => ({ ...s, eyesClosed: false }));
		}
	};

	// Cleanup function
	function cleanup() {
		const currentState = get(state);

		// Clear all timeouts
		Object.values(currentState.stateTimeouts).forEach((timeout) => {
			if (timeout) clearTimeout(timeout);
		});

		if (currentState.inactivityTimerId) {
			clearTimeout(currentState.inactivityTimerId);
		}

		// Reset to initial state
		state.set({
			current: ANIMATION_STATES.INITIAL,
			previous: null,
			isRecording: false,
			isProcessing: false,
			eyesClosed: false,
			eyePosition: { x: 0, y: 0 },
			isEyeTrackingEnabled: true,
			theme: 'peach',
			isFirstVisit: false,
			debug: false,
			stateTimeouts: {},
			inactivityTimerId: null
		});
	}

	// Derived stores for easier access
	const isRecording = derived(state, ($state) => $state.isRecording);
	const isProcessing = derived(state, ($state) => $state.isProcessing);
	const currentTheme = derived(state, ($state) => $state.theme);
	const animationState = derived(state, ($state) => $state.current);

	return {
		// Main store
		subscribe: state.subscribe,

		// Derived stores
		isRecording,
		isProcessing,
		currentTheme,
		animationState,

		// Actions
		animations,
		themes,
		recording,
		processing,
		eyes,

		// Utility
		cleanup,
		setDebug: (enabled) => state.update((s) => ({ ...s, debug: enabled }))
	};
}

export const ghostStore = createUnifiedGhostStore();
