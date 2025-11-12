import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { THEMES, STORAGE_KEYS } from '$lib/constants';
import { StorageUtils } from '$lib/services/infrastructure/storageUtils';
import { gradientAnimations, shapeAnimations } from './gradientConfig';
import { WOBBLE_CONFIG, SPECIAL_CONFIG } from './animationConfig'; // Import WOBBLE_CONFIG and SPECIAL_CONFIG

export const FALLBACK_THEME = THEMES.PEACH;

// Theme configuration - color palette definitions
const themeColors = {
	peach: {
		start: '#ff60e0',
		startBright: '#ff4aed',
		mid1: '#ff82ca',
		mid1Bright: '#ff70d6',
		mid2: '#ff9a85',
		mid2Bright: '#ff8890',
		mid3: '#ffb060',
		mid3Bright: '#ffa550',
		end: '#ffcf40',
		endBright: '#ffdf30',
		glowPrimary: 'rgba(255, 80, 150, 1)',
		glowSecondary: 'rgba(255, 150, 100, 0.9)',
		glowTertiary: 'rgba(255, 240, 200, 0.8)',
		shadowColor: 'rgba(255, 180, 140, 0.3)',
		shadowColorBright: 'rgba(255, 190, 170, 0.4)',
		shadowColorBrightest: 'rgba(255, 210, 200, 0.5)'
	},
	mint: {
		start: '#0ac5ef',
		startBright: '#20d0fa',
		mid1: '#22d3ed',
		mid1Bright: '#30dff8',
		mid2: '#2dd4bf',
		mid2Bright: '#38e0cc',
		mid3: '#4ade80',
		mid3Bright: '#60ea95',
		end: '#a3e635',
		endBright: '#b5f040',
		glowPrimary: 'rgba(0, 220, 150, 1)',
		glowSecondary: 'rgba(100, 255, 210, 0.9)',
		glowTertiary: 'rgba(160, 255, 230, 0.8)',
		shadowColor: 'rgba(120, 240, 200, 0.3)',
		shadowColorBright: 'rgba(100, 230, 210, 0.4)',
		shadowColorBrightest: 'rgba(80, 220, 180, 0.5)'
	},
	bubblegum: {
		start: '#c026d3',
		startBright: '#d52ae6',
		mid1: '#a855f7',
		mid1Bright: '#b565ff',
		mid2: '#8b5cf6',
		mid2Bright: '#9a6aff',
		mid3: '#6366f1',
		mid3Bright: '#7276ff',
		end: '#3b82f6',
		endBright: '#4d90ff',
		glowPrimary: 'rgba(140, 80, 255, 1)',
		glowSecondary: 'rgba(180, 120, 255, 0.9)',
		glowTertiary: 'rgba(210, 180, 255, 0.8)',
		shadowColor: 'rgba(200, 100, 240, 0.3)',
		shadowColorBright: 'rgba(190, 110, 230, 0.35)',
		shadowColorBrighter: 'rgba(180, 120, 220, 0.4)',
		shadowColorBrightest: 'rgba(170, 130, 210, 0.45)'
	},
	rainbow: {
		start: '#ff0080',
		startBright: '#ff2090',
		mid1: '#ff8c00',
		mid1Bright: '#ff9a20',
		mid2: '#ffed00',
		mid2Bright: '#fff020',
		mid3: '#00ff80',
		mid3Bright: '#20ff95',
		end: '#00bfff',
		endBright: '#30d0ff',
		glowPrimary: 'rgba(255, 50, 150, 1)',
		glowSecondary: 'rgba(255, 90, 90, 1)',
		glowTertiary: 'rgba(255, 180, 80, 1)',
		glowQuaternary: 'rgba(255, 230, 100, 1)',
		glowQuinary: 'rgba(80, 220, 120, 1)',
		glowSenary: 'rgba(80, 160, 255, 1)',
		shadowColor: 'rgba(255, 120, 180, 0.35)',
		shadowColorBright: 'rgba(255, 180, 80, 0.4)',
		shadowColorBrighter: 'rgba(180, 255, 100, 0.45)',
		shadowColorBrightest: 'rgba(100, 200, 255, 0.5)',
		shadowColorBrightAlt: 'rgba(150, 100, 255, 0.4)'
	}
};

// Get theme from localStorage or use default
export function getInitialTheme() {
	if (!browser) return FALLBACK_THEME;

	const storedTheme = StorageUtils.getItem(STORAGE_KEYS.THEME);
	return storedTheme && Object.values(THEMES).includes(storedTheme) ? storedTheme : FALLBACK_THEME;
}

// Create the main theme store
const theme = writable(getInitialTheme());

// Save theme changes to localStorage
if (browser) {
	theme.subscribe((value) => {
		if (value) {
			StorageUtils.setItem(STORAGE_KEYS.THEME, value);
			document.documentElement.setAttribute('data-theme', value);
		}
	});
}

function getGlobalAnimationVariables() {
	return (
		`\n/* Global Animation Configuration */\n` +
		`--ghost-wobble-duration: ${WOBBLE_CONFIG.DURATION / 1000}s;\n` +
		`--ghost-special-duration: ${SPECIAL_CONFIG.DURATION / 1000}s;\n`
	);
}

export function generateThemeCssVariables(themeName = FALLBACK_THEME) {
	const safeTheme = themeColors[themeName] ? themeName : FALLBACK_THEME;
	let cssVars = '';

	const colors = themeColors[safeTheme];
	if (!colors) return cssVars;

	const animConfig = gradientAnimations[safeTheme];
	const shapeConfig = shapeAnimations[safeTheme];

	cssVars += `--ghost-${safeTheme}-start: ${colors.start};\n`;
	cssVars += `--ghost-${safeTheme}-start-bright: ${colors.startBright};\n`;
	cssVars += `--ghost-${safeTheme}-mid1: ${colors.mid1};\n`;
	cssVars += `--ghost-${safeTheme}-mid1-bright: ${colors.mid1Bright};\n`;
	cssVars += `--ghost-${safeTheme}-mid2: ${colors.mid2};\n`;
	cssVars += `--ghost-${safeTheme}-mid2-bright: ${colors.mid2Bright};\n`;
	cssVars += `--ghost-${safeTheme}-mid3: ${colors.mid3};\n`;
	cssVars += `--ghost-${safeTheme}-mid3-bright: ${colors.mid3Bright};\n`;
	cssVars += `--ghost-${safeTheme}-end: ${colors.end};\n`;
	cssVars += `--ghost-${safeTheme}-end-bright: ${colors.endBright};\n`;

	cssVars += `--ghost-${safeTheme}-glow-primary: ${colors.glowPrimary};\n`;
	cssVars += `--ghost-${safeTheme}-glow-secondary: ${colors.glowSecondary};\n`;
	cssVars += `--ghost-${safeTheme}-glow-tertiary: ${colors.glowTertiary};\n`;

	if (colors.glowQuaternary) {
		cssVars += `--ghost-${safeTheme}-glow-quaternary: ${colors.glowQuaternary};\n`;
		cssVars += `--ghost-${safeTheme}-glow-quinary: ${colors.glowQuinary};\n`;
		cssVars += `--ghost-${safeTheme}-glow-senary: ${colors.glowSenary};\n`;
	}

	cssVars += `--ghost-${safeTheme}-shadow-color: ${colors.shadowColor};\n`;
	cssVars += `--ghost-${safeTheme}-shadow-color-bright: ${colors.shadowColorBright};\n`;
	cssVars += `--ghost-${safeTheme}-shadow-color-brightest: ${colors.shadowColorBrightest};\n`;

	if (colors.shadowColorBrighter) {
		cssVars += `--ghost-${safeTheme}-shadow-color-brighter: ${colors.shadowColorBrighter};\n`;
	}

	if (colors.shadowColorBrightAlt) {
		cssVars += `--ghost-${safeTheme}-shadow-color-bright-alt: ${colors.shadowColorBrightAlt};\n`;
	}

	if (animConfig) {
		if (animConfig.position) {
			cssVars += `--ghost-${safeTheme}-position-speed: ${animConfig.position.speed};\n`;
			cssVars += `--ghost-${safeTheme}-position-amplitude: ${animConfig.position.amplitude}%;\n`;
		}

		if (animConfig.stopPositions) {
			cssVars += `--ghost-${safeTheme}-stop-positions: "${animConfig.stopPositions.join(',')}";\n`;
		}
	}

	if (shapeConfig) {
		cssVars += `--ghost-${safeTheme}-flow-duration: ${shapeConfig.flowDuration}s;\n`;
		cssVars += `--ghost-${safeTheme}-flow-ease: ${shapeConfig.flowEase};\n`;

		if (shapeConfig.filter) {
			if (shapeConfig.filter.hueRotate) {
				cssVars += `--ghost-${safeTheme}-hue-rotate-min: ${shapeConfig.filter.hueRotate.min}deg;\n`;
				cssVars += `--ghost-${safeTheme}-hue-rotate-max: ${shapeConfig.filter.hueRotate.max}deg;\n`;

				if (shapeConfig.filter.hueRotate.isFullCycle) {
					cssVars += `--ghost-${safeTheme}-hue-rotate-full-cycle: true;\n`;
				}
			}

			if (shapeConfig.filter.saturate) {
				cssVars += `--ghost-${safeTheme}-saturate-min: ${shapeConfig.filter.saturate.min};\n`;
				cssVars += `--ghost-${safeTheme}-saturate-max: ${shapeConfig.filter.saturate.max};\n`;
			}

			if (shapeConfig.filter.brightness) {
				cssVars += `--ghost-${safeTheme}-brightness-min: ${shapeConfig.filter.brightness.min};\n`;
				cssVars += `--ghost-${safeTheme}-brightness-max: ${shapeConfig.filter.brightness.max};\n`;
			}
		}

		if (shapeConfig.scale) {
			cssVars += `--ghost-${safeTheme}-scale-min: ${shapeConfig.scale.min};\n`;
			cssVars += `--ghost-${safeTheme}-scale-mid: ${shapeConfig.scale.mid};\n`;
			cssVars += `--ghost-${safeTheme}-scale-steps: ${shapeConfig.scale.steps};\n`;
		}

		if (shapeConfig.rotation) {
			cssVars += `--ghost-${safeTheme}-rotation-min: ${shapeConfig.rotation.min}deg;\n`;
			cssVars += `--ghost-${safeTheme}-rotation-max: ${shapeConfig.rotation.max}deg;\n`;
		}

		if (shapeConfig.shadow) {
			cssVars += `--ghost-${safeTheme}-shadow-enabled: ${shapeConfig.shadow.enabled};\n`;
			cssVars += `--ghost-${safeTheme}-shadow-radius-min: ${shapeConfig.shadow.radius.min}px;\n`;
			cssVars += `--ghost-${safeTheme}-shadow-radius-max: ${shapeConfig.shadow.radius.max}px;\n`;
			cssVars += `--ghost-${safeTheme}-shadow-opacity-min: ${shapeConfig.shadow.opacity.min};\n`;
			cssVars += `--ghost-${safeTheme}-shadow-opacity-max: ${shapeConfig.shadow.opacity.max};\n`;
		}

		if (shapeConfig.transform && shapeConfig.transform.y) {
			cssVars += `--ghost-${safeTheme}-transform-y-min: ${shapeConfig.transform.y.min}px;\n`;
			cssVars += `--ghost-${safeTheme}-transform-y-max: ${shapeConfig.transform.y.max}px;\n`;
		}
	}

	return cssVars;
}

export function generateAllThemeCssVariables() {
	return (
		Object.keys(themeColors)
			.map((themeName) => generateThemeCssVariables(themeName))
			.join('\n') + getGlobalAnimationVariables()
	);
}

const cssVariables = derived(
	theme,
	($theme) => `${generateThemeCssVariables($theme)}${getGlobalAnimationVariables()}`
);

export function ensureGhostThemeStyles(options = {}) {
	if (!browser) return () => {};
	const { elementId = 'ghost-theme-vars', target = document.head } = options;
	let styleElement = document.getElementById(elementId);
	if (!styleElement) {
		styleElement = document.createElement('style');
		styleElement.id = elementId;
		target.appendChild(styleElement);
	}

	styleElement.textContent = `:root {\n${generateAllThemeCssVariables()}\n}`;

	return () => {};
}

// Function to set a new theme
function setTheme(newTheme) {
	if (Object.values(THEMES).includes(newTheme)) {
		theme.set(newTheme);
	} else {
		console.warn(`Invalid theme: ${newTheme}`);
	}
}

// Get theme colors for a specific theme and position
function getThemeColor(themeName, position, bright = false) {
	const theme = themeColors[themeName];
	if (!theme) return null;

	const posKey = position.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
	const brightSuffix = bright ? 'Bright' : '';
	const colorKey = posKey + brightSuffix;

	return theme[colorKey] || null;
}

// Only export items NOT already exported with 'export const/function' above
export {
	theme,
	cssVariables,
	setTheme,
	getThemeColor,
	themeColors
	// NOTE: generateThemeCssVariables, generateAllThemeCssVariables,
	// ensureGhostThemeStyles, getInitialTheme, FALLBACK_THEME
	// are already exported individually above - don't duplicate!
};
