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
		return { tier: 'medium', recommendedModel: 'distil-medium' };
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
			isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
		},

		// WebGPU support
		hasWebGPU: 'gpu' in navigator,

		// Storage estimate
		storage: null
	};

	// Determine device tier
	let tier = 'medium';
	let recommendedModel = 'distil-medium';
	let reason = 'Balanced performance';

	// High-end device detection
	if (capabilities.memory >= 8 && capabilities.cores >= 8 && capabilities.hasWebGPU) {
		tier = 'high';
		recommendedModel = 'distil-large-v2';
		reason = 'High-end device with WebGPU support';
	}
	// Mid-high tier (good memory but maybe no WebGPU)
	else if (capabilities.memory >= 6 && capabilities.cores >= 6) {
		tier = 'medium-high';
		recommendedModel = 'distil-medium';
		reason = 'Good specs for balanced performance';
	}
	// Standard mid-tier
	else if (capabilities.memory >= 4) {
		tier = 'medium';
		recommendedModel = 'distil-medium';
		reason = 'Standard device with adequate memory';
	}
	// Low-mid tier
	else if (capabilities.memory >= 3) {
		tier = 'low-medium';
		recommendedModel = 'distil-small';
		reason = 'Limited memory, using smaller model';
	}
	// Low-end or mobile devices
	else if (capabilities.platform.isMobile || capabilities.memory < 3) {
		tier = 'low';
		recommendedModel = 'tiny';
		reason = capabilities.platform.isMobile ? 'Mobile device' : 'Low memory device';
	}

	// Special cases
	if (capabilities.connection?.saveData) {
		// User has data saver enabled, use smallest model
		recommendedModel = 'tiny';
		reason = 'Data saver mode enabled';
	}

	if (capabilities.platform.isIOS && capabilities.platform.isSafari) {
		// iOS Safari has stricter memory limits
		if (recommendedModel === 'distil-large-v2') {
			recommendedModel = 'distil-medium';
			reason = 'iOS Safari memory constraints';
		}
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
			fallback: tier === 'low' ? null : 'distil-small' // Fallback if target fails
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
		'distil-small': {
			high: { speed: '40x', loadTime: '3s' },
			medium: { speed: '20x', loadTime: '5s' },
			low: { speed: '8x', loadTime: '8s' }
		},
		'distil-medium': {
			high: { speed: '35x', loadTime: '5s' },
			medium: { speed: '15x', loadTime: '8s' },
			low: { speed: '5x', loadTime: '15s' }
		},
		'distil-large-v2': {
			high: { speed: '25x', loadTime: '10s' },
			medium: { speed: '10x', loadTime: '20s' },
			low: { speed: '3x', loadTime: '30s' }
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
		const models = ['tiny', 'distil-small', 'distil-medium', 'distil-large-v2'];
		const idx = models.indexOf(current);
		return idx > 0 ? models[idx - 1] : current;
	}

	getLargerModel(current) {
		const models = ['tiny', 'distil-small', 'distil-medium', 'distil-large-v2'];
		const idx = models.indexOf(current);
		return idx < models.length - 1 ? models[idx + 1] : current;
	}
}

// Export singleton monitor
export const performanceMonitor = new PerformanceMonitor();
