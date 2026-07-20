/**
 * Model Registry - Configuration service for Whisper models
 * Adapted from ziplist for TalkType's transcription needs
 */

import { writable, get, derived } from 'svelte/store';
import { userPreferences } from '../../infrastructure/stores';
import { browser } from '$app/environment';
import { detectDeviceCapabilities, detectBestModel } from '../deviceCapabilities';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('ModelRegistry');

// Default model collection - Using Distil-Whisper for 5.6x faster performance
// Based on latest research (Oct 2025): distil-whisper models are production-ready
const DEFAULT_MODELS = [
	{
		id: 'tiny',
		// onnx-community modern export — the old Xenova/whisper-tiny.en (2023 q8)
		// is rejected by the ort 1.26-dev bundled in transformers.js 4.x on newest
		// Chromium ("Missing required scale ... TransposeDQWeightsForMatMulNBits").
		// Same source family as distil-small, which never hit that error.
		transformers_id: 'onnx-community/whisper-tiny.en',
		name: 'Tiny English (96MB)',
		description: 'Mobile-optimized, iOS compatible',
		size: 96 * 1024 * 1024, // encoder_q4 (~9MB) + decoder_merged_q4 (~87MB)
		parameters: 39000000,
		languages: ['en'],
		version: '2.0.0',
		recommended_for: 'iOS Safari, low-memory devices',
		speed_multiplier: 1.0,
		accuracy_loss: '~20% vs distil-small',
		mobile_safe: true,
		// WASM + q4 — maps to the *_q4.onnx files, which use MatMulNBits natively.
		// Both q8 layouts (Xenova AND onnx-community *_quantized.onnx) are rejected
		// by modern ort's DQ→MatMulNBits graph transform ("Missing required scale"),
		// so q8 is a dead end for tiny — don't go back to it.
		device: 'wasm',
		dtype: 'q4'
	},
	{
		id: 'small',
		transformers_id: 'onnx-community/distil-small.en', // v4-native ONNX export (desktop quality upgrade)
		name: 'Distil-Small English',
		description: 'Better accuracy, WebGPU-accelerated on capable desktops',
		size: 251 * 1024 * 1024, // encoder_q4 (~66MB) + decoder_merged_q4 (~185MB)
		parameters: 166000000,
		languages: ['en'],
		version: '3.0.0',
		recommended_for: 'Desktop with WebGPU',
		speed_multiplier: 5.6,
		accuracy_loss: '4% vs Whisper Large',
		desktop_optimized: true,
		// Desktop upgrade runs on WebGPU. q4 (MatMulNBits) cuts the download from
		// fp32's ~665MB to ~251MB. fp16 is a dead end: the onnx-community fp16
		// export triggers a graph validation error ("Subgraph output (logits) is
		// an outer scope value being returned directly") with the ort 1.26.0-dev
		// bundled in transformers.js 4.x.
		device: 'webgpu',
		dtype: 'q4'
	}
];

// Transformers.js library information
const TRANSFORMERS_INFO = {
	package: '@huggingface/transformers',
	version: 'latest',
	cdn_url: 'https://cdn.jsdelivr.net/npm/@huggingface/transformers',
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
		log.warn(`Model ${modelId} not found in registry, using first available model`);
		return getModelInfo(registry.models[0].id);
	}

	return {
		id: model.transformers_id,
		size: model.size,
		name: model.name,
		description: model.description,
		recommendedFor: model.recommended_for,
		device: model.device || 'wasm',
		dtype: model.dtype || 'fp32',
		languages: model.languages || ['en']
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
 * Auto-select the best model for this device. Async because a true WebGPU check
 * (requestAdapter) is async. Respects a manual user choice. Desktop + working
 * WebGPU + ≥8GB upgrades to 'small'; everything else stays on 'tiny'.
 * @returns {Promise<'tiny'|'small'>}
 */
export async function autoSelectModel() {
	if (!browser) return 'tiny';

	// Never override an explicit user choice.
	const prefs = get(userPreferences);
	if (prefs.modelManuallySelected) {
		log.log('Using user-selected model:', prefs.whisperModel);
		return prefs.whisperModel;
	}

	const { model, reason } = await detectBestModel();
	log.log(`Auto-selecting model: ${model} (${reason})`);

	userPreferences.update((p) => ({
		...p,
		whisperModel: model,
		modelAutoSelected: true
	}));

	return model;
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
