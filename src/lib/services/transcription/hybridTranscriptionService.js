/**
 * Hybrid Transcription Service
 * Intelligently chooses between Web Speech API (instant) and Whisper (offline)
 * 
 * Priority:
 * 1. Web Speech API - Chrome/Edge (0MB, instant)
 * 2. Whisper Tiny - All browsers (39MB, offline)
 * 3. Future: WebGPU Whisper - Modern browsers (39MB, 10x faster)
 */

import { whisperServiceEnhanced as whisperService } from './whisper/whisperServiceEnhanced';
import { webSpeechService } from './webSpeechService';
import { voskService } from './vosk/voskService';
import { writable, get } from 'svelte/store';

// Service configuration
export const transcriptionConfig = writable({
  preferredMode: 'auto', // 'auto', 'webspeech', 'whisper', 'vosk'
  privacyMode: false, // If true, always use offline
  modelSize: 'tiny', // 'tiny', 'base', 'small'
  offlineEngine: 'whisper', // 'whisper' or 'vosk' for offline mode
  initialized: false
});

// Service status
export const hybridStatus = writable({
  activeService: null,
  webSpeechAvailable: false,
  whisperAvailable: false,
  voskAvailable: false,
  webGPUAvailable: false,
  recommendation: null
});

export class HybridTranscriptionService {
  constructor() {
    this.activeService = null;
    this.webSpeechAvailable = webSpeechService.isSupported;
    this.whisperReady = false;
    this.voskReady = false;
    this.initializeServices();
  }
  
  async initializeServices() {
    // Check what's available
    const status = {
      webSpeechAvailable: webSpeechService.isSupported,
      whisperAvailable: true, // Always available
      voskAvailable: true, // Always available (lighter alternative)
      webGPUAvailable: await this.checkWebGPU(),
      recommendation: null
    };
    
    // Determine recommendation
    if (status.webSpeechAvailable && !get(transcriptionConfig).privacyMode) {
      status.recommendation = 'webspeech';
      status.activeService = 'webspeech';
    } else if (status.webGPUAvailable) {
      status.recommendation = 'whisper-gpu';
      status.activeService = 'whisper-gpu';
    } else {
      status.recommendation = 'whisper';
      status.activeService = 'whisper';
    }
    
    // Update status
    hybridStatus.set(status);
    
    // Initialize based on preference
    const config = get(transcriptionConfig);
    if (config.preferredMode === 'auto') {
      this.activeService = status.recommendation;
    } else {
      this.activeService = config.preferredMode;
    }
    
    transcriptionConfig.update(c => ({ ...c, initialized: true }));
  }
  
  async checkWebGPU() {
    if (!navigator.gpu) return false;
    try {
      const adapter = await navigator.gpu.requestAdapter();
      return !!adapter;
    } catch {
      return false;
    }
  }
  
  /**
   * Main transcription method - intelligently routes to best service
   */
  async transcribeAudio(audioBlob) {
    const config = get(transcriptionConfig);
    const status = get(hybridStatus);
    
    // Privacy mode - always use offline
    if (config.privacyMode) {
      // Use preferred offline engine
      if (config.offlineEngine === 'vosk') {
        return this.transcribeWithVosk(audioBlob);
      }
      return this.transcribeWithWhisper(audioBlob);
    }
    
    // Use preference if set
    if (config.preferredMode !== 'auto') {
      switch(config.preferredMode) {
        case 'webspeech':
          if (status.webSpeechAvailable) {
            return this.transcribeWithWebSpeech(audioBlob);
          }
          break;
        case 'whisper':
          return this.transcribeWithWhisper(audioBlob);
        case 'vosk':
          return this.transcribeWithVosk(audioBlob);
      }
    }
    
    // Auto mode - use best available
    if (status.webSpeechAvailable && this.canUseWebSpeech()) {
      try {
        return await this.transcribeWithWebSpeech(audioBlob);
      } catch (error) {
        console.log('Web Speech failed, falling back to Whisper:', error);
        return this.transcribeWithWhisper(audioBlob);
      }
    }
    
    // Default to Whisper
    return this.transcribeWithWhisper(audioBlob);
  }
  
  /**
   * Check if we can use Web Speech API
   * (It requires real-time microphone, not pre-recorded audio)
   */
  canUseWebSpeech() {
    // Web Speech API doesn't work with blobs, only real-time
    // So we need to check if we're in a recording context
    return false; // For now, always use Whisper for blob transcription
  }
  
  /**
   * Transcribe using Web Speech API
   */
  async transcribeWithWebSpeech(audioBlob) {
    // Web Speech API doesn't support blob transcription
    // It only works with real-time microphone input
    throw new Error('Web Speech API requires real-time microphone access');
  }
  
  /**
   * Transcribe using Whisper
   */
  async transcribeWithWhisper(audioBlob) {
    // Ensure Whisper is loaded
    if (!this.whisperReady) {
      const result = await whisperService.preloadModel();
      if (!result.success) {
        throw new Error('Failed to load Whisper model');
      }
      this.whisperReady = true;
    }
    
    return whisperService.transcribeAudio(audioBlob);
  }
  
  /**
   * Transcribe using Vosk (lightweight alternative)
   */
  async transcribeWithVosk(audioBlob) {
    // Ensure Vosk is loaded
    if (!this.voskReady) {
      const result = await voskService.initialize();
      if (!result.success) {
        throw new Error('Failed to load Vosk model');
      }
      this.voskReady = true;
    }
    
    return voskService.transcribeAudio(audioBlob);
  }
  
  /**
   * Get service statistics
   */
  getStats() {
    const status = get(hybridStatus);
    const config = get(transcriptionConfig);
    
    return {
      mode: this.activeService,
      available: {
        webSpeech: status.webSpeechAvailable,
        whisper: status.whisperAvailable,
        vosk: status.voskAvailable,
        webGPU: status.webGPUAvailable
      },
      settings: {
        preferredMode: config.preferredMode,
        privacyMode: config.privacyMode,
        modelSize: config.modelSize,
        offlineEngine: config.offlineEngine
      },
      recommendation: status.recommendation,
      downloadSize: this.getDownloadSize()
    };
  }
  
  getDownloadSize() {
    const config = get(transcriptionConfig);
    const status = get(hybridStatus);
    
    // If using Web Speech, no download
    if (this.activeService === 'webspeech' && status.webSpeechAvailable) {
      return 0;
    }
    
    // If using Vosk
    if (this.activeService === 'vosk' || config.preferredMode === 'vosk') {
      return 15 * 1024 * 1024; // 15MB for Vosk small model
    }
    
    // Whisper model sizes
    const sizes = {
      tiny: 39 * 1024 * 1024,
      base: 74 * 1024 * 1024,
      small: 244 * 1024 * 1024
    };
    
    return sizes[config.modelSize] || sizes.tiny;
  }
  
  /**
   * Switch transcription mode
   */
  async switchMode(mode) {
    transcriptionConfig.update(c => ({ ...c, preferredMode: mode }));
    this.activeService = mode;
    
    // Preload if switching to Whisper
    if (mode === 'whisper' && !this.whisperReady) {
      await whisperService.preloadModel();
      this.whisperReady = true;
    }
    
    // Preload if switching to Vosk
    if (mode === 'vosk' && !this.voskReady) {
      await voskService.initialize();
      this.voskReady = true;
    }
  }
  
  /**
   * Toggle privacy mode
   */
  togglePrivacyMode(enabled) {
    transcriptionConfig.update(c => ({ ...c, privacyMode: enabled }));
    
    if (enabled) {
      this.activeService = 'whisper';
    } else {
      const status = get(hybridStatus);
      this.activeService = status.recommendation;
    }
  }
}

// Export singleton instance
export const hybridTranscriptionService = new HybridTranscriptionService();