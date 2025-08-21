/**
 * Vosk Speech Recognition Service
 * Ultra-lightweight offline transcription (15MB model)
 * Faster than Whisper but slightly lower accuracy
 */

import { writable, get } from 'svelte/store';

// Service status store
export const voskStatus = writable({
  modelLoaded: false,
  modelLoading: false,
  modelSize: 15 * 1024 * 1024, // 15MB
  downloadProgress: 0,
  error: null
});

// Model registry for Vosk
const VOSK_MODELS = {
  'vosk-model-small-en-us': {
    url: 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip',
    size: 40 * 1024 * 1024, // 40MB uncompressed
    compressedSize: 15 * 1024 * 1024, // 15MB compressed
    language: 'en-US',
    sampleRate: 16000,
    accuracy: 'good'
  },
  'vosk-model-en-us-daanzu': {
    url: 'https://alphacephei.com/vosk/models/vosk-model-en-us-daanzu-20200905.zip',
    size: 1.4 * 1024 * 1024 * 1024, // 1.4GB - full model
    compressedSize: 500 * 1024 * 1024, // 500MB compressed
    language: 'en-US',
    sampleRate: 16000,
    accuracy: 'excellent'
  }
};

export class VoskService {
  constructor() {
    this.recognizer = null;
    this.model = null;
    this.currentModel = 'vosk-model-small-en-us';
    this.isReady = false;
    this.worker = null;
  }

  /**
   * Initialize Vosk with Web Worker
   */
  async initialize() {
    if (this.isReady) return { success: true };
    
    try {
      voskStatus.update(s => ({ ...s, modelLoading: true }));
      
      // Load Vosk library dynamically
      await this.loadVoskLibrary();
      
      // Download and initialize model
      const modelLoaded = await this.loadModel(this.currentModel);
      
      if (modelLoaded) {
        this.isReady = true;
        voskStatus.update(s => ({ 
          ...s, 
          modelLoaded: true, 
          modelLoading: false 
        }));
        return { success: true };
      }
      
      throw new Error('Failed to load Vosk model');
    } catch (error) {
      console.error('Vosk initialization error:', error);
      voskStatus.update(s => ({ 
        ...s, 
        modelLoading: false, 
        error: error.message 
      }));
      return { success: false, error: error.message };
    }
  }

  /**
   * Load Vosk library from CDN
   */
  async loadVoskLibrary() {
    // Check if already loaded
    if (window.createModule) return;
    
    // Load Vosk WASM from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/vosk-browser@0.0.8/dist/vosk.js';
    script.async = true;
    
    return new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load Vosk library'));
      document.head.appendChild(script);
    });
  }

  /**
   * Download and load Vosk model
   */
  async loadModel(modelName) {
    const modelInfo = VOSK_MODELS[modelName];
    if (!modelInfo) {
      throw new Error(`Unknown model: ${modelName}`);
    }
    
    // Check if model is cached in IndexedDB
    const cachedModel = await this.getCachedModel(modelName);
    if (cachedModel) {
      console.log('Loading Vosk model from cache');
      return this.initializeWithModel(cachedModel);
    }
    
    // Download model
    console.log(`Downloading Vosk model: ${modelName}`);
    const modelData = await this.downloadModel(modelInfo);
    
    // Cache for next time
    await this.cacheModel(modelName, modelData);
    
    return this.initializeWithModel(modelData);
  }

  /**
   * Download model with progress tracking
   */
  async downloadModel(modelInfo) {
    const response = await fetch(modelInfo.url);
    const reader = response.body.getReader();
    const contentLength = modelInfo.compressedSize;
    
    let receivedLength = 0;
    const chunks = [];
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      receivedLength += value.length;
      
      const progress = (receivedLength / contentLength) * 100;
      voskStatus.update(s => ({ ...s, downloadProgress: progress }));
    }
    
    // Combine chunks into single array
    const chunksAll = new Uint8Array(receivedLength);
    let position = 0;
    for (let chunk of chunks) {
      chunksAll.set(chunk, position);
      position += chunk.length;
    }
    
    // Decompress if needed (Vosk models are typically zipped)
    return this.decompressModel(chunksAll);
  }

  /**
   * Decompress ZIP model file
   */
  async decompressModel(compressedData) {
    // For now, return as-is (would need JSZip or similar)
    // In production, use a proper decompression library
    console.log('Model decompression would happen here');
    return compressedData;
  }

  /**
   * Initialize recognizer with model data
   */
  async initializeWithModel(modelData) {
    if (!window.createModule) {
      throw new Error('Vosk library not loaded');
    }
    
    // Create Vosk module
    const module = await window.createModule();
    
    // Create model from data
    this.model = new module.Model(modelData);
    
    // Create recognizer with 16kHz sample rate
    this.recognizer = new module.KaldiRecognizer(this.model, 16000);
    
    // Set recognition parameters
    this.recognizer.setWords(true);
    this.recognizer.setPartialWords(true);
    
    return true;
  }

  /**
   * Cache model in IndexedDB
   */
  async cacheModel(modelName, modelData) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('VoskModels', 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models');
        }
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['models'], 'readwrite');
        const store = transaction.objectStore('models');
        
        store.put(modelData, modelName);
        
        transaction.oncomplete = () => {
          console.log(`Cached Vosk model: ${modelName}`);
          resolve();
        };
        
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cached model from IndexedDB
   */
  async getCachedModel(modelName) {
    return new Promise((resolve) => {
      const request = indexedDB.open('VoskModels', 1);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('models')) {
          resolve(null);
          return;
        }
        
        const transaction = db.transaction(['models'], 'readonly');
        const store = transaction.objectStore('models');
        const getRequest = store.get(modelName);
        
        getRequest.onsuccess = () => {
          resolve(getRequest.result || null);
        };
        
        getRequest.onerror = () => resolve(null);
      };
      
      request.onerror = () => resolve(null);
    });
  }

  /**
   * Transcribe audio blob
   */
  async transcribeAudio(audioBlob) {
    if (!this.isReady) {
      const initialized = await this.initialize();
      if (!initialized.success) {
        throw new Error('Failed to initialize Vosk');
      }
    }
    
    // Convert blob to ArrayBuffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // Convert to 16kHz Float32Array if needed
    const audioData = await this.processAudio(arrayBuffer);
    
    // Feed audio to recognizer in chunks
    const chunkSize = 4000; // Process in 250ms chunks at 16kHz
    let transcript = '';
    
    for (let i = 0; i < audioData.length; i += chunkSize) {
      const chunk = audioData.slice(i, Math.min(i + chunkSize, audioData.length));
      
      if (this.recognizer.acceptWaveform(chunk)) {
        const result = JSON.parse(this.recognizer.result());
        if (result.text) {
          transcript += result.text + ' ';
        }
      } else {
        // Partial result
        const partial = JSON.parse(this.recognizer.partialResult());
        // Could emit progress here
      }
    }
    
    // Get final result
    const finalResult = JSON.parse(this.recognizer.finalResult());
    if (finalResult.text) {
      transcript += finalResult.text;
    }
    
    return transcript.trim();
  }

  /**
   * Process audio to 16kHz mono Float32Array
   */
  async processAudio(arrayBuffer) {
    // Create audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000
    });
    
    // Decode audio
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Get mono channel
    const channelData = audioBuffer.getChannelData(0);
    
    // If sample rate doesn't match, resample
    if (audioBuffer.sampleRate !== 16000) {
      return this.resample(channelData, audioBuffer.sampleRate, 16000);
    }
    
    return channelData;
  }

  /**
   * Resample audio to target sample rate
   */
  resample(audioData, fromSampleRate, toSampleRate) {
    const ratio = fromSampleRate / toSampleRate;
    const newLength = Math.round(audioData.length / ratio);
    const result = new Float32Array(newLength);
    
    for (let i = 0; i < newLength; i++) {
      const index = i * ratio;
      const indexFloor = Math.floor(index);
      const indexCeil = Math.min(indexFloor + 1, audioData.length - 1);
      const fraction = index - indexFloor;
      
      result[i] = audioData[indexFloor] * (1 - fraction) + audioData[indexCeil] * fraction;
    }
    
    return result;
  }

  /**
   * Clear cached models
   */
  async clearCache() {
    return new Promise((resolve) => {
      const deleteReq = indexedDB.deleteDatabase('VoskModels');
      deleteReq.onsuccess = () => {
        console.log('Vosk model cache cleared');
        resolve();
      };
      deleteReq.onerror = () => resolve();
    });
  }

  /**
   * Get model statistics
   */
  getModelStats() {
    return {
      model: this.currentModel,
      size: VOSK_MODELS[this.currentModel].compressedSize,
      accuracy: VOSK_MODELS[this.currentModel].accuracy,
      language: VOSK_MODELS[this.currentModel].language,
      isReady: this.isReady
    };
  }
}

// Export singleton instance
export const voskService = new VoskService();