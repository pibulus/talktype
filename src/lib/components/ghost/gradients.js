// ===================================================================
// GHOST GRADIENT DEFINITIONS - Centralized gradient configuration
// ===================================================================

/**
 * SVG gradient definitions for each theme
 * These are used to populate the <defs> section of the Ghost SVG
 */
export const GRADIENT_DEFS = {
	peach: {
		id: 'peachGradient',
		type: 'linear',
		x1: '0%',
		y1: '0%',
		x2: '100%',
		y2: '100%',
		stops: [
			{ offset: '0%', color: 'var(--ghost-peach-start, #ff60e0)' },
			{ offset: '35%', color: 'var(--ghost-peach-mid1, #ff82ca)' },
			{ offset: '65%', color: 'var(--ghost-peach-mid2, #ff9a85)' },
			{ offset: '85%', color: 'var(--ghost-peach-mid3, #ffb060)' },
			{ offset: '100%', color: 'var(--ghost-peach-end, #ffcf40)' }
		]
	},
	mint: {
		id: 'mintGradient',
		type: 'linear',
		x1: '0%',
		y1: '0%',
		x2: '100%',
		y2: '100%',
		stops: [
			{ offset: '0%', color: 'var(--ghost-mint-start, #0ac5ef)' },
			{ offset: '35%', color: 'var(--ghost-mint-mid1, #22d3ed)' },
			{ offset: '65%', color: 'var(--ghost-mint-mid2, #2dd4bf)' },
			{ offset: '85%', color: 'var(--ghost-mint-mid3, #4ade80)' },
			{ offset: '100%', color: 'var(--ghost-mint-end, #a3e635)' }
		]
	},
	bubblegum: {
		id: 'bubblegumGradient',
		type: 'linear',
		x1: '0%',
		y1: '0%',
		x2: '100%',
		y2: '100%',
		stops: [
			{ offset: '0%', color: 'var(--ghost-bubblegum-start, #c026d3)' },
			{ offset: '35%', color: 'var(--ghost-bubblegum-mid1, #a855f7)' },
			{ offset: '65%', color: 'var(--ghost-bubblegum-mid2, #8b5cf6)' },
			{ offset: '85%', color: 'var(--ghost-bubblegum-mid3, #6366f1)' },
			{ offset: '100%', color: 'var(--ghost-bubblegum-end, #3b82f6)' }
		]
	},
	rainbow: {
		id: 'rainbowGradient',
		type: 'linear',
		x1: '0%',
		y1: '0%',
		x2: '100%',
		y2: '100%',
		stops: [
			{ offset: '0%', color: 'var(--ghost-rainbow-start, #ff0080)' },
			{ offset: '25%', color: 'var(--ghost-rainbow-mid1, #ff8c00)' },
			{ offset: '50%', color: 'var(--ghost-rainbow-mid2, #ffed00)' },
			{ offset: '75%', color: 'var(--ghost-rainbow-mid3, #00ff80)' },
			{ offset: '100%', color: 'var(--ghost-rainbow-end, #00bfff)' }
		]
	}
};

/**
 * Helper to get gradient ID for a theme
 * @param {string} theme - Theme name
 * @returns {string} - Gradient ID
 */
export function getGradientId(theme) {
	return GRADIENT_DEFS[theme]?.id || 'peachGradient';
}

/**
 * Helper to get all gradient IDs
 * @returns {string[]} - Array of gradient IDs
 */
export function getAllGradientIds() {
	return Object.values(GRADIENT_DEFS).map((def) => def.id);
}
