/**
 * Device Capabilities Detection Service
 * Intelligently selects the best Whisper model based on device specs
 */

import { browser } from '$app/environment';

/**
 * Detect device capabilities and recommend optimal model
 */
export function detectDeviceCapabilities() {
	if (!browser) {
		return { tier: 'medium', recommendedModel: 'tiny' };
	}

	// Gather device information
	const capabilities = {
		// Memory (in GB)
		memory: navigator.deviceMemory || 4,

		// CPU cores
		cores: navigator.hardwareConcurrency || 4,

		// Connection speed
		connection: navigator.connection
			? {
					effectiveType: navigator.connection.effectiveType,
					downlink: navigator.connection.downlink, // Mbps
					saveData: navigator.connection.saveData
				}
			: null,

		// Platform detection
		platform: {
			isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
			isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent),
			isAndroid: /Android/i.test(navigator.userAgent),
			isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
			isChrome: /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent),
			// Detect iOS Chrome (which is actually Safari WebKit)
			isIOSChrome: /CriOS/.test(navigator.userAgent)
		},

		// WebGPU support
		hasWebGPU: 'gpu' in navigator,

		// Storage estimate
		storage: null
	};

	// Determine device tier and recommended model
	const isMobileDevice = capabilities.platform.isMobile;
	let tier = 'medium';
	let recommendedModel = 'tiny';
	let reason = 'Defaulting to tiny until heuristics run';

	if (!isMobileDevice) {
		if (capabilities.memory >= 12 || (capabilities.memory >= 8 && capabilities.cores >= 8)) {
			tier = 'ultra-high';
			recommendedModel = 'small';
			reason = '>= 8 cores and >= 8GB RAM (desktop class)';
		} else if (capabilities.memory >= 6 && capabilities.cores >= 6) {
			tier = 'desktop-high';
			recommendedModel = 'small';
			reason = '>= 6 cores and >= 6GB RAM';
		} else if (capabilities.memory >= 4 && capabilities.cores >= 4) {
			tier = 'desktop-medium';
			recommendedModel = 'small';
			reason = '>= 4 cores and >= 4GB RAM';
		} else if (capabilities.memory >= 3) {
			tier = 'desktop-low';
			recommendedModel = 'tiny';
			reason = 'Desktop memory under 4GB';
		} else {
			tier = 'desktop-constraint';
			recommendedModel = 'tiny';
			reason = 'Desktop with < 3GB RAM';
		}
	} else {
		tier = 'mobile-low';
		recommendedModel = 'tiny';
		reason = 'Mobile device constraints (Safari/Android)';
	}

	// Special cases
	if (capabilities.connection?.saveData) {
		// User has data saver enabled, use smallest model
		recommendedModel = 'tiny';
		reason = 'Data saver mode enabled';
	}

	// Platform-specific adjustments based on known issues
	if (capabilities.platform.isIOS) {
		// iOS has known memory issues with transformers.js v3
		// Both Safari and Chrome on iOS use WebKit and have same constraints
		if (recommendedModel !== 'tiny') {
			recommendedModel = 'tiny';
			reason = 'iOS memory constraints (transformers.js v3 issue)';
		}
	} else if (capabilities.platform.isAndroid && capabilities.memory < 4) {
		// Android with low memory should use tiny
		recommendedModel = 'tiny';
		reason = 'Android low memory optimization';
	}

	return {
		tier,
		recommendedModel,
		reason,
		capabilities,
		// Progressive loading strategy
		loadingStrategy: {
			initial: 'tiny', // Always start with tiny for instant experience
			target: recommendedModel, // Load this in background
			fallback: tier.includes('low') ? null : 'small' // Fallback if target fails
		}
	};
}

/**
 * Estimate storage available for model caching
 */
export async function estimateStorage() {
	if (!browser || !navigator.storage?.estimate) {
		return { available: null, canStore: true };
	}

	try {
		const estimate = await navigator.storage.estimate();
		const availableMB = Math.floor((estimate.quota - estimate.usage) / (1024 * 1024));

		return {
			available: availableMB,
			canStore: availableMB > 100, // Need at least 100MB free
			quota: Math.floor(estimate.quota / (1024 * 1024)),
			used: Math.floor(estimate.usage / (1024 * 1024))
		};
	} catch (e) {
		console.warn('Could not estimate storage:', e);
		return { available: null, canStore: true };
	}
}

/**
 * Get performance benchmark for transcription
 */
export function getPerformanceEstimate(modelId, deviceTier) {
	// Rough estimates based on research and testing
	const estimates = {
		tiny: {
			high: { speed: '50x', loadTime: '1s' },
			medium: { speed: '30x', loadTime: '2s' },
			low: { speed: '10x', loadTime: '3s' }
		},
		small: {
			high: { speed: '20x', loadTime: '5s' },
			medium: { speed: '12x', loadTime: '8s' },
			low: { speed: '5x', loadTime: '12s' }
		},
		medium: {
			high: { speed: '10x', loadTime: '15s' },
			medium: { speed: '6x', loadTime: '25s' },
			low: { speed: '2x', loadTime: '40s' }
		},
		large: {
			high: { speed: '5x', loadTime: '30s' },
			medium: { speed: '3x', loadTime: '50s' },
			low: { speed: '1x', loadTime: '90s' }
		}
	};

	const tierKey = deviceTier.includes('high')
		? 'high'
		: deviceTier.includes('low')
			? 'low'
			: 'medium';

	return estimates[modelId]?.[tierKey] || { speed: '10x', loadTime: '5s' };
}

/**
 * Monitor performance and suggest model changes
 */
export class PerformanceMonitor {
	constructor() {
		this.metrics = [];
		this.maxSamples = 10;
	}

	recordTranscription(duration, audioLength, modelId) {
		const rtf = duration / (audioLength * 1000); // Real-time factor

		this.metrics.push({
			timestamp: Date.now(),
			duration,
			audioLength,
			modelId,
			rtf,
			speed: rtf > 0 ? (1 / rtf).toFixed(1) + 'x' : 'N/A'
		});

		// Keep only recent samples
		if (this.metrics.length > this.maxSamples) {
			this.metrics.shift();
		}

		return this.analyze();
	}

	analyze() {
		if (this.metrics.length < 3) {
			return { suggestion: null, reason: 'Not enough data' };
		}

		const avgRtf = this.metrics.reduce((sum, m) => sum + m.rtf, 0) / this.metrics.length;
		const currentModel = this.metrics[this.metrics.length - 1].modelId;

		// If processing is slower than 5x real-time, suggest smaller model
		if (avgRtf > 0.2) {
			return {
				suggestion: 'downgrade',
				reason: `Processing only ${(1 / avgRtf).toFixed(1)}x real-time`,
				recommended: this.getSmallerModel(currentModel)
			};
		}

		// If processing is faster than 20x real-time, can try larger model
		if (avgRtf < 0.05) {
			return {
				suggestion: 'upgrade',
				reason: `Processing at ${(1 / avgRtf).toFixed(1)}x real-time`,
				recommended: this.getLargerModel(currentModel)
			};
		}

		return {
			suggestion: null,
			reason: `Performance optimal at ${(1 / avgRtf).toFixed(1)}x real-time`
		};
	}

	getSmallerModel(current) {
		const models = ['tiny', 'small', 'medium', 'large'];
		const idx = models.indexOf(current);
		return idx > 0 ? models[idx - 1] : current;
	}

	getLargerModel(current) {
		const models = ['tiny', 'small', 'medium', 'large'];
		const idx = models.indexOf(current);
		return idx < models.length - 1 ? models[idx + 1] : current;
	}
}

// Export singleton monitor
export const performanceMonitor = new PerformanceMonitor();
