/**
 * Gradient Animation Configuration
 *
 * Behavior-only configuration for ghost gradient animations.
 * This file contains animation parameters, NOT color definitions.
 * All color values are defined in ghost-themes.css.
 */

/**
 * Core animation timing parameters
 * Controls the global timing aspects of animations
 */
export const animationTiming = {
	// Controls opacity pulsing effect
	shimmer: {
		duration: 5, // Animation cycle in seconds
		ease: 'ease-in-out', // Easing function
		opacityRange: [0.88, 1.0] // Min/max opacity values
	},

	// Controls gradient point movement
	gradientShift: {
		duration: 12, // Animation cycle in seconds
		ease: 'ease-in-out', // Easing function
		magnitude: 16 // Movement amount in percentage
	},

	// Controls color stop pulse animations
	colorPulse: {
		duration: 5, // Pulse cycle in seconds
		ease: 'ease-in-out', // Easing function
		staggerDelay: 0.5, // Delay between stop animations (seconds)
		opacityRanges: {
			start: [0.9, 1.0], // First color stop opacity range
			mid: [0.8, 0.9], // Middle color stops opacity range
			end: [0.85, 0.95] // Last color stop opacity range
		}
	}
};

/**
 * Shape animations per theme
 * Controls how the ghost shape element animates
 */
export const shapeAnimations = {
	// Peach theme animation behavior
	peach: {
		flowDuration: 9, // Animation cycle in seconds
		flowEase: 'cubic-bezier(0.4, 0, 0.6, 1)', // Custom easing
		scale: {
			min: 1.0, // Base scale
			mid: 1.5, // Maximum scale
			steps: 1.1 // Intermediate scale
		},
		filter: {
			hueRotate: { min: -70, max: 90 }, // Color shift range (degrees)
			saturate: { min: 1.15, max: 1.4 }, // Saturation range
			brightness: { min: 0.2, max: 1.9 } // Brightness range
		},
		transform: {
			y: { min: 0, max: -2 } // Vertical movement (pixels)
		}
	},

	// Mint theme animation behavior
	mint: {
		flowDuration: 10,
		flowEase: 'cubic-bezier(0.4, 0, 0.6, 1)',
		scale: {
			min: 1.0,
			mid: 1.015,
			steps: 1.008
		},
		filter: {
			hueRotate: { min: -2, max: 5 },
			saturate: { min: 1.2, max: 1.5 },
			brightness: { min: 1.05, max: 1.15 }
		},
		transform: {
			y: { min: 0, max: -2 }
		}
	},

	// Bubblegum theme animation behavior
	bubblegum: {
		flowDuration: 12,
		flowEase: 'cubic-bezier(0.4, 0, 0.6, 1)',
		scale: {
			min: 1.0,
			mid: 1.012,
			steps: 1.006
		},
		filter: {
			hueRotate: { min: -8, max: 8 },
			saturate: { min: 1.3, max: 1.7 },
			brightness: { min: 1.05, max: 1.15 }
		},
		transform: {
			y: { min: 0, max: -2 }
		}
	},

	// Rainbow theme animation behavior
	rainbow: {
		flowDuration: 9,
		flowEase: 'cubic-bezier(0.4, 0, 0.6, 1)',
		scale: {
			min: 1.0,
			mid: 1.012,
			steps: 1.006
		},
		rotation: {
			min: 0, // Slight rotation (degrees)
			max: 0.6
		},
		filter: {
			hueRotate: {
				isFullCycle: true, // Full 360° color rotation
				min: 0,
				max: 360
			},
			saturate: { min: 1.4, max: 1.7 },
			brightness: { min: 1.15, max: 1.22 }
		},
		shadow: {
			enabled: true, // Rainbow has extra glow
			radius: { min: 8, max: 20 }, // Shadow size (pixels)
			opacity: { min: 0.35, max: 0.5 } // Shadow intensity
		}
	}
};

/**
 * Gradient animation settings - behavior only, no colors
 * Controls the SVG gradient animation parameters
 */
export const gradientAnimations = {
	// Peach theme animation behavior
	peach: {
		position: {
			speed: 0.7, // Animation speed (rad/frame)
			amplitude: 4 // Movement amount (percentage)
		},
		// Color positions (colors themselves are in CSS)
		stopPositions: ['start', 'mid1', 'mid2', 'mid3', 'end']
	},

	// Mint theme animation behavior
	mint: {
		position: {
			speed: 0.08,
			amplitude: 4
		},
		stopPositions: ['start', 'mid1', 'mid2', 'mid3', 'end']
	},

	// Bubblegum theme animation behavior
	bubblegum: {
		position: {
			speed: 0.06,
			amplitude: 5
		},
		stopPositions: ['start', 'mid1', 'mid2', 'mid3', 'end']
	},

	// Rainbow theme animation behavior
	rainbow: {
		position: {
			speed: 0.12,
			amplitude: 6
		},
		stopPositions: ['start', 'mid1', 'mid2', 'mid3', 'end']
	}
};

/**
 * Helper function to get CSS variable value
 * @param {string} name - CSS variable name without -- prefix
 * @param {string} fallback - Optional fallback value
 * @returns {string} CSS variable value or fallback
 */
function getCssVariable(name, fallback = '') {
	if (typeof document === 'undefined') return fallback;
	return (
		getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim() || fallback
	);
}

/**
 * Get theme color from CSS variables
 * @param {string} theme - Theme name (peach, mint, bubblegum, rainbow)
 * @param {string} position - Color position (start, mid1, mid2, mid3, end)
 * @param {boolean} bright - Whether to use bright variant
 * @returns {string} Color value from CSS
 */
export function getThemeColor(theme, position, bright = false) {
	const suffix = bright ? '-bright' : '';
	return getCssVariable(`ghost-${theme}-${position}${suffix}`, '#ffffff');
}

/**
 * Get theme animation parameter
 * @param {string} theme - Theme name
 * @param {string} param - Parameter name
 * @param {*} fallback - Fallback value
 * @returns {string} Parameter value from CSS
 */
export function getThemeParameter(theme, param, fallback) {
	return getCssVariable(`ghost-${theme}-${param}`, fallback);
}

// Export the module for debugging/console access
export default {
	animationTiming,
	shapeAnimations,
	gradientAnimations,
	getThemeColor,
	getThemeParameter
};
