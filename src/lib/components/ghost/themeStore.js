import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { THEMES, STORAGE_KEYS } from '$lib/constants';
import { gradientAnimations } from './gradientConfig';
import { shapeAnimations } from './gradientConfig';

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
function getInitialTheme() {
  if (!browser) return THEMES.PEACH;
  
  try {
    const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    return storedTheme && Object.values(THEMES).includes(storedTheme)
      ? storedTheme
      : THEMES.PEACH;
  } catch (e) {
    return THEMES.PEACH;
  }
}

// Create the main theme store
const theme = writable(getInitialTheme());

// Save theme changes to localStorage
if (browser) {
  theme.subscribe(value => {
    try {
      if (value) {
        localStorage.setItem(STORAGE_KEYS.THEME, value);
        document.documentElement.setAttribute('data-theme', value);
      }
    } catch (e) {
      console.warn('Could not save theme preference to localStorage', e);
    }
  });
}

// Generate CSS variables for current theme
const cssVariables = derived(theme, $theme => {
  let cssVars = '';
  
  // Get theme colors
  const colors = themeColors[$theme];
  if (!colors) return cssVars;
  
  // Get animation config
  const animConfig = gradientAnimations[$theme];
  const shapeConfig = shapeAnimations[$theme];
  
  // Add base theme colors
  cssVars += `--ghost-${$theme}-start: ${colors.start};\n`;
  cssVars += `--ghost-${$theme}-start-bright: ${colors.startBright};\n`;
  cssVars += `--ghost-${$theme}-mid1: ${colors.mid1};\n`;
  cssVars += `--ghost-${$theme}-mid1-bright: ${colors.mid1Bright};\n`;
  cssVars += `--ghost-${$theme}-mid2: ${colors.mid2};\n`;
  cssVars += `--ghost-${$theme}-mid2-bright: ${colors.mid2Bright};\n`;
  cssVars += `--ghost-${$theme}-mid3: ${colors.mid3};\n`;
  cssVars += `--ghost-${$theme}-mid3-bright: ${colors.mid3Bright};\n`;
  cssVars += `--ghost-${$theme}-end: ${colors.end};\n`;
  cssVars += `--ghost-${$theme}-end-bright: ${colors.endBright};\n`;
  
  // Add glow colors
  cssVars += `--ghost-${$theme}-glow-primary: ${colors.glowPrimary};\n`;
  cssVars += `--ghost-${$theme}-glow-secondary: ${colors.glowSecondary};\n`;
  cssVars += `--ghost-${$theme}-glow-tertiary: ${colors.glowTertiary};\n`;
  
  if (colors.glowQuaternary) {
    cssVars += `--ghost-${$theme}-glow-quaternary: ${colors.glowQuaternary};\n`;
    cssVars += `--ghost-${$theme}-glow-quinary: ${colors.glowQuinary};\n`;
    cssVars += `--ghost-${$theme}-glow-senary: ${colors.glowSenary};\n`;
  }
  
  // Add shadow colors
  cssVars += `--ghost-${$theme}-shadow-color: ${colors.shadowColor};\n`;
  cssVars += `--ghost-${$theme}-shadow-color-bright: ${colors.shadowColorBright};\n`;
  cssVars += `--ghost-${$theme}-shadow-color-brightest: ${colors.shadowColorBrightest};\n`;
  
  if (colors.shadowColorBrighter) {
    cssVars += `--ghost-${$theme}-shadow-color-brighter: ${colors.shadowColorBrighter};\n`;
  }
  
  if (colors.shadowColorBrightAlt) {
    cssVars += `--ghost-${$theme}-shadow-color-bright-alt: ${colors.shadowColorBrightAlt};\n`;
  }
  
  // Add animation parameters
  if (animConfig) {
    // Position animation parameters
    if (animConfig.position) {
      cssVars += `--ghost-${$theme}-position-speed: ${animConfig.position.speed};\n`;
      cssVars += `--ghost-${$theme}-position-amplitude: ${animConfig.position.amplitude}%;\n`;
    }
    
    // Add stop positions for reference
    if (animConfig.stopPositions) {
      cssVars += `--ghost-${$theme}-stop-positions: "${animConfig.stopPositions.join(',')}";\n`;
    }
  }
  
  // Add shape animation parameters
  if (shapeConfig) {
    cssVars += `--ghost-${$theme}-flow-duration: ${shapeConfig.flowDuration}s;\n`;
    cssVars += `--ghost-${$theme}-flow-ease: ${shapeConfig.flowEase};\n`;
    
    if (shapeConfig.filter) {
      if (shapeConfig.filter.hueRotate) {
        cssVars += `--ghost-${$theme}-hue-rotate-min: ${shapeConfig.filter.hueRotate.min}deg;\n`;
        cssVars += `--ghost-${$theme}-hue-rotate-max: ${shapeConfig.filter.hueRotate.max}deg;\n`;
        
        if (shapeConfig.filter.hueRotate.isFullCycle) {
          cssVars += `--ghost-${$theme}-hue-rotate-full-cycle: true;\n`;
        }
      }
      
      if (shapeConfig.filter.saturate) {
        cssVars += `--ghost-${$theme}-saturate-min: ${shapeConfig.filter.saturate.min};\n`;
        cssVars += `--ghost-${$theme}-saturate-max: ${shapeConfig.filter.saturate.max};\n`;
      }
      
      if (shapeConfig.filter.brightness) {
        cssVars += `--ghost-${$theme}-brightness-min: ${shapeConfig.filter.brightness.min};\n`;
        cssVars += `--ghost-${$theme}-brightness-max: ${shapeConfig.filter.brightness.max};\n`;
      }
    }
    
    if (shapeConfig.scale) {
      cssVars += `--ghost-${$theme}-scale-min: ${shapeConfig.scale.min};\n`;
      cssVars += `--ghost-${$theme}-scale-mid: ${shapeConfig.scale.mid};\n`;
      cssVars += `--ghost-${$theme}-scale-steps: ${shapeConfig.scale.steps};\n`;
    }
    
    if (shapeConfig.rotation) {
      cssVars += `--ghost-${$theme}-rotation-min: ${shapeConfig.rotation.min}deg;\n`;
      cssVars += `--ghost-${$theme}-rotation-max: ${shapeConfig.rotation.max}deg;\n`;
    }
    
    if (shapeConfig.shadow) {
      cssVars += `--ghost-${$theme}-shadow-enabled: ${shapeConfig.shadow.enabled};\n`;
      cssVars += `--ghost-${$theme}-shadow-radius-min: ${shapeConfig.shadow.radius.min}px;\n`;
      cssVars += `--ghost-${$theme}-shadow-radius-max: ${shapeConfig.shadow.radius.max}px;\n`;
      cssVars += `--ghost-${$theme}-shadow-opacity-min: ${shapeConfig.shadow.opacity.min};\n`;
      cssVars += `--ghost-${$theme}-shadow-opacity-max: ${shapeConfig.shadow.opacity.max};\n`;
    }
    
    if (shapeConfig.transform && shapeConfig.transform.y) {
      cssVars += `--ghost-${$theme}-transform-y-min: ${shapeConfig.transform.y.min}px;\n`;
      cssVars += `--ghost-${$theme}-transform-y-max: ${shapeConfig.transform.y.max}px;\n`;
    }
  }
  
  return cssVars;
});

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
  
  const posKey = position.replace(/-([a-z])/g, g => g[1].toUpperCase());
  const brightSuffix = bright ? 'Bright' : '';
  const colorKey = posKey + brightSuffix;
  
  return theme[colorKey] || null;
}

export {
  theme,
  cssVariables,
  setTheme,
  getThemeColor,
  themeColors
};