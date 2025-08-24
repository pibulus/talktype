/**
 * Model Registry - Configuration service for Whisper models
 * Adapted from ziplist for TalkType's transcription needs
 */

import { writable, get, derived } from 'svelte/store';
import { userPreferences } from '../../infrastructure/stores';
import { browser } from '$app/environment';
import { detectDeviceCapabilities } from '../deviceCapabilities';

// Default model collection for Transformers.js
// Progressive loading strategy: tiny → optimal based on device capabilities
const DEFAULT_MODELS = [
	{
		id: 'tiny',
		transformers_id: 'Xenova/whisper-tiny.en', // Using proven Xenova model for initial load
		name: 'Tiny English (39MB)',
		description: 'Instant loading, great for quick start',
		size: 39 * 1024 * 1024, // ~39MB
		parameters: 39000000,
		languages: ['en'],
		version: '1.0.0',
		recommended_for: 'initial load, instant start, low-end devices',
		speed_multiplier: 1.0,
		accuracy_loss: 'baseline'
	},
	{
		id: 'distil-small',
		transformers_id: 'distil-whisper/distil-small.en', // Official distil-whisper
		name: 'Distil Small (166MB)',
		description: '5.8x faster than Whisper v2',
		size: 166 * 1024 * 1024, // ~166MB
		parameters: 166000000,
		languages: ['en'],
		version: '1.0.0',
		recommended_for: 'devices with <4GB RAM, mobile phones',
		speed_multiplier: 5.8,
		accuracy_loss: '3.2% WER increase'
	},
	{
		id: 'distil-medium',
		transformers_id: 'distil-whisper/distil-medium.en', // Official distil-whisper
		name: 'Distil Medium (394MB)',
		description: '6.8x faster with <1% WER loss',
		size: 394 * 1024 * 1024, // ~394MB
		parameters: 394000000,
		languages: ['en'],
		version: '1.0.0',
		recommended_for: 'devices with 4-8GB RAM, default choice',
		speed_multiplier: 6.8,
		accuracy_loss: '0.8% WER increase'
	},
	{
		id: 'distil-large-v2',
		transformers_id: 'distil-whisper/distil-large-v2', // Most proven distil model
		name: 'Distil Large v2 (756MB)',
		description: '5.8x faster, within 1% WER',
		size: 756 * 1024 * 1024, // ~756MB
		parameters: 756000000,
		languages: ['en'],
		version: '2.0.0',
		recommended_for: 'high-end devices, pro users',
		speed_multiplier: 5.8,
		accuracy_loss: '<1% WER',
		webgpu_optimized: true
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
	if (!browser) return 'distil-tiny';

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
			target: 'distil-medium',
			fallback: 'distil-small'
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
