// ===================================================================
// SCROLL UTILITIES - Centralized scroll handling
// ===================================================================

/**
 * Check if user is near bottom of page
 * @param {number} threshold - Distance from bottom to consider "near" (default 200px)
 * @returns {boolean}
 */
export function isNearBottom(threshold = 200) {
	if (typeof window === 'undefined') return false;
	
	const scrollPosition = window.pageYOffset || window.scrollY;
	const windowHeight = window.innerHeight;
	const documentHeight = document.body.scrollHeight;
	
	return scrollPosition + windowHeight >= documentHeight - threshold;
}

/**
 * Smooth scroll to bottom of page if not already there
 * @param {Object} options
 * @param {number} options.threshold - Distance from bottom to trigger scroll
 * @param {number} options.delay - Delay before scrolling (ms)
 * @param {boolean} options.force - Force scroll even if near bottom
 */
export function scrollToBottomIfNeeded(options = {}) {
	const {
		threshold = 200,
		delay = 0,
		force = false
	} = options;
	
	const performScroll = () => {
		if (typeof window === 'undefined') return;
		
		// Skip if already near bottom (unless forced)
		if (!force && isNearBottom(threshold)) {
			return;
		}
		
		// Use requestAnimationFrame for smoother scrolling
		requestAnimationFrame(() => {
			window.scrollTo({
				top: document.body.scrollHeight,
				behavior: 'smooth'
			});
		});
	};
	
	if (delay > 0) {
		setTimeout(performScroll, delay);
	} else {
		performScroll();
	}
}

/**
 * Debounced scroll handler
 * @param {Function} callback - Function to call on scroll
 * @param {number} delay - Debounce delay (ms)
 * @returns {Function} Cleanup function
 */
export function onScroll(callback, delay = 100) {
	if (typeof window === 'undefined') return () => {};
	
	let timeoutId;
	const handleScroll = () => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(callback, delay);
	};
	
	window.addEventListener('scroll', handleScroll, { passive: true });
	
	// Return cleanup function
	return () => {
		clearTimeout(timeoutId);
		window.removeEventListener('scroll', handleScroll);
	};
}

/**
 * Get current scroll position
 * @returns {{x: number, y: number}}
 */
export function getScrollPosition() {
	if (typeof window === 'undefined') {
		return { x: 0, y: 0 };
	}
	
	return {
		x: window.pageXOffset || window.scrollX || 0,
		y: window.pageYOffset || window.scrollY || 0
	};
}

/**
 * Lock/unlock body scrolling (useful for modals)
 * @param {boolean} lock - Whether to lock scrolling
 */
export function lockBodyScroll(lock = true) {
	if (typeof document === 'undefined') return;
	
	if (lock) {
		// Store current scroll position
		const scrollY = window.scrollY;
		document.body.style.position = 'fixed';
		document.body.style.top = `-${scrollY}px`;
		document.body.style.width = '100%';
	} else {
		// Restore scroll position
		const scrollY = document.body.style.top;
		document.body.style.position = '';
		document.body.style.top = '';
		document.body.style.width = '';
		window.scrollTo(0, parseInt(scrollY || '0') * -1);
	}
}