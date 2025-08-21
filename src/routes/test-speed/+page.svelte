<script>
  import { onMount } from 'svelte';
  import { whisperServiceFast } from '$lib/services/transcription/whisper/whisperServiceFast';
  import { downloadStatus } from '$lib/services/transcription/whisper/modelDownloader';
  import { formatBytes, formatETA } from '$lib/services/transcription/whisper/modelDownloader';
  
  let isLoading = false;
  let downloadComplete = false;
  let error = null;
  let startTime = null;
  let endTime = null;
  let totalTime = null;
  
  // Subscribe to download status
  let currentStatus = {};
  downloadStatus.subscribe(status => {
    currentStatus = status;
  });
  
  async function testDownload() {
    isLoading = true;
    downloadComplete = false;
    error = null;
    startTime = Date.now();
    
    try {
      console.log('🚀 Starting HYPERSPEED download test...');
      const result = await whisperServiceFast.preloadModel();
      
      if (result.success) {
        endTime = Date.now();
        totalTime = ((endTime - startTime) / 1000).toFixed(2);
        downloadComplete = true;
        console.log(`✨ Download complete in ${totalTime} seconds!`);
      } else {
        error = result.error?.message || 'Download failed';
      }
    } catch (err) {
      error = err.message;
      console.error('Download test failed:', err);
    } finally {
      isLoading = false;
    }
  }
  
  function getSpeedClass(speed) {
    if (!speed) return '';
    const mbps = speed / (1024 * 1024);
    if (mbps > 5) return 'text-green-500';
    if (mbps > 2) return 'text-yellow-500';
    return 'text-red-500';
  }
  
  onMount(() => {
    // Auto-start test for demo
    // testDownload();
  });
</script>

<div class="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 p-8">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-6xl font-bold text-white mb-2">
      🚀 HYPERSPEED Download Test
    </h1>
    <p class="text-2xl text-pink-200 mb-8">
      Testing our 10x faster model downloads with jsDelivr CDN + Parallel Chunks
    </p>
    
    <div class="bg-black/30 backdrop-blur-md rounded-3xl p-8 border-4 border-white/20">
      {#if !isLoading && !downloadComplete}
        <button
          on:click={testDownload}
          class="w-full py-6 px-8 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-2xl rounded-2xl transform transition-all hover:scale-105 active:scale-95"
        >
          Start HYPERSPEED Download Test
        </button>
        
        <div class="mt-6 text-white/80">
          <h3 class="text-xl font-bold mb-2">What's New:</h3>
          <ul class="space-y-2">
            <li class="flex items-center">
              <span class="text-2xl mr-3">🌍</span>
              <span>jsDelivr CDN - 100+ global edge locations</span>
            </li>
            <li class="flex items-center">
              <span class="text-2xl mr-3">⚡</span>
              <span>Parallel chunk downloads - 4x concurrent streams</span>
            </li>
            <li class="flex items-center">
              <span class="text-2xl mr-3">📻</span>
              <span>Tab sharing - Instant load if another tab has it</span>
            </li>
            <li class="flex items-center">
              <span class="text-2xl mr-3">🗜️</span>
              <span>Brotli compression - 30% smaller files</span>
            </li>
          </ul>
        </div>
      {/if}
      
      {#if isLoading}
        <div class="space-y-6">
          <div class="flex justify-between items-center">
            <h2 class="text-3xl font-bold text-white">
              {currentStatus.stage === 'downloading' ? '📥 Downloading Model' : 
               currentStatus.stage === 'loading' ? '🔧 Loading Model' :
               currentStatus.stage === 'ready' ? '✨ Almost Ready!' :
               '🚀 Initializing...'}
            </h2>
            <span class="text-2xl font-mono text-pink-300">
              {currentStatus.progress}%
            </span>
          </div>
          
          <!-- Progress Bar -->
          <div class="relative h-8 bg-black/50 rounded-full overflow-hidden border-2 border-white/30">
            <div 
              class="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-300"
              style="width: {currentStatus.progress}%"
            >
              <div class="h-full bg-white/20 animate-pulse"></div>
            </div>
          </div>
          
          <!-- Stats -->
          <div class="grid grid-cols-2 gap-4 text-white">
            <div class="bg-white/10 rounded-xl p-4">
              <div class="text-sm opacity-70">Download Speed</div>
              <div class="text-2xl font-bold {getSpeedClass(currentStatus.speed)}">
                {currentStatus.speed ? formatBytes(currentStatus.speed) + '/s' : 'Calculating...'}
              </div>
            </div>
            <div class="bg-white/10 rounded-xl p-4">
              <div class="text-sm opacity-70">Time Remaining</div>
              <div class="text-2xl font-bold text-yellow-300">
                {formatETA(currentStatus.eta)}
              </div>
            </div>
            <div class="bg-white/10 rounded-xl p-4">
              <div class="text-sm opacity-70">Downloaded</div>
              <div class="text-2xl font-bold">
                {formatBytes(currentStatus.bytesLoaded)}
              </div>
            </div>
            <div class="bg-white/10 rounded-xl p-4">
              <div class="text-sm opacity-70">Total Size</div>
              <div class="text-2xl font-bold">
                {formatBytes(currentStatus.bytesTotal)}
              </div>
            </div>
          </div>
        </div>
      {/if}
      
      {#if downloadComplete}
        <div class="text-center space-y-6">
          <div class="text-6xl animate-bounce">🎉</div>
          <h2 class="text-4xl font-bold text-white">
            Download Complete!
          </h2>
          <div class="text-2xl text-green-400 font-mono">
            Total Time: {totalTime} seconds
          </div>
          
          <div class="bg-green-500/20 border-2 border-green-500 rounded-xl p-6 text-white">
            <p class="text-xl mb-2">
              {#if totalTime < 5}
                🚀 BLAZING FAST! That's what we're talking about!
              {:else if totalTime < 10}
                ⚡ Great speed! Much faster than before!
              {:else if totalTime < 20}
                ✅ Good performance! CDN is working well.
              {:else}
                📊 Download complete. Consider testing with better connection.
              {/if}
            </p>
            <p class="text-sm opacity-80">
              Model is now cached and ready for instant transcription
            </p>
          </div>
          
          <button
            on:click={() => {
              downloadComplete = false;
              error = null;
              totalTime = null;
            }}
            class="py-4 px-8 bg-white/20 hover:bg-white/30 text-white font-bold text-xl rounded-xl transition-all"
          >
            Test Again
          </button>
        </div>
      {/if}
      
      {#if error}
        <div class="bg-red-500/20 border-2 border-red-500 rounded-xl p-6">
          <h3 class="text-2xl font-bold text-red-400 mb-2">Error</h3>
          <p class="text-white">{error}</p>
          <button
            on:click={() => {
              error = null;
              testDownload();
            }}
            class="mt-4 py-2 px-6 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg"
          >
            Retry
          </button>
        </div>
      {/if}
    </div>
    
    <!-- Network Throttling Instructions -->
    <div class="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-white/80">
      <h3 class="text-xl font-bold mb-3">📊 Testing Instructions:</h3>
      <ol class="list-decimal list-inside space-y-2">
        <li>Open Chrome DevTools (F12)</li>
        <li>Go to Network tab</li>
        <li>Click throttling dropdown (usually says "No throttling")</li>
        <li>Select "Fast 3G" or "Slow 3G" to simulate slower connections</li>
        <li>Click "Start HYPERSPEED Download Test" above</li>
        <li>Compare with old implementation (30-40 seconds)</li>
      </ol>
      
      <div class="mt-4 p-4 bg-yellow-500/20 rounded-xl border-2 border-yellow-500">
        <p class="font-bold">⚡ Expected Results:</p>
        <ul class="mt-2 space-y-1">
          <li>• Normal connection: &lt;3 seconds</li>
          <li>• Fast 3G: &lt;10 seconds</li>
          <li>• Slow 3G: &lt;20 seconds</li>
          <li>• Old implementation: 30-40+ seconds</li>
        </ul>
      </div>
    </div>
  </div>
</div>