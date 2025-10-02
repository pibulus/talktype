/**
 * Model Registry - Configuration service for Whisper models
 * Adapted from ziplist for TalkType's transcription needs
 */

import { writable, get, derived } from 'svelte/store';
import { userPreferences } from '../../infrastructure/stores';
import { browser } from '$app/environment';
import { detectDeviceCapabilities } from '../deviceCapabilities';

// Default model collection for Transformers.js - Optimized for speed & quality
// Progressive loading strategy: tiny → optimal based on device capabilities
const DEFAULT_MODELS = [
	{
		id: 'tiny',
		transformers_id: 'Xenova/whisper-tiny.en', // Actual Xenova model that works
		name: 'Tiny English (39MB)',
		description: 'Ultra-fast, instant loading',
		size: 39 * 1024 * 1024, // ~39MB
		parameters: 39000000,
		languages: ['en'],
		version: '1.0.0',
		recommended_for: 'initial load, instant start, all devices',
		speed_multiplier: 1.0,
		accuracy_loss: 'baseline'
	},
	{
		id: 'small',
		transformers_id: 'Xenova/whisper-small.en', // Small English model for speed
		name: 'Small English (166MB)',
		description: 'Fast with good accuracy',
		size: 166 * 1024 * 1024, // ~166MB
		parameters: 244000000,
		languages: ['en'],
		version: '1.0.0',
		recommended_for: 'devices with <3GB RAM, mobile phones',
		speed_multiplier: 1.0,
		accuracy_loss: 'minimal'
	},
	{
		id: 'medium',
		transformers_id: 'Xenova/whisper-medium.en', // Medium English for balance
		name: 'Medium English (488MB)',
		description: 'Perfect accuracy/speed balance',
		size: 488 * 1024 * 1024, // ~488MB
		parameters: 769000000,
		languages: ['en'],
		version: '1.0.0',
		recommended_for: 'devices with ≥3GB RAM, default choice',
		speed_multiplier: 1.0,
		accuracy_loss: 'minimal'
	},
	{
		id: 'large',
		transformers_id: 'Xenova/whisper-large-v3', // Latest v3 multilingual
		name: 'Large Pro (1.5GB)',
		description: '99 languages, maximum accuracy',
		size: 1500 * 1024 * 1024, // ~1.5GB
		parameters: 1550000000,
		languages: ['multi'], // 99 languages!
		version: '3.0.0',
		recommended_for: 'Pro users, multilingual needs',
		speed_multiplier: 1.0,
		accuracy_loss: 'none',
		webgpu_optimized: true,
		pro_feature: true
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
