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
			{ offset: '0%', color: 'var(--ghost-peach-start)' },
			{ offset: '35%', color: 'var(--ghost-peach-mid1)' },
			{ offset: '65%', color: 'var(--ghost-peach-mid2)' },
			{ offset: '85%', color: 'var(--ghost-peach-mid3)' },
			{ offset: '100%', color: 'var(--ghost-peach-end)' }
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
			{ offset: '0%', color: 'var(--ghost-mint-start)' },
			{ offset: '35%', color: 'var(--ghost-mint-mid1)' },
			{ offset: '65%', color: 'var(--ghost-mint-mid2)' },
			{ offset: '85%', color: 'var(--ghost-mint-mid3)' },
			{ offset: '100%', color: 'var(--ghost-mint-end)' }
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
			{ offset: '0%', color: 'var(--ghost-bubblegum-start)' },
			{ offset: '35%', color: 'var(--ghost-bubblegum-mid1)' },
			{ offset: '65%', color: 'var(--ghost-bubblegum-mid2)' },
			{ offset: '85%', color: 'var(--ghost-bubblegum-mid3)' },
			{ offset: '100%', color: 'var(--ghost-bubblegum-end)' }
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
			{ offset: '0%', color: 'var(--ghost-rainbow-start)' },
			{ offset: '25%', color: 'var(--ghost-rainbow-mid1)' },
			{ offset: '50%', color: 'var(--ghost-rainbow-mid2)' },
			{ offset: '75%', color: 'var(--ghost-rainbow-mid3)' },
			{ offset: '100%', color: 'var(--ghost-rainbow-end)' }
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
	return Object.values(GRADIENT_DEFS).map(def => def.id);
}