<script>
  import { onMount } from 'svelte';
  import { whisperServiceUltimate, ultimateWhisperStatus } from '$lib/services/transcription/whisper/whisperServiceUltimate';
  import { 
    enhancedModelRegistry, 
    getModelsByTier,
    checkWebGPUSupport 
  } from '$lib/services/transcription/whisper/modelRegistryEnhanced';
  import { downloadStatus } from '$lib/services/transcription/whisper/modelDownloader';
  
  let selectedTier = 'balanced';
  let selectedModelId = 'distil-small';
  let isLoading = false;
  let webgpuSupported = false;
  let currentModel = null;
  
  const tiers = {
    instant: {
      name: 'Instant',
      description: 'Ultra-fast downloads, basic quality',
      icon: '⚡',
      color: 'from-blue-500 to-cyan-500'
    },
    balanced: {
      name: 'Balanced',
      description: 'Best value: Fast & accurate',
      icon: '⚖️',
      color: 'from-purple-500 to-pink-500'
    },
    quality: {
      name: 'Quality',
      description: 'High accuracy for important work',
      icon: '✨',
      color: 'from-orange-500 to-red-500'
    },
    pro: {
      name: 'Pro',
      description: 'Studio quality, multi-language',
      icon: '🎬',
      color: 'from-green-500 to-emerald-500'
    }
  };
  
  $: tierModels = getModelsByTier(selectedTier);
  $: currentStatus = $ultimateWhisperStatus;
  $: downloadProgress = $downloadStatus;
  
  onMount(async () => {
    // Check WebGPU support
    const support = await checkWebGPUSupport();
    webgpuSupported = support.supported;
    
    // Get current model
    currentModel = currentStatus.selectedModel;
    
    // Find which tier the current model belongs to
    for (const [tier, info] of Object.entries(tiers)) {
      const models = getModelsByTier(tier);
      if (models.some(m => m.id === currentModel)) {
        selectedTier = tier;
        selectedModelId = currentModel;
        break;
      }
    }
  });
  
  async function selectModel(modelId) {
    selectedModelId = modelId;
    isLoading = true;
    
    try {
      await whisperServiceUltimate.switchModel(modelId);
      currentModel = modelId;
    } catch (error) {
      console.error('Failed to switch model:', error);
    } finally {
      isLoading = false;
    }
  }
  
  function formatSize(bytes) {
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  }
  
  function getModelStatus(modelId) {
    if (currentModel === modelId && currentStatus.isLoaded) {
      return 'active';
    }
    if (downloadProgress.modelId === modelId && downloadProgress.inProgress) {
      return 'downloading';
    }
    return 'available';
  }
</script>

<div class="w-full max-w-4xl mx-auto p-6">
  <div class="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-lg rounded-3xl p-8 border-2 border-white/20">
    <h2 class="text-3xl font-bold text-white mb-2">
      🎯 Transcription Model
    </h2>
    <p class="text-white/80 mb-6">
      Choose your speed vs quality preference
    </p>
    
    <!-- WebGPU Status -->
    {#if webgpuSupported}
      <div class="bg-green-500/20 border border-green-500 rounded-xl p-3 mb-6">
        <span class="text-green-400 font-bold">✅ WebGPU Enabled</span>
        <span class="text-white/80 ml-2">10-100x faster processing!</span>
      </div>
    {:else}
      <div class="bg-yellow-500/20 border border-yellow-500 rounded-xl p-3 mb-6">
        <span class="text-yellow-400 font-bold">⚠️ WebGPU Not Available</span>
        <span class="text-white/80 ml-2">Using CPU (still fast!)</span>
      </div>
    {/if}
    
    <!-- Tier Selector -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      {#each Object.entries(tiers) as [tier, info]}
        <button
          on:click={() => selectedTier = tier}
          class="relative p-4 rounded-xl transition-all transform hover:scale-105 {
            selectedTier === tier 
              ? 'bg-gradient-to-br ' + info.color + ' text-white shadow-lg scale-105' 
              : 'bg-white/10 hover:bg-white/20 text-white/80'
          }"
        >
          <div class="text-2xl mb-1">{info.icon}</div>
          <div class="font-bold">{info.name}</div>
          <div class="text-xs opacity-80">{info.description}</div>
        </button>
      {/each}
    </div>
    
    <!-- Model List -->
    <div class="space-y-3">
      {#each tierModels as model}
        {@const status = getModelStatus(model.id)}
        <button
          on:click={() => selectModel(model.id)}
          disabled={status === 'downloading' || isLoading}
          class="w-full p-4 rounded-xl transition-all text-left {
            status === 'active' 
              ? 'bg-gradient-to-r from-green-500/30 to-emerald-500/30 border-2 border-green-500' 
              : status === 'downloading'
              ? 'bg-yellow-500/20 border-2 border-yellow-500 animate-pulse'
              : 'bg-white/10 hover:bg-white/20 border-2 border-white/20'
          }"
        >
          <div class="flex justify-between items-start mb-2">
            <div>
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                {model.name}
                {#if model.badge}
                  <span class="px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full">
                    {model.badge}
                  </span>
                {/if}
                {#if status === 'active'}
                  <span class="text-green-400">✓ Active</span>
                {/if}
              </h3>
              <p class="text-white/70 text-sm">{model.description}</p>
            </div>
            <div class="text-right">
              <div class="text-white/90 font-mono">{formatSize(model.size)}</div>
              <div class="text-white/60 text-xs">{model.download_time_estimate}</div>
            </div>
          </div>
          
          <!-- Features -->
          <div class="flex flex-wrap gap-2 mb-2">
            {#if model.speed_multiplier}
              <span class="px-2 py-1 bg-blue-500/30 text-blue-300 text-xs rounded-lg">
                {model.speed_multiplier}x faster
              </span>
            {/if}
            {#if model.accuracy}
              <span class="px-2 py-1 bg-green-500/30 text-green-300 text-xs rounded-lg">
                {Math.round(model.accuracy * 100)}% accuracy
              </span>
            {/if}
            {#if model.webgpu_optimized}
              <span class="px-2 py-1 bg-purple-500/30 text-purple-300 text-xs rounded-lg">
                GPU optimized
              </span>
            {/if}
            {#if model.quantization}
              <span class="px-2 py-1 bg-orange-500/30 text-orange-300 text-xs rounded-lg">
                {model.quantization} quantized
              </span>
            {/if}
            {#if model.languages.length > 1}
              <span class="px-2 py-1 bg-pink-500/30 text-pink-300 text-xs rounded-lg">
                {model.languages.length} languages
              </span>
            {/if}
          </div>
          
          <!-- Recommended for -->
          <div class="text-white/60 text-xs">
            Best for: {model.recommended_for}
          </div>
          
          <!-- Download progress if downloading -->
          {#if status === 'downloading'}
            <div class="mt-3">
              <div class="flex justify-between text-xs text-yellow-300 mb-1">
                <span>Downloading...</span>
                <span>{downloadProgress.progress}%</span>
              </div>
              <div class="h-2 bg-black/30 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all"
                  style="width: {downloadProgress.progress}%"
                ></div>
              </div>
            </div>
          {/if}
        </button>
      {/each}
    </div>
    
    <!-- Info Box -->
    <div class="mt-6 p-4 bg-white/10 rounded-xl">
      <h4 class="text-white font-bold mb-2">💡 Pro Tips</h4>
      <ul class="text-white/70 text-sm space-y-1">
        <li>• Distil models are 6x faster with nearly identical quality</li>
        <li>• WebGPU makes transcription 10-100x faster (Chrome/Edge)</li>
        <li>• Models are cached - download once, use forever</li>
        <li>• Switch models anytime based on your needs</li>
      </ul>
    </div>
  </div>
</div>