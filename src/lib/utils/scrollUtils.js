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
	const { threshold = 200, delay = 0, force = false } = options;

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

function getPageScrollTop(scrollElement) {
	return (
		scrollElement?.scrollTop ||
		document.body?.scrollTop ||
		window.pageYOffset ||
		window.scrollY ||
		0
	);
}

function getPageScrollElement() {
	const root = document.scrollingElement || document.documentElement;
	const body = document.body;

	if (!body) return root;

	const bodyOverflowY = window.getComputedStyle(body).overflowY;
	const bodyCanScroll =
		body.scrollHeight > body.clientHeight &&
		bodyOverflowY !== 'visible' &&
		bodyOverflowY !== 'hidden';

	return bodyCanScroll ? body : root;
}

function getViewportHeight() {
	return (
		window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight
	);
}

/**
 * Center an element in the usable viewport while accounting for the fixed footer.
 * This avoids the old "scroll to bottom" behavior that could make mobile spacing
 * feel different after the transcript appeared.
 * @param {HTMLElement} element
 * @param {Object} options
 * @param {ScrollBehavior} options.behavior
 * @param {string} options.footerSelector
 * @param {number} options.delay
 * @param {number} options.minTop
 */
export function centerElementInViewport(element, options = {}) {
	if (typeof window === 'undefined' || typeof document === 'undefined' || !element) return;

	const {
		behavior = 'smooth',
		footerSelector = '.footer-component',
		delay = 0,
		minTop = 16
	} = options;

	const performScroll = () => {
		requestAnimationFrame(() => {
			const rect = element.getBoundingClientRect();
			if (!rect.width && !rect.height) return;

			const scrollElement = getPageScrollElement();
			const footerHeight = footerSelector
				? document.querySelector(footerSelector)?.getBoundingClientRect().height || 0
				: 0;
			const viewportHeight = getViewportHeight();
			const usableHeight = Math.max(240, viewportHeight - footerHeight);
			const visibleElementHeight = Math.min(rect.height, Math.max(0, usableHeight - minTop * 2));
			const targetViewportTop = Math.max(minTop, (usableHeight - visibleElementHeight) / 2);
			const currentScrollTop = getPageScrollTop(scrollElement);
			const maxScrollTop = Math.max(0, scrollElement.scrollHeight - scrollElement.clientHeight);
			const targetScrollTop = Math.max(
				0,
				Math.min(maxScrollTop, currentScrollTop + rect.top - targetViewportTop)
			);

			if (typeof scrollElement.scrollTo === 'function') {
				scrollElement.scrollTo({ top: targetScrollTop, behavior });
				return;
			}

			window.scrollTo({ top: targetScrollTop, behavior });
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
