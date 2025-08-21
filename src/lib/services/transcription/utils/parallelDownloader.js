/**
 * Parallel Downloader - Hyperspeed model downloads with chunked parallel fetching
 * Implements the 80/20 approach for 3-10x faster downloads
 */

/**
 * Download a file using parallel chunk requests for massive speed boost
 * @param {string} url - URL to download from
 * @param {function} onProgress - Progress callback (0-1)
 * @param {number} chunks - Number of parallel chunks (default: 4)
 * @returns {Promise<Blob>} - The downloaded file as a Blob
 */
export async function downloadModelFast(url, onProgress, chunks = 4) {
  try {
    // First, check if the server supports range requests
    const headResponse = await fetch(url, { method: 'HEAD' });
    const acceptRanges = headResponse.headers.get('accept-ranges');
    const contentLength = parseInt(headResponse.headers.get('content-length'));
    
    // If no range support or unknown size, fall back to regular download
    if (acceptRanges !== 'bytes' || !contentLength) {
      console.log('Server does not support range requests, using standard download');
      return downloadModelStandard(url, onProgress);
    }
    
    console.log(`Starting parallel download: ${chunks} chunks, ${contentLength} bytes total`);
    
    // Calculate chunk size
    const chunkSize = Math.ceil(contentLength / chunks);
    const promises = [];
    const progress = new Array(chunks).fill(0);
    
    // Download all chunks in parallel
    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize - 1, contentLength - 1);
      
      promises.push(
        downloadChunk(url, start, end, i, (chunkIndex, bytesLoaded) => {
          progress[chunkIndex] = bytesLoaded;
          
          // Calculate total progress
          const totalProgress = progress.reduce((a, b) => a + b, 0);
          if (onProgress) {
            onProgress(totalProgress / contentLength);
          }
        })
      );
    }
    
    // Wait for all chunks to complete
    const chunks_data = await Promise.all(promises);
    
    // Combine all chunks into a single blob
    const combinedBlob = new Blob(chunks_data);
    console.log(`Download complete: ${combinedBlob.size} bytes`);
    
    return combinedBlob;
  } catch (error) {
    console.error('Parallel download failed, falling back to standard:', error);
    return downloadModelStandard(url, onProgress);
  }
}

/**
 * Download a single chunk with progress tracking
 */
async function downloadChunk(url, start, end, chunkIndex, onChunkProgress) {
  const response = await fetch(url, {
    headers: {
      'Range': `bytes=${start}-${end}`
    }
  });
  
  if (!response.ok && response.status !== 206) {
    throw new Error(`Failed to download chunk: ${response.status}`);
  }
  
  const reader = response.body.getReader();
  const chunks = [];
  let bytesLoaded = 0;
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    chunks.push(value);
    bytesLoaded += value.length;
    onChunkProgress(chunkIndex, bytesLoaded);
  }
  
  return new Blob(chunks);
}

/**
 * Standard download with progress tracking (fallback)
 */
async function downloadModelStandard(url, onProgress) {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }
  
  const reader = response.body.getReader();
  const contentLength = parseInt(response.headers.get('content-length'));
  
  const chunks = [];
  let receivedLength = 0;
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    chunks.push(value);
    receivedLength += value.length;
    
    if (onProgress && contentLength) {
      onProgress(receivedLength / contentLength);
    }
  }
  
  return new Blob(chunks);
}

/**
 * Model CDN configuration for hyperspeed downloads
 */
export const MODEL_CDN = {
  // Primary CDN - jsDelivr (free, global, fast)
  jsdelivr: {
    base: 'https://cdn.jsdelivr.net/gh/pablomurdoch/talktype-models@latest',
    getModelUrl: (modelPath) => {
      return `https://cdn.jsdelivr.net/gh/pablomurdoch/talktype-models@latest/${modelPath}`;
    }
  },
  
  // Fallback CDN - unpkg
  unpkg: {
    base: 'https://unpkg.com/talktype-models@latest',
    getModelUrl: (modelPath) => {
      return `https://unpkg.com/talktype-models@latest/${modelPath}`;
    }
  },
  
  // Direct GitHub (slowest, but always works)
  github: {
    base: 'https://raw.githubusercontent.com/pablomurdoch/talktype-models/main',
    getModelUrl: (modelPath) => {
      return `https://raw.githubusercontent.com/pablomurdoch/talktype-models/main/${modelPath}`;
    }
  }
};

/**
 * Get the best CDN URL for a model with automatic fallback
 */
export async function getBestCDNUrl(modelPath, testConnectivity = true) {
  const cdnOrder = ['jsdelivr', 'unpkg', 'github'];
  
  if (!testConnectivity) {
    // Just return the primary CDN without testing
    return MODEL_CDN.jsdelivr.getModelUrl(modelPath);
  }
  
  // Test each CDN with a HEAD request
  for (const cdnName of cdnOrder) {
    const cdn = MODEL_CDN[cdnName];
    const url = cdn.getModelUrl(modelPath);
    
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      
      if (response.ok || response.status === 304) {
        console.log(`Using ${cdnName} CDN for ${modelPath}`);
        return url;
      }
    } catch (error) {
      console.warn(`${cdnName} CDN test failed:`, error.message);
    }
  }
  
  // If all fail, return jsdelivr anyway (it's the most reliable)
  console.log('All CDN tests failed, defaulting to jsDelivr');
  return MODEL_CDN.jsdelivr.getModelUrl(modelPath);
}

/**
 * Download speed estimator
 */
export class DownloadSpeedTracker {
  constructor() {
    this.startTime = null;
    this.samples = [];
    this.lastBytes = 0;
    this.lastTime = null;
  }
  
  start() {
    this.startTime = Date.now();
    this.lastTime = this.startTime;
    this.samples = [];
    this.lastBytes = 0;
  }
  
  update(bytesLoaded) {
    const now = Date.now();
    const timeDelta = (now - this.lastTime) / 1000; // seconds
    const bytesDelta = bytesLoaded - this.lastBytes;
    
    if (timeDelta > 0.1) { // Only sample every 100ms
      const speed = bytesDelta / timeDelta; // bytes per second
      this.samples.push(speed);
      
      // Keep only last 10 samples for moving average
      if (this.samples.length > 10) {
        this.samples.shift();
      }
      
      this.lastTime = now;
      this.lastBytes = bytesLoaded;
    }
  }
  
  getSpeed() {
    if (this.samples.length === 0) return 0;
    
    // Calculate moving average
    const sum = this.samples.reduce((a, b) => a + b, 0);
    return sum / this.samples.length;
  }
  
  getETA(bytesRemaining) {
    const speed = this.getSpeed();
    if (speed === 0) return null;
    
    return bytesRemaining / speed; // seconds
  }
  
  getFormattedSpeed() {
    const speed = this.getSpeed();
    if (speed === 0) return 'calculating...';
    
    if (speed < 1024) {
      return `${Math.round(speed)} B/s`;
    } else if (speed < 1024 * 1024) {
      return `${Math.round(speed / 1024)} KB/s`;
    } else {
      return `${(speed / (1024 * 1024)).toFixed(1)} MB/s`;
    }
  }
}