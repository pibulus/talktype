/**
 * Enhanced Model Registry - Distil-Whisper + WebGPU models
 * Next-gen models for 2025 with 6x speed and 50% smaller size
 */

import { writable, get, derived } from "svelte/store";
import { userPreferences } from "../../infrastructure/stores";
import { browser } from "$app/environment";

// Enhanced model collection with Distil-Whisper and quantized options
const ENHANCED_MODELS = [
  // === INSTANT TIER (< 5 seconds download) ===
  {
    id: "distil-tiny",
    transformers_id: "onnx-community/distil-whisper-tiny.en",
    name: "Distil Tiny (Fastest)",
    description: "6x faster than regular Tiny, instant downloads",
    size: 20 * 1024 * 1024, // ~20MB
    parameters: 20000000,
    languages: ["en"],
    version: "2.0.0",
    speed_multiplier: 6,
    accuracy: 0.94, // 94% of original accuracy
    webgpu_optimized: true,
    recommended_for: "quick notes, real-time transcription",
    download_time_estimate: "2-3 seconds",
  },
  {
    id: "tiny-q8",
    transformers_id: "Xenova/whisper-tiny.en",
    name: "Tiny Quantized (Smallest)",
    description: "Ultra-light quantized model for instant loading",
    size: 10 * 1024 * 1024, // ~10MB with q8 quantization
    parameters: 39000000,
    languages: ["en"],
    version: "1.0.0",
    quantization: "q8",
    webgpu_optimized: true,
    recommended_for: "mobile, low bandwidth, quick drafts",
    download_time_estimate: "1-2 seconds",
  },
  
  // === BALANCED TIER (5-10 seconds download) ===
  {
    id: "distil-small",
    transformers_id: "onnx-community/distil-whisper-small.en",
    name: "Distil Small (Recommended)",
    description: "Best balance: 6x faster, great quality, small size",
    size: 83 * 1024 * 1024, // ~83MB
    parameters: 83000000,
    languages: ["en"],
    version: "2.0.0",
    speed_multiplier: 6,
    accuracy: 0.96, // 96% of original accuracy
    webgpu_optimized: true,
    recommended_for: "daily use, meetings, general transcription",
    download_time_estimate: "5-8 seconds",
    badge: "BEST VALUE",
  },
  {
    id: "base",
    transformers_id: "Xenova/whisper-base.en",
    name: "Base (Classic)",
    description: "Original Whisper base model, good accuracy",
    size: 74 * 1024 * 1024, // ~74MB
    parameters: 74000000,
    languages: ["en"],
    version: "1.0.0",
    webgpu_optimized: true,
    recommended_for: "standard transcription, proven reliability",
    download_time_estimate: "5-8 seconds",
  },
  
  // === QUALITY TIER (10-20 seconds download) ===
  {
    id: "distil-medium",
    transformers_id: "onnx-community/distil-whisper-medium.en",
    name: "Distil Medium (High Quality)",
    description: "Excellent accuracy with faster processing",
    size: 166 * 1024 * 1024, // ~166MB
    parameters: 166000000,
    languages: ["en"],
    version: "2.0.0",
    speed_multiplier: 6,
    accuracy: 0.98, // 98% of original accuracy
    webgpu_optimized: true,
    recommended_for: "professional use, accuracy-critical tasks",
    download_time_estimate: "10-15 seconds",
  },
  {
    id: "small",
    transformers_id: "Xenova/whisper-small.en",
    name: "Small (High Accuracy)",
    description: "Original high accuracy model for quality focus",
    size: 244 * 1024 * 1024, // ~244MB
    parameters: 244000000,
    languages: ["en"],
    version: "1.0.0",
    webgpu_optimized: false,
    recommended_for: "content creation, subtitles, archival",
    download_time_estimate: "15-20 seconds",
  },
  
  // === PRO TIER (20+ seconds download, WebGPU recommended) ===
  {
    id: "distil-large-v3",
    transformers_id: "onnx-community/distil-whisper-large-v3",
    name: "Distil Large V3 (Pro)",
    description: "Latest and greatest: 6x faster than Whisper Large V3",
    size: 750 * 1024 * 1024, // ~750MB
    parameters: 750000000,
    languages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "zh"],
    version: "3.0.0",
    speed_multiplier: 6.3,
    accuracy: 0.99, // Within 1% of Large V3
    webgpu_required: true,
    recommended_for: "studio quality, multi-language, broadcast",
    download_time_estimate: "30-60 seconds",
    badge: "PRO",
  },
  {
    id: "large-v3-turbo",
    transformers_id: "onnx-community/whisper-large-v3-turbo",
    name: "Large V3 Turbo (Ultimate)",
    description: "Optimized Large V3 with turbo processing",
    size: 800 * 1024 * 1024, // ~800MB
    parameters: 1550000000,
    languages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "zh", "ar", "hi"],
    version: "3.0.0",
    webgpu_required: true,
    recommended_for: "maximum quality, research, production",
    download_time_estimate: "45-90 seconds",
    badge: "ULTIMATE",
  },
];

// WebGPU capability detection
export async function checkWebGPUSupport() {
  if (!browser) return false;
  
  try {
    if (!navigator.gpu) {
      return { supported: false, reason: "WebGPU not available in browser" };
    }
    
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return { supported: false, reason: "No GPU adapter found" };
    }
    
    const device = await adapter.requestDevice();
    if (!device) {
      return { supported: false, reason: "Could not access GPU device" };
    }
    
    return {
      supported: true,
      adapter: adapter.name || "Unknown GPU",
      features: Array.from(adapter.features || []),
      limits: adapter.limits,
    };
  } catch (error) {
    return {
      supported: false,
      reason: error.message || "WebGPU initialization failed",
    };
  }
}

// Model recommendation based on device capabilities
export async function getRecommendedModel() {
  if (!browser) {
    return ENHANCED_MODELS.find(m => m.id === "distil-small");
  }
  
  // Check WebGPU support
  const webgpu = await checkWebGPUSupport();
  
  // Check device memory
  const memory = navigator.deviceMemory || 4;
  
  // Check connection speed
  const connection = navigator.connection;
  const isSlowConnection = connection?.effectiveType === "2g" || 
                           connection?.effectiveType === "slow-2g";
  
  // Make recommendation
  if (webgpu.supported && memory >= 8) {
    // High-end device with WebGPU
    return ENHANCED_MODELS.find(m => m.id === "distil-large-v3");
  } else if (webgpu.supported && memory >= 4) {
    // Mid-range device with WebGPU
    return ENHANCED_MODELS.find(m => m.id === "distil-medium");
  } else if (memory >= 4) {
    // Decent device without WebGPU
    return ENHANCED_MODELS.find(m => m.id === "distil-small");
  } else if (isSlowConnection || memory < 2) {
    // Low-end device or slow connection
    return ENHANCED_MODELS.find(m => m.id === "tiny-q8");
  } else {
    // Default recommendation
    return ENHANCED_MODELS.find(m => m.id === "distil-small");
  }
}

// Create stores for the enhanced registry
export const enhancedModelRegistry = writable({
  models: ENHANCED_MODELS,
  webgpu: null,
  recommendation: null,
  lastUpdated: Date.now(),
  initialized: false,
});

// Create a derived store for the currently selected model
export const selectedEnhancedModel = derived(
  [enhancedModelRegistry, userPreferences],
  ([$registry, $preferences]) => {
    const modelId = $preferences.whisperModel || "distil-small";
    return (
      $registry.models.find((model) => model.id === modelId) ||
      $registry.models.find((model) => model.id === "distil-small")
    );
  },
);

/**
 * Initialize the enhanced model registry
 */
export async function initializeEnhancedRegistry() {
  if (!browser) return get(enhancedModelRegistry);
  
  // Check capabilities
  const webgpu = await checkWebGPUSupport();
  const recommendation = await getRecommendedModel();
  
  // Update registry
  enhancedModelRegistry.update((registry) => ({
    ...registry,
    webgpu,
    recommendation,
    lastUpdated: Date.now(),
    initialized: true,
  }));
  
  return get(enhancedModelRegistry);
}

/**
 * Get model by tier
 */
export function getModelsByTier(tier) {
  const tiers = {
    instant: ["distil-tiny", "tiny-q8"],
    balanced: ["distil-small", "base"],
    quality: ["distil-medium", "small"],
    pro: ["distil-large-v3", "large-v3-turbo"],
  };
  
  const tierIds = tiers[tier] || [];
  return ENHANCED_MODELS.filter(m => tierIds.includes(m.id));
}

/**
 * Format download time estimate
 */
export function formatDownloadTime(seconds) {
  if (seconds < 5) return "Instant";
  if (seconds < 10) return "Fast (~10s)";
  if (seconds < 30) return "Medium (~30s)";
  if (seconds < 60) return "Slow (~1min)";
  return "Very slow (1min+)";
}

/**
 * Get model statistics
 */
export function getModelStats(modelId) {
  const model = ENHANCED_MODELS.find(m => m.id === modelId);
  if (!model) return null;
  
  return {
    ...model,
    sizeFormatted: `${Math.round(model.size / (1024 * 1024))}MB`,
    speedBoost: model.speed_multiplier ? `${model.speed_multiplier}x faster` : "Standard",
    accuracyPercent: model.accuracy ? `${Math.round(model.accuracy * 100)}%` : "100%",
    requiresWebGPU: model.webgpu_required || false,
    supportsWebGPU: model.webgpu_optimized || false,
  };
}

// Initialize on import if in browser
if (browser) {
  initializeEnhancedRegistry();
}