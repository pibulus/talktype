/**
 * Model Registry - Configuration service for Whisper models
 * Adapted from ziplist for TalkType's transcription needs
 */

import { writable, get, derived } from 'svelte/store';
import { userPreferences } from '../../infrastructure/stores';
import { browser } from '$app/environment';
import { detectDeviceCapabilities } from '../deviceCapabilities';

// Default model collection - Using Distil-Whisper for 5.6x faster performance
// Based on latest research (Oct 2025): distil-whisper models are production-ready
const DEFAULT_MODELS = [
	{
		id: 'tiny',
		transformers_id: 'Xenova/whisper-tiny.en', // Mobile fallback (iOS compatible)
		name: 'Tiny English (117MB)',
		description: 'Mobile-optimized, iOS compatible',
		size: 117 * 1024 * 1024, // ~117MB INT8 quantized
		parameters: 39000000,
		languages: ['en'],
		version: '1.0.0',
		recommended_for: 'iOS Safari, low-memory devices',
		speed_multiplier: 1.0,
		accuracy_loss: '~20% vs distil-small',
		mobile_safe: true
	},
	{
		id: 'small',
		transformers_id: 'distil-whisper/distil-small.en', // RECOMMENDED for desktop
		name: 'Distil-Small English (95MB)',
		description: '5.6x faster, 4% quality vs best models',
		size: 95 * 1024 * 1024, // ~95MB INT8 quantized
		parameters: 166000000,
		languages: ['en'],
		version: '3.0.0',
		recommended_for: 'Desktop (recommended), 3-5s for 30s audio',
		speed_multiplier: 5.6,
		accuracy_loss: '4% vs Whisper Large',
		desktop_optimized: true
	},
	{
		id: 'medium',
		transformers_id: 'distil-whisper/distil-medium.en', // Larger desktop option
		name: 'Distil-Medium English (150MB)',
		description: '5.6x faster, better accuracy',
		size: 150 * 1024 * 1024, // ~150MB INT8 quantized
		parameters: 394000000,
		languages: ['en'],
		version: '3.0.0',
		recommended_for: 'Desktop with >4GB RAM',
		speed_multiplier: 5.6,
		accuracy_loss: '2% vs Whisper Large',
		desktop_optimized: true
	},
	{
		id: 'large',
		transformers_id: 'distil-whisper/distil-large-v3', // Pro multilingual
		name: 'Distil-Large Pro (750MB)',
		description: '99 languages, 5.6x faster than regular Large',
		size: 750 * 1024 * 1024, // ~750MB
		parameters: 1550000000,
		languages: ['multi'], // 99 languages
		version: '3.0.0',
		recommended_for: 'Pro users, multilingual, WebGPU',
		speed_multiplier: 5.6,
		accuracy_loss: 'minimal',
		webgpu_optimized: true,
		pro_feature: true,
		desktop_only: true
	}
];

// Transformers.js library information
const TRANSFORMERS_INFO = {
	package: '@xenova/transformers',
	version: 'latest',
	cdn_url: 'https://cdn.jsdelivr.net/npm/@xenova/transformers',
	documentation: 'https://huggingface.co/docs/transformers.js'
};

// Create stores for the registry data
export const modelRegistry = writable({
	models: DEFAULT_MODELS,
	transformersInfo: TRANSFORMERS_INFO,
	lastUpdated: Date.now(),
	initialized: false
});

// Create a derived store for the currently selected model
export const selectedModel = derived(
	[modelRegistry, userPreferences],
	([$modelRegistry, $userPreferences]) => {
		const modelId = $userPreferences.whisperModel || 'tiny';
		return $modelRegistry.models.find((model) => model.id === modelId) || $modelRegistry.models[0];
	}
);

/**
 * Initialize the model registry
 */
export async function initializeModelRegistry() {
	// Skip if already initialized or not in browser
	if (get(modelRegistry).initialized || !browser) {
		return get(modelRegistry);
	}

	// For transformers.js, we use the default models
	modelRegistry.update((registry) => ({
		...registry,
		lastUpdated: Date.now(),
		initialized: true
	}));

	return get(modelRegistry);
}

/**
 * Check if the registry needs to be updated
 */
export async function checkForRegistryUpdates() {
	if (!browser) return false;

	// For transformers.js, updates are handled automatically by the library
	modelRegistry.update((reg) => ({
		...reg,
		lastUpdated: Date.now()
	}));

	return false;
}

/**
 * Get the transformers.js model ID for a given model
 */
export function getModelInfo(modelId = 'tiny') {
	const registry = get(modelRegistry);
	const model = registry.models.find((m) => m.id === modelId) || registry.models[0];

	if (!model) {
		console.warn(`Model ${modelId} not found in registry, using first available model`);
		return getModelInfo(registry.models[0].id);
	}

	return {
		id: model.transformers_id,
		size: model.size,
		name: model.name,
		description: model.description,
		recommendedFor: model.recommended_for
	};
}

/**
 * Select a model for use
 */
export function selectModel(modelId) {
	const registry = get(modelRegistry);
	const validModel = registry.models.find((m) => m.id === modelId);

	if (validModel) {
		// Update user preferences
		userPreferences.update((prefs) => ({
			...prefs,
			whisperModel: modelId
		}));

		return true;
	}

	return false;
}

/**
 * Get all available models
 */
export function getAvailableModels() {
	return get(modelRegistry).models;
}

/**
 * Get the currently selected model
 */
export function getCurrentModel() {
	return get(selectedModel);
}

/**
 * Get transformers.js library information
 */
export function getTransformersInfo() {
	return get(modelRegistry).transformersInfo;
}

/**
 * Auto-select the best model based on device capabilities
 */
export function autoSelectModel() {
	if (!browser) return 'tiny';

	const device = detectDeviceCapabilities();
	console.log('🔍 Device capabilities detected:', device);

	// Check if user has manually selected a model
	const prefs = get(userPreferences);
	if (prefs.modelManuallySelected) {
		console.log('📌 Using user-selected model:', prefs.whisperModel);
		return prefs.whisperModel;
	}

	// Use device recommendation
	const recommendedId = device.recommendedModel;
	console.log(`🎯 Auto-selecting model: ${recommendedId} (${device.reason})`);

	// Update preferences with auto-selected model
	userPreferences.update((p) => ({
		...p,
		whisperModel: recommendedId,
		modelAutoSelected: true
	}));

	return recommendedId;
}

/**
 * Get progressive loading strategy for current device
 */
export function getProgressiveLoadingStrategy() {
	if (!browser) {
		return {
			initial: 'tiny',
			target: 'small',
			fallback: 'tiny'
		};
	}

	const device = detectDeviceCapabilities();
	return device.loadingStrategy;
}

// Initialize on import if in browser
if (browser) {
	initializeModelRegistry();
	// Auto-select best model on load
	autoSelectModel();
}
