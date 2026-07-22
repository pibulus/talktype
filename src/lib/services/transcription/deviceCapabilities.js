/**
 * Device Capabilities Detection Service
 * Intelligently selects the best Whisper model based on device specs
 */

import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { userPreferences } from '../infrastructure/stores';

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

	// Tiny is the universal baseline. The only upgrade is desktop + working WebGPU,
	// decided asynchronously in detectBestModel() (requestAdapter is async). This
	// synchronous pass just reports the device profile + a coarse tier.
	let tier = 'medium';
	const recommendedModel = 'tiny';
	let reason = 'Tiny model (WASM) — universal baseline';

	if (capabilities.memory >= 8 && capabilities.cores >= 8) tier = 'high';
	else if (capabilities.memory >= 6 && capabilities.cores >= 6) tier = 'medium-high';
	else if (capabilities.memory >= 4) tier = 'medium';
	else if (capabilities.memory >= 2) tier = 'low-medium';
	else if (capabilities.platform.isMobile || capabilities.memory < 2) tier = 'low';

	if (capabilities.platform.isIOS) reason = 'iOS — tiny + WASM (hard-pinned)';
	else if (capabilities.platform.isMobile) reason = 'Mobile — tiny + WASM';

	return {
		tier,
		recommendedModel,
		reason,
		capabilities,
		loadingStrategy: {
			initial: 'tiny', // always start instant
			target: 'tiny', // sync default; detectBestModel may upgrade to 'small'
			fallback: 'tiny'
		}
	};
}

/**
 * Probe for a REAL, usable WebGPU adapter — not just the API surface. `'gpu' in
 * navigator` is true even when requestAdapter() returns null (no working GPU),
 * and requestAdapter() can return a SOFTWARE rasterizer (SwiftShader/llvmpipe)
 * that "works" but transcribes slower than real-time — worse than WASM. Only a
 * hardware adapter counts. Result is cached for the session.
 */
let webgpuAdapterPromise;
export function probeWebGPU() {
	if (webgpuAdapterPromise) return webgpuAdapterPromise;
	webgpuAdapterPromise = (async () => {
		if (!browser || !navigator.gpu?.requestAdapter) return false;
		try {
			// requestAdapter() can hang forever on broken GPU drivers, which would
			// hang model selection. Race it against a 3s timeout → treat as no-GPU.
			const adapter = await Promise.race([
				navigator.gpu.requestAdapter(),
				new Promise((resolve) => setTimeout(() => resolve(null), 3000))
			]);
			if (!adapter) return false;
			// Chrome exposes isFallbackAdapter on the adapter (older) or its info
			// (newer); software stacks also identify via vendor/architecture strings.
			const info = adapter.info || {};
			if (adapter.isFallbackAdapter || info.isFallbackAdapter) return false;
			const signature =
				`${info.vendor || ''} ${info.architecture || ''} ${info.description || ''}`.toLowerCase();
			if (/swiftshader|llvmpipe|lavapipe|software/.test(signature)) return false;
			return true;
		} catch {
			return false;
		}
	})();
	return webgpuAdapterPromise;
}

/**
 * Decide the best offline model for THIS device, asynchronously (needs the
 * WebGPU adapter probe). Desktop with a working WebGPU adapter and enough memory
 * upgrades to 'small' (distil-small on WebGPU); everything else — mobile, iOS,
 * no-WebGPU desktop, data-saver — stays on the tiny+WASM baseline.
 * @returns {Promise<{model: 'tiny'|'small', reason: string, hasWebGPU: boolean}>}
 */
export async function detectBestModel() {
	if (!browser) return { model: 'tiny', reason: 'SSR', hasWebGPU: false };

	const { capabilities } = detectDeviceCapabilities();
	const tiny = (reason) => ({ model: 'tiny', reason, hasWebGPU: false });

	// If a prior WebGPU model load failed on this device, don't retry the
	// expensive distil-small download every session — stay on tiny+WASM.
	if (get(userPreferences)?.webgpuDisabled) {
		return tiny('WebGPU previously failed on this device — tiny + WASM');
	}

	// iOS / mobile / data-saver: tiny is non-negotiable (memory + the iOS WebKit
	// constraints that originally forced the all-tiny clamp).
	if (capabilities.platform.isIOS) return tiny('iOS — tiny + WASM (hard-pinned)');
	if (capabilities.platform.isMobile) return tiny('Mobile — tiny + WASM');
	if (capabilities.connection?.saveData) return tiny('Data saver — tiny + WASM');

	// Desktop: upgrade only if a real WebGPU adapter exists AND there's headroom.
	const hasWebGPU = await probeWebGPU();
	if (!hasWebGPU) return tiny('Desktop, no WebGPU — tiny + WASM');
	if (capabilities.memory < 8) return tiny('WebGPU but <8GB RAM — tiny + WASM');

	return { model: 'small', reason: 'Desktop + WebGPU — distil-small accelerated', hasWebGPU: true };
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
