/**
 * Ghost Animation Configuration
 * Centralized configuration for ghost animation parameters
 */

export const BLINK_CONFIG = {
	MIN_GAP: 4000, // Minimum time between ambient blinks (ms)
	MAX_GAP: 9000, // Maximum time between ambient blinks (ms)
	SINGLE_DURATION: 180, // Duration of a single blink (ms) - increased to account for transitions
	DOUBLE_PAUSE: 80, // Pause between blinks in a double-blink (ms) - increased for smoother effect
	TRIPLE_PAUSE: 180, // Pause between blinks in a triple-blink (ms)
	DOUBLE_CHANCE: 0.25, // Probability (0-1) of double blink vs single
	THINKING_RATE: 180, // Time between blinks in thinking state (ms)
	THINKING_INTERVAL: 1000, // Interval for thinking blink pattern (ms)
	RESUME_DELAY: 500 // Delay before resuming blinks after state change (ms)
};

export const WOBBLE_CONFIG = {
	// Double duration for combined left-right animation
	DURATION: 780, // Duration of ghost wobble animation (ms) - Doubled for combined effect
	LEFT_CHANCE: 0.5, // Probability (0-1) of wobbling left vs right - No longer used for start/stop
	CLEANUP_DELAY: 780 // Delay for wobble animation cleanup (ms) - Match doubled duration
};

export const SPECIAL_CONFIG = {
	CHECK_INTERVAL: 45000, // Time between special animation checks (ms)
	CHANCE: 0.05, // Probability (0-1) of special animation occurring
	DURATION: 2000 // Duration of special animation (ms)
};

export const PULSE_CONFIG = {
	DURATION: 600 // Duration of pulse animation (ms)
};

export const EYE_CONFIG = {
	CLOSED_SCALE: 0.05, // Scale factor when eyes are closed
	X_MULTIPLIER: 4, // Horizontal movement multiplier for eyes
	Y_MULTIPLIER: 2, // Vertical movement multiplier for eyes
	X_DIVISOR: 3, // Divisor for max horizontal tracking distance
	Y_DIVISOR: 3, // Divisor for max vertical tracking distance
	DEAD_ZONE: 0.05, // Dead zone for eye movement (0-1)
	SMOOTHING: 0.8, // Smoothing factor for eye movement (0-1)
	REACT_DELAY: 500, // Delay before reacting to transcript (ms)
	TEXT_THRESHOLD: 20, // Threshold for "long" transcript reactions
	BLINK_TRANSITION: '0.075s cubic-bezier(0.4, 0.0, 0.2, 1)' // Transition for smooth eye blinks
};

export const ANIMATION_TIMING = {
	INITIAL_LOAD_DURATION: 2500, // Duration for the new grow-and-wobble CSS animation (ms)
	OBSERVER_SETUP_DELAY: 50, // Delay for observer setup (ms),
	BASE_TRANSITION: '0.3s ease', // Global theme transition timing

	// Animation durations
	SHIMMER_DURATION: '5s', // Base shimmer animation duration
	GRADIENT_SHIFT_DURATION: '12s', // Gradient shift animation duration
	COLOR_PULSE_DURATION: '5s', // Color pulse animation duration
	COLOR_PULSE_STAGGER: '0.5s', // Delay between color pulse animations
	HOVER_DURATION: '1.2s', // Hover animation duration
	GENTLE_FLOAT_DURATION: '3s', // Gentle float animation duration
	RECORDING_PULSE_DURATION: '2s', // Recording pulse animation duration
	GROW_DURATION: '2s', // Grow animation duration
	FLOAT_DELAY: '2.5s', // Delay before float animation starts

	// Flow animation durations per theme
	PEACH_FLOW_DURATION: '9s',
	MINT_FLOW_DURATION: '10s',
	BUBBLEGUM_FLOW_DURATION: '12s',
	RAINBOW_FLOW_DURATION: '9s',

	// Flow animation easing
	FLOW_EASE: 'cubic-bezier(0.4, 0, 0.6, 1)',
	SHIMMER_EASE: 'ease-in-out'
};

// Global animation parameters
export const ANIMATION_EFFECTS = {
	// Global parameters
	SHIMMER_OPACITY_MIN: 0.88,
	SHIMMER_OPACITY_MAX: 1.0,
	GRADIENT_SHIFT_MAGNITUDE: '4%',

	// Color pulse opacity ranges
	COLOR_PULSE_START_OPACITY_MIN: 0.9,
	COLOR_PULSE_START_OPACITY_MAX: 1.0,
	COLOR_PULSE_MID_OPACITY_MIN: 0.8,
	COLOR_PULSE_MID_OPACITY_MAX: 0.9,
	COLOR_PULSE_END_OPACITY_MIN: 0.85,
	COLOR_PULSE_END_OPACITY_MAX: 0.95,

	// Theme-specific animation parameters
	PEACH: {
		HUE_ROTATE_MIN: '-7deg',
		HUE_ROTATE_MAX: '9deg',
		SATURATE_MIN: 1.15,
		SATURATE_MAX: 1.4,
		BRIGHTNESS_MIN: 1,
		BRIGHTNESS_MAX: 1.07,
		SCALE_MIN: 1.0,
		SCALE_MID: 1.012,
		SCALE_STEPS: 1.005,
		TRANSFORM_Y_MIN: '0px',
		TRANSFORM_Y_MAX: '-2px',
		POSITION_SPEED: 0.1,
		POSITION_AMPLITUDE: '4%'
	},

	MINT: {
		HUE_ROTATE_MIN: '-2deg',
		HUE_ROTATE_MAX: '5deg',
		SATURATE_MIN: 1.2,
		SATURATE_MAX: 1.5,
		BRIGHTNESS_MIN: 1.05,
		BRIGHTNESS_MAX: 1.15,
		SCALE_MIN: 1.0,
		SCALE_MID: 1.015,
		SCALE_STEPS: 1.008,
		TRANSFORM_Y_MIN: '0px',
		TRANSFORM_Y_MAX: '-2px',
		POSITION_SPEED: 0.08,
		POSITION_AMPLITUDE: '4%'
	},

	BUBBLEGUM: {
		HUE_ROTATE_MIN: '-8deg',
		HUE_ROTATE_MAX: '8deg',
		SATURATE_MIN: 1.3,
		SATURATE_MAX: 1.7,
		BRIGHTNESS_MIN: 1.05,
		BRIGHTNESS_MAX: 1.15,
		SCALE_MIN: 1.0,
		SCALE_MID: 1.012,
		SCALE_STEPS: 1.006,
		TRANSFORM_Y_MIN: '0px',
		TRANSFORM_Y_MAX: '-2px',
		POSITION_SPEED: 0.06,
		POSITION_AMPLITUDE: '5%'
	},

	RAINBOW: {
		HUE_ROTATE_MIN: '0deg',
		HUE_ROTATE_MAX: '360deg',
		HUE_ROTATE_FULL_CYCLE: true,
		SATURATE_MIN: 1.4,
		SATURATE_MAX: 1.7,
		BRIGHTNESS_MIN: 1.15,
		BRIGHTNESS_MAX: 1.22,
		SCALE_MIN: 1.0,
		SCALE_MID: 1.012,
		SCALE_STEPS: 1.006,
		ROTATION_MIN: '0deg',
		ROTATION_MAX: '0.6deg',
		SHADOW_RADIUS_MIN: '8px',
		SHADOW_RADIUS_MAX: '20px',
		SHADOW_OPACITY_MIN: 0.35,
		SHADOW_OPACITY_MAX: 0.5,
		POSITION_SPEED: 0.12,
		POSITION_AMPLITUDE: '6%'
	}
};

// CSS class names for consistent reference
export const CSS_CLASSES = {
	WOBBLE_LEFT: 'wobble-left', // Still used? Maybe for other triggers? Keep for now.
	WOBBLE_RIGHT: 'wobble-right', // Still used? Maybe for other triggers? Keep for now.
	WOBBLE_BOTH: 'wobble-both', // New class for combined wobble
	SPIN: 'spin',
	PULSE: 'ghost-pulse',
	INITIAL_LOAD: 'initial-load',
	RECORDING: 'recording',
	RECORDING_PEACH: 'recording-glow-peach',
	RECORDING_MINT: 'recording-glow-mint',
	RECORDING_BUBBLEGUM: 'recording-glow-bubblegum',
	RAINBOW_CYCLE: 'rainbow-color-cycle'
};

// Animation state definitions
export const ANIMATION_STATES = {
	INITIAL: 'initial',
	IDLE: 'idle',
	THINKING: 'thinking',
	RECORDING: 'recording',
	REACTING: 'reacting'
	// WOBBLING state removed
};

// Valid state transitions (WOBBLING removed)
export const ANIMATION_TRANSITIONS = {
	[ANIMATION_STATES.INITIAL]: [ANIMATION_STATES.IDLE],
	[ANIMATION_STATES.IDLE]: [ANIMATION_STATES.THINKING, ANIMATION_STATES.RECORDING, ANIMATION_STATES.REACTING],
	[ANIMATION_STATES.THINKING]: [ANIMATION_STATES.IDLE, ANIMATION_STATES.RECORDING],
	[ANIMATION_STATES.RECORDING]: [ANIMATION_STATES.THINKING, ANIMATION_STATES.IDLE],
	// WOBBLING transitions removed
	[ANIMATION_STATES.REACTING]: [ANIMATION_STATES.IDLE]
};

// Animation behaviors for each state (WOBBLING removed)
export const ANIMATION_BEHAVIORS = {
	[ANIMATION_STATES.INITIAL]: {
		blinkPattern: 'none',
		eyeTracking: false,
		cleanupDelay: ANIMATION_TIMING.INITIAL_LOAD_DURATION,
		growAnimation: true
	},
	[ANIMATION_STATES.IDLE]: {
		blinkPattern: 'random',
		blinkMinGap: BLINK_CONFIG.MIN_GAP,
		blinkMaxGap: BLINK_CONFIG.MAX_GAP,
		eyeTracking: true,
		cleanupDelay: 0
	},
	[ANIMATION_STATES.THINKING]: {
		blinkPattern: 'rhythmic',
		blinkInterval: BLINK_CONFIG.THINKING_INTERVAL,
		blinkDuration: BLINK_CONFIG.THINKING_RATE,
		eyeTracking: false,
		cleanupDelay: BLINK_CONFIG.RESUME_DELAY
	},
	[ANIMATION_STATES.RECORDING]: {
		blinkPattern: 'none',
		eyeTracking: true,
		cleanupDelay: 0
	},
	// WOBBLING behavior removed
	[ANIMATION_STATES.REACTING]: {
		blinkPattern: 'expression',
		eyeTracking: true,
		cleanupDelay: EYE_CONFIG.REACT_DELAY
	}
};

/**
 * Animation Variable Injector
 *
 * This utility connects JavaScript animation configuration with CSS by
 * dynamically generating and injecting CSS variables from animationConfig
 */

/**
 * Generates CSS variables from animation config and returns CSS string
 */
export function generateAnimationCssVariables() {
	let cssVars = '';

	// Add animation timing variables
	cssVars += '/* Animation Timing Variables */\n';
	cssVars += `--ghost-transition: ${ANIMATION_TIMING.BASE_TRANSITION};\n`;
	cssVars += `--ghost-shimmer-duration: ${ANIMATION_TIMING.SHIMMER_DURATION};\n`;
	cssVars += `--ghost-shimmer-ease: ${ANIMATION_TIMING.SHIMMER_EASE};\n`;
	cssVars += `--ghost-gradientshift-duration: ${ANIMATION_TIMING.GRADIENT_SHIFT_DURATION};\n`;
	cssVars += `--ghost-colorpulse-duration: ${ANIMATION_TIMING.COLOR_PULSE_DURATION};\n`;
	cssVars += `--ghost-colorpulse-stagger: ${ANIMATION_TIMING.COLOR_PULSE_STAGGER};\n`;
	cssVars += `--ghost-eye-blink-transition: ${EYE_CONFIG.BLINK_TRANSITION};\n`;

	// Flow animation durations
	cssVars += `--ghost-peach-flow-duration: ${ANIMATION_TIMING.PEACH_FLOW_DURATION};\n`;
	cssVars += `--ghost-mint-flow-duration: ${ANIMATION_TIMING.MINT_FLOW_DURATION};\n`;
	cssVars += `--ghost-bubblegum-flow-duration: ${ANIMATION_TIMING.BUBBLEGUM_FLOW_DURATION};\n`;
	cssVars += `--ghost-rainbow-flow-duration: ${ANIMATION_TIMING.RAINBOW_FLOW_DURATION};\n`;

	// Flow animation easing
	cssVars += `--ghost-flow-ease: ${ANIMATION_TIMING.FLOW_EASE};\n`;

	// Add global animation parameters
	cssVars += '\n/* Global Animation Parameters */\n';
	cssVars += `--ghost-shimmer-opacity-min: ${ANIMATION_EFFECTS.SHIMMER_OPACITY_MIN};\n`;
	cssVars += `--ghost-shimmer-opacity-max: ${ANIMATION_EFFECTS.SHIMMER_OPACITY_MAX};\n`;
	cssVars += `--ghost-gradient-shift-magnitude: ${ANIMATION_EFFECTS.GRADIENT_SHIFT_MAGNITUDE};\n`;

	// Color pulse opacity ranges
	cssVars += `--ghost-colorpulse-start-opacity-min: ${ANIMATION_EFFECTS.COLOR_PULSE_START_OPACITY_MIN};\n`;
	cssVars += `--ghost-colorpulse-start-opacity-max: ${ANIMATION_EFFECTS.COLOR_PULSE_START_OPACITY_MAX};\n`;
	cssVars += `--ghost-colorpulse-mid-opacity-min: ${ANIMATION_EFFECTS.COLOR_PULSE_MID_OPACITY_MIN};\n`;
	cssVars += `--ghost-colorpulse-mid-opacity-max: ${ANIMATION_EFFECTS.COLOR_PULSE_MID_OPACITY_MAX};\n`;
	cssVars += `--ghost-colorpulse-end-opacity-min: ${ANIMATION_EFFECTS.COLOR_PULSE_END_OPACITY_MIN};\n`;
	cssVars += `--ghost-colorpulse-end-opacity-max: ${ANIMATION_EFFECTS.COLOR_PULSE_END_OPACITY_MAX};\n`;

	// Theme-specific parameters - Peach
	cssVars += '\n/* Peach Theme Animation Parameters */\n';
	Object.entries(ANIMATION_EFFECTS.PEACH).forEach(([key, value]) => {
		cssVars += `--ghost-peach-${key.toLowerCase()}: ${value};\n`;
	});

	// Theme-specific parameters - Mint
	cssVars += '\n/* Mint Theme Animation Parameters */\n';
	Object.entries(ANIMATION_EFFECTS.MINT).forEach(([key, value]) => {
		cssVars += `--ghost-mint-${key.toLowerCase()}: ${value};\n`;
	});

	// Theme-specific parameters - Bubblegum
	cssVars += '\n/* Bubblegum Theme Animation Parameters */\n';
	Object.entries(ANIMATION_EFFECTS.BUBBLEGUM).forEach(([key, value]) => {
		cssVars += `--ghost-bubblegum-${key.toLowerCase()}: ${value};\n`;
	});

	// Theme-specific parameters - Rainbow
	cssVars += '\n/* Rainbow Theme Animation Parameters */\n';
	Object.entries(ANIMATION_EFFECTS.RAINBOW).forEach(([key, value]) => {
		cssVars += `--ghost-rainbow-${key.toLowerCase()}: ${value};\n`;
	});

	return cssVars;
}

/**
 * Injects animation variables into the document
 */
export function injectAnimationVariables() {
	if (typeof document === 'undefined') return;

	// Create or get a style element for our variables
	let styleElement = document.getElementById('ghost-animation-vars');
	if (!styleElement) {
		styleElement = document.createElement('style');
		styleElement.id = 'ghost-animation-vars';
		document.head.appendChild(styleElement);
	}

	// Generate and inject CSS variables
	const cssVars = generateAnimationCssVariables();
	styleElement.textContent = `:root {\n  ${cssVars.replace(/\n/g, '\n  ')}\n}`;
}

// Removed injectAnimationVariables and generateAnimationCssVariables functions
// Rely on themeStore.js and Ghost.svelte::initDynamicStyles for variable injection
