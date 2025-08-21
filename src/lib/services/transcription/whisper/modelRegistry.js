/**
 * Model Registry - Configuration service for Whisper models
 * Adapted from ziplist for TalkType's transcription needs
 */

import { writable, get, derived } from 'svelte/store';
import { userPreferences } from '../../infrastructure/stores';
import { browser } from '$app/environment';

// Default model collection for Transformers.js
const DEFAULT_MODELS = [
	{
		id: 'tiny',
		transformers_id: 'Xenova/whisper-tiny.en',
		name: 'Tiny (English)',
		description: 'Fast, compact model for basic transcription',
		size: 39 * 1024 * 1024, // ~39MB
		parameters: 39000000,
		languages: ['en'],
		version: '1.0.0',
		recommended_for: 'mobile, low-memory devices'
	},
	{
		id: 'base',
		transformers_id: 'Xenova/whisper-base.en',
		name: 'Base (English)',
		description: 'Better accuracy with reasonable size',
		size: 74 * 1024 * 1024, // ~74MB
		parameters: 74000000,
		languages: ['en'],
		version: '1.0.0',
		recommended_for: 'desktop, balanced performance'
	},
	{
		id: 'small',
		transformers_id: 'Xenova/whisper-small.en',
		name: 'Small (English)',
		description: 'High accuracy for desktop devices',
		size: 244 * 1024 * 1024, // ~244MB
		parameters: 244000000,
		languages: ['en'],
		version: '1.0.0',
		recommended_for: 'desktop, high accuracy needs'
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

// Initialize on import if in browser
if (browser) {
	initializeModelRegistry();
}
