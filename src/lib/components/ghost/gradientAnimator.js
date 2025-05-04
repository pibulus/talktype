/**
 * Gradient Animator
 * 
 * Handles dynamic animation of SVG gradients through direct DOM manipulation
 * since CSS animations on SVG gradients have limited browser support.
 * Uses CSS variables from ghost-themes.css for color values.
 */

import { gradientAnimations, animationTiming } from './gradientConfig';
import { getThemeColor } from './themeStore';

// Animation state
let animationFrames = {};
let gradientPositions = {};
let stopColors = {};

/**
 * Initialize gradient animation for a specific theme
 * @param {string} themeId - Theme identifier (peach, mint, bubblegum, rainbow)
 * @param {SVGElement} svgElement - The SVG element containing the gradient
 */
export function initGradientAnimation(themeId, svgElement) {
  if (!svgElement) return;
  
  // Clean up any existing animation for this theme
  cleanupAnimation(themeId);
  
  const gradientId = `${themeId}Gradient`;
  const gradient = svgElement.querySelector(`#${gradientId}`);
  
  if (!gradient) {
    console.warn(`Gradient #${gradientId} not found`);
    return;
  }
  
  // Initialize gradient position animation
  initGradientPositionAnimation(themeId, gradient);
  
  // Initialize stop color animations
  const stops = gradient.querySelectorAll('stop');
  initStopColorAnimations(themeId, stops);
}

/**
 * Initialize position animation for a gradient
 * @param {string} themeId - Theme identifier
 * @param {SVGLinearGradientElement} gradient - The gradient element to animate
 */
function initGradientPositionAnimation(themeId, gradient) {
  // Get configuration for this theme
  const config = gradientAnimations[themeId];
  const timingConfig = animationTiming.gradientShift;
  
  if (!config) return;
  
  // Get animation speed and amplitude from CSS if available
  const speedFromCss = parseFloat(getCssVariable(`ghost-${themeId}-position-speed`, config.position.speed));
  const amplitudeFromCss = parseFloat(getCssVariable(`ghost-${themeId}-position-amplitude`, config.position.amplitude));
  
  // Set initial position state
  gradientPositions[themeId] = {
    x1: 0,
    y1: 0,
    x2: 100,
    y2: 100,
    phase: 0,
    speed: speedFromCss,
    amplitude: amplitudeFromCss || timingConfig.magnitude
  };
  
  // Start the animation loop
  animationFrames[`${themeId}_position`] = requestAnimationFrame(() => 
    animateGradientPosition(themeId, gradient)
  );
}

/**
 * Animate gradient position
 * @param {string} themeId - Theme identifier
 * @param {SVGLinearGradientElement} gradient - The gradient element to animate
 */
function animateGradientPosition(themeId, gradient) {
  if (!gradient || !gradientPositions[themeId]) return;
  
  const pos = gradientPositions[themeId];
  
  // Update position phase
  pos.phase += pos.speed;
  
  // Calculate new positions with sine waves
  const xOffset = Math.sin(pos.phase) * pos.amplitude;
  const yOffset = Math.cos(pos.phase * 1.3) * pos.amplitude;
  
  // Set gradient coordinates
  gradient.setAttribute('x1', `${pos.x1 + xOffset}%`);
  gradient.setAttribute('y1', `${pos.y1 + yOffset}%`);
  gradient.setAttribute('x2', `${pos.x2 - xOffset}%`);
  gradient.setAttribute('y2', `${pos.y2 - yOffset}%`);
  
  // Continue animation
  animationFrames[`${themeId}_position`] = requestAnimationFrame(() => 
    animateGradientPosition(themeId, gradient)
  );
}

/**
 * Initialize color animations for gradient stops
 * @param {string} themeId - Theme identifier
 * @param {NodeList} stops - Collection of stop elements
 */
function initStopColorAnimations(themeId, stops) {
  if (!stops || !stops.length) return;
  
  // Get configuration
  const config = gradientAnimations[themeId];
  const timingConfig = animationTiming.colorPulse;
  
  if (!config) return;
  
  // Initialize color animation state for each stop
  stopColors[themeId] = [];
  
  // Get stop positions from config
  const positions = config.stopPositions || ['start', 'mid1', 'mid2', 'mid3', 'end'];
  
  stops.forEach((stop, index) => {
    // Check if we have a position for this stop
    if (index >= positions.length) return;
    
    // Get position name
    const position = positions[index];
    
    // Get opacity range based on position in gradient
    const opacityRangeKey = index === 0 ? 'start' : 
                           index === stops.length - 1 ? 'end' : 'mid';
    
    // Get opacity range from CSS if available
    const baseOpacity = parseFloat(getCssVariable(`ghost-colorpulse-${opacityRangeKey}-opacity-min`, 
                                                 timingConfig.opacityRanges[opacityRangeKey][0]));
    const brightOpacity = parseFloat(getCssVariable(`ghost-colorpulse-${opacityRangeKey}-opacity-max`, 
                                                   timingConfig.opacityRanges[opacityRangeKey][1]));
    
    // Get color duration and stagger from CSS if available
    const duration = parseFloat(getCssVariable('ghost-colorpulse-duration', timingConfig.duration * 1000)) / 1000;
    const staggerDelay = parseFloat(getCssVariable('ghost-colorpulse-stagger', timingConfig.staggerDelay));
    
    // Create animation state for this stop
    stopColors[themeId][index] = {
      stop,
      position,
      phase: index * staggerDelay * 10, // Convert to radians
      speed: Math.PI * 2 / (duration * 60), // Full cycle in frames
      opacity: {
        base: baseOpacity,
        bright: brightOpacity
      }
    };
    
    // Apply initial color from CSS
    stop.setAttribute('stop-color', getThemeColor(themeId, position));
    
    // Start animation
    animationFrames[`${themeId}_stop_${index}`] = requestAnimationFrame(() => 
      animateStopColor(themeId, index)
    );
  });
}

/**
 * Animate a gradient stop's color
 * @param {string} themeId - Theme identifier
 * @param {number} stopIndex - Index of the stop to animate
 */
function animateStopColor(themeId, stopIndex) {
  const colorState = stopColors[themeId]?.[stopIndex];
  if (!colorState) return;
  
  // Update phase
  colorState.phase += colorState.speed;
  
  // Calculate interpolation factor (0-1) using sine wave
  const factor = (Math.sin(colorState.phase) + 1) / 2;
  
  // Update opacity based on interpolation
  const opacity = colorState.opacity.base + 
    (factor * (colorState.opacity.bright - colorState.opacity.base));
  
  // Toggle between base and bright color based on factor
  if (factor > 0.5) {
    // Use bright color when factor is high
    colorState.stop.setAttribute('stop-color', getThemeColor(themeId, colorState.position, true));
  } else {
    // Use base color when factor is low
    colorState.stop.setAttribute('stop-color', getThemeColor(themeId, colorState.position, false));
  }
  
  // Apply opacity
  colorState.stop.setAttribute('stop-opacity', opacity.toFixed(2));
  
  // Continue animation
  animationFrames[`${themeId}_stop_${stopIndex}`] = requestAnimationFrame(() => 
    animateStopColor(themeId, stopIndex)
  );
}

/**
 * Helper function to get CSS variable value
 * @param {string} name - CSS variable name without -- prefix
 * @param {*} fallback - Optional fallback value
 * @returns {string} CSS variable value or fallback
 */
function getCssVariable(name, fallback = '') {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim() || fallback;
}

/**
 * Cleanup animations for a theme
 * @param {string} themeId - Theme identifier
 */
export function cleanupAnimation(themeId) {
  // Clean up position animation
  if (animationFrames[`${themeId}_position`]) {
    cancelAnimationFrame(animationFrames[`${themeId}_position`]);
    delete animationFrames[`${themeId}_position`];
    delete gradientPositions[themeId];
  }
  
  // Clean up stop color animations
  if (stopColors[themeId]) {
    stopColors[themeId].forEach((_, index) => {
      if (animationFrames[`${themeId}_stop_${index}`]) {
        cancelAnimationFrame(animationFrames[`${themeId}_stop_${index}`]);
        delete animationFrames[`${themeId}_stop_${index}`];
      }
    });
    
    delete stopColors[themeId];
  }
}

/**
 * Clean up all animations
 */
export function cleanupAllAnimations() {
  Object.keys(animationFrames).forEach(key => {
    cancelAnimationFrame(animationFrames[key]);
    delete animationFrames[key];
  });
  
  gradientPositions = {};
  stopColors = {};
}