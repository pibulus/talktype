// ===================================================================
// PERFORMANCE UTILITIES - Optimization helpers
// ===================================================================

import { browser } from '$app/environment';
import { writable, derived } from 'svelte/store';

/**
 * Store tracking document visibility
 */
function createVisibilityStore() {
	const { subscribe, set } = writable(true);
	
	if (browser) {
		const handleVisibilityChange = () => {
			set(!document.hidden);
		};
		
		document.addEventListener('visibilitychange', handleVisibilityChange);
		
		// Set initial value
		set(!document.hidden);
	}
	
	return { subscribe };
}

export const documentVisible = createVisibilityStore();

/**
 * Pause animations when document is hidden
 * @param {Function} callback - Function to call on animation frame
 * @returns {Object} Controller with start/stop methods
 */
export function createAnimationController(callback) {
	let animationId = null;
	let isRunning = false;
	let isPaused = false;
	
	const animate = () => {
		if (!isRunning || isPaused) return;
		
		callback();
		animationId = requestAnimationFrame(animate);
	};
	
	// Auto-pause when document hidden
	if (browser) {
		document.addEventListener('visibilitychange', () => {
			if (document.hidden && isRunning) {
				isPaused = true;
				if (animationId) {
					cancelAnimationFrame(animationId);
					animationId = null;
				}
			} else if (!document.hidden && isRunning && isPaused) {
				isPaused = false;
				animate();
			}
		});
	}
	
	return {
		start() {
			if (isRunning) return;
			isRunning = true;
			isPaused = false;
			animate();
		},
		
		stop() {
			isRunning = false;
			isPaused = false;
			if (animationId) {
				cancelAnimationFrame(animationId);
				animationId = null;
			}
		},
		
		get isRunning() {
			return isRunning && !isPaused;
		}
	};
}

/**
 * Memoize expensive calculations
 * @param {Function} fn - Function to memoize
 * @param {Function} keyGen - Generate cache key from arguments
 * @returns {Function} Memoized function
 */
export function memoize(fn, keyGen = (...args) => JSON.stringify(args)) {
	const cache = new Map();
	const maxCacheSize = 50;
	
	return function(...args) {
		const key = keyGen(...args);
		
		if (cache.has(key)) {
			return cache.get(key);
		}
		
		const result = fn.apply(this, args);
		
		// Limit cache size
		if (cache.size >= maxCacheSize) {
			const firstKey = cache.keys().next().value;
			cache.delete(firstKey);
		}
		
		cache.set(key, result);
		return result;
	};
}

/**
 * Throttle function execution
 * @param {Function} fn - Function to throttle
 * @param {number} delay - Minimum delay between calls (ms)
 * @returns {Function} Throttled function
 */
export function throttle(fn, delay = 100) {
	let lastCall = 0;
	let timeoutId = null;
	
	return function(...args) {
		const now = Date.now();
		const timeSinceLastCall = now - lastCall;
		
		if (timeSinceLastCall >= delay) {
			lastCall = now;
			fn.apply(this, args);
		} else {
			// Schedule call for later
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				lastCall = Date.now();
				fn.apply(this, args);
			}, delay - timeSinceLastCall);
		}
	};
}

/**
 * Defer heavy initialization until idle
 * @param {Function} fn - Function to defer
 * @returns {Promise} Promise that resolves when function executes
 */
export function deferUntilIdle(fn) {
	if (!browser) return Promise.resolve();
	
	return new Promise((resolve) => {
		if ('requestIdleCallback' in window) {
			requestIdleCallback(() => {
				fn();
				resolve();
			}, { timeout: 2000 });
		} else {
			// Fallback for browsers without requestIdleCallback
			setTimeout(() => {
				fn();
				resolve();
			}, 100);
		}
	});
}

/**
 * Load script dynamically
 * @param {string} src - Script source URL
 * @returns {Promise} Promise that resolves when script loads
 */
export function loadScript(src) {
	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = src;
		script.async = true;
		script.onload = resolve;
		script.onerror = reject;
		document.head.appendChild(script);
	});
}

/**
 * Measure performance of a function
 * @param {string} name - Performance mark name
 * @param {Function} fn - Function to measure
 * @returns {*} Function result
 */
export function measurePerformance(name, fn) {
	if (!browser || !performance.mark) return fn();
	
	const startMark = `${name}-start`;
	const endMark = `${name}-end`;
	const measureName = `${name}-duration`;
	
	performance.mark(startMark);
	const result = fn();
	performance.mark(endMark);
	
	performance.measure(measureName, startMark, endMark);
	
	// Log in development
	if (import.meta.env.DEV) {
		const measure = performance.getEntriesByName(measureName)[0];
		console.log(`⏱ ${name}: ${measure.duration.toFixed(2)}ms`);
	}
	
	// Clean up marks
	performance.clearMarks(startMark);
	performance.clearMarks(endMark);
	performance.clearMeasures(measureName);
	
	return result;
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion() {
	if (!browser) return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Create intersection observer for lazy loading
 * @param {Function} callback - Callback when element intersects
 * @param {Object} options - Intersection observer options
 * @returns {IntersectionObserver}
 */
export function createLazyObserver(callback, options = {}) {
	if (!browser || !('IntersectionObserver' in window)) {
		// Fallback: immediately call callback
		return {
			observe: (el) => callback(el),
			unobserve: () => {},
			disconnect: () => {}
		};
	}
	
	const defaultOptions = {
		rootMargin: '50px',
		threshold: 0.01,
		...options
	};
	
	return new IntersectionObserver((entries) => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				callback(entry.target);
			}
		});
	}, defaultOptions);
}