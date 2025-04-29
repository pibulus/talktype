import { IndexedDBService } from '$lib/database/indexedDBService';
import { STORES } from '$lib/database/types';
import { ensureProperties } from '$lib/utils/migrationHelpers';
import { AudioStateManager, AudioStates } from '$lib/features/conversation/services/audioStates';
import { eventBus as defaultEventBus } from '$lib/services/infrastructure/eventBus';

// Event types
export const AudioEvents = {
  AUDIO_SAVED: 'audio:saved',
  AUDIO_DELETED: 'audio:deleted',
  AUDIO_LOADED: 'audio:loaded',
  RECORDING_STARTED: 'audio:recordingStarted',
  RECORDING_STOPPED: 'audio:recordingStopped',
  RECORDING_ERROR: 'audio:recordingError',
  STATE_CHANGED: 'audio:stateChanged'
};

/**
 * Service for managing audio recordings
 * 
 * Responsible for:
 * - Recording audio from the microphone
 * - Storing and retrieving audio data
 * - Managing audio metadata
 * - Providing audio data to other services
 * 
 * Follows Domain Service pattern in the Hierarchical Service Architecture.
 */
export class AudioService {
  /**
   * Creates a new AudioService with optional dependency injection
   * @param {Object} dependencies - Optional service dependencies
   * @param {IndexedDBService} dependencies.db - Database service
   * @param {EventBus} dependencies.eventBus - Event bus for communication
   */
  constructor(dependencies = {}) {
    // Infrastructure dependencies
    this.db = dependencies.db || new IndexedDBService();
    this.eventBus = dependencies.eventBus || defaultEventBus;
    
    // Audio recording state
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.audioContext = null;
    this.isIOS = typeof window !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
    this.stream = null;
    this.analyser = null;
    this.cleanupPromise = null;

    // Initialize state management
    this.stateManager = new AudioStateManager();

    // Add state change logging and event emission
    this.stateManager.addListener(({ oldState, newState, error }) => {
      console.log(
        `Audio state changed: ${oldState} -> ${newState}`,
        error ? `(Error: ${error.message})` : ''
      );
      
      // Emit state change event
      this.eventBus.emit(AudioEvents.STATE_CHANGED, {
        previousState: oldState,
        currentState: newState,
        error: error || null,
        timestamp: Date.now()
      });
    });
    
    // Initialize audio cache
    this.#audioCache = new Map();
  }
  
  // Private audio cache
  #audioCache = new Map();

  /**
   * Initialize audio context for recording
   * @private
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async initializeAudioContext() {
    if (!this.audioContext && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
    }

    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }

    return this.audioContext?.state === 'running';
  }

  /**
   * Check if media devices API is available
   * @private
   * @returns {Promise<boolean>} Whether media devices API is available
   */
  async checkMediaDevices() {
    if (typeof window === 'undefined') return false;
    if (!navigator?.mediaDevices?.getUserMedia) return false;
    return true;
  }

  /**
   * Request audio recording permissions
   * @private
   * @returns {Promise<Object>} Result of permission request
   */
  async requestPermissions() {
    console.log('DEBUG: requestPermissions() entered');
    try {
      if (!(await this.checkMediaDevices())) {
        throw new Error('MediaDevices API not available');
      }

      // Initialize audio context for iOS
      if (this.isIOS) {
        console.log('Initializing iOS audio context');
        const contextReady = await this.initializeAudioContext();
        if (!contextReady) {
          throw new Error('Failed to initialize audio context');
        }

        // iOS-specific constraints that work better
        const constraints = {
          audio: {
            sampleRate: 48000,
            channelCount: 1,
            echoCancellation: true,
            autoGainControl: true,
            noiseSuppression: true
          }
        };

        console.log('Using iOS-specific audio constraints');
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (stream && stream.active) {
            console.log('DEBUG: Successfully acquired active stream (iOS)');
            return { granted: true, stream };
          } else {
            console.warn('DEBUG: Stream not active after iOS permission request');
            stream?.getTracks().forEach((track) => track.stop());
            return { granted: false, error: new Error('No active audio stream after permission') };
          }
        } catch (iosError) {
          console.warn('iOS specific constraints failed, trying fallback:', iosError);
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (stream && stream.active) {
              return { granted: true, stream };
            } else {
              stream?.getTracks().forEach((track) => track.stop());
              return {
                granted: false,
                error: new Error('No active audio stream after fallback permission')
              };
            }
          } catch (fallbackError) {
            return { granted: false, error: fallbackError };
          }
        }
      }

      // For non-iOS, try with our preferred constraints
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });
        if (stream && stream.active) {
          return { granted: true, stream };
        } else {
          stream?.getTracks().forEach((track) => track.stop());
          return {
            granted: false,
            error: new Error('No active audio stream after detailed permission')
          };
        }
      } catch (error) {
        console.log('Detailed constraints failed, falling back to simple audio:', error);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (stream && stream.active) {
            return { granted: true, stream };
          } else {
            stream?.getTracks().forEach((track) => track.stop());
            return {
              granted: false,
              error: new Error('No active audio stream after simple permission')
            };
          }
        } catch (fallbackError) {
          return { granted: false, error: fallbackError };
        }
      }
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      return { granted: false, error };
    }
  }

  /**
   * Start recording audio from the microphone
   * @returns {Promise<boolean>} Whether recording started successfully
   */
  async startRecording() {
    console.log('DEBUG: startRecording() entered.');
    try {
      if (this.stateManager.getState() !== AudioStates.IDLE) {
        await this.cleanup();
      }
      
      this.stateManager.setState(AudioStates.INITIALIZING);
      this.stateManager.setState(AudioStates.REQUESTING_PERMISSIONS);
      
      const { granted, stream, error } = await this.requestPermissions();
      console.log('DEBUG: Permissions result:', { granted, stream });

      if (!granted) {
        this.stateManager.setState(AudioStates.PERMISSION_DENIED);
        throw error || new Error('Permission not granted');
      }

      if (!stream) {
        throw new Error('No audio stream available');
      }

      this.stateManager.setState(AudioStates.READY);
      this.audioChunks = [];

      // Check if MediaRecorder is available
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder not supported');
      }

      try {
        // Try different MIME types for iOS
        const mimeTypes = this.isIOS
          ? ['audio/mp4', 'audio/aac', 'audio/webm', '']
          : ['audio/webm', 'audio/ogg', ''];

        let mediaRecorderOptions = null;

        for (const mimeType of mimeTypes) {
          if (!mimeType || MediaRecorder.isTypeSupported(mimeType)) {
            mediaRecorderOptions = mimeType ? { mimeType } : undefined;
            console.log(`Using MIME type: ${mimeType || 'browser default'}`);
            break;
          }
        }

        this.stream = stream;
        this.mediaRecorder = new MediaRecorder(this.stream, mediaRecorderOptions);

        // Set up audio analysis
        if (!this.audioContext) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          this.audioContext = new AudioContext();
        }
        const source = this.audioContext.createMediaStreamSource(this.stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);
      } catch (mrError) {
        console.error('MediaRecorder creation failed:', mrError);
        stream.getTracks().forEach((track) => track.stop());
        throw mrError;
      }

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Start with timeslice for more frequent data chunks
      this.mediaRecorder.start(1000);
      console.log('DEBUG: MediaRecorder started, MIME type:', this.mediaRecorder.mimeType);
      this.stateManager.setState(AudioStates.RECORDING);
      
      // Emit recording started event
      this.eventBus.emit(AudioEvents.RECORDING_STARTED, {
        mimeType: this.mediaRecorder.mimeType || 'audio/webm',
        timestamp: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      this.stateManager.setState(AudioStates.ERROR, { error });
      
      // Emit recording error event
      this.eventBus.emit(AudioEvents.RECORDING_ERROR, {
        error: error.message,
        phase: 'start',
        timestamp: Date.now()
      });
      
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Stop recording audio and return the recorded blob
   * @returns {Promise<Blob>} The recorded audio blob
   */
  async stopRecording() {
    console.log('DEBUG: stopRecording() entered.');
    return new Promise((resolve) => {
      if (this.stateManager.getState() !== AudioStates.RECORDING) {
        console.warn('Cannot stop recording - not in recording state');
        resolve(null);
        return;
      }
      
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        console.warn('DEBUG: No active MediaRecorder instance.');
        this.stateManager.setState(AudioStates.IDLE);
        resolve(null);
        return;
      }

      this.stateManager.setState(AudioStates.STOPPING);

      this.mediaRecorder.onstop = () => {
        console.log('DEBUG: MediaRecorder onstop event fired.');
        const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        console.log('DEBUG: Created audioBlob with size:', audioBlob.size);
        
        // Emit recording stopped event
        this.eventBus.emit(AudioEvents.RECORDING_STOPPED, {
          blobSize: audioBlob.size,
          mimeType: mimeType,
          timestamp: Date.now()
        });
        
        this.audioChunks = [];
        resolve(audioBlob);
      };

      console.log('DEBUG: Calling mediaRecorder.stop()');
      this.mediaRecorder.stop();
    });
  }

  /**
   * Clean up audio recording resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    console.log('🧹 Starting audio cleanup');

    // If cleanup is already in progress, return the existing promise
    if (this.cleanupPromise) {
      console.log('Cleanup already in progress, returning existing promise');
      return this.cleanupPromise;
    }

    // Only allow cleanup from specific states
    const currentState = this.stateManager.getState();
    const allowedCleanupStates = [
      AudioStates.RECORDING,
      AudioStates.STOPPING,
      AudioStates.ERROR,
      AudioStates.PAUSED
    ];

    if (!allowedCleanupStates.includes(currentState) && currentState !== AudioStates.IDLE) {
      console.log(`Cleanup not needed in state: ${currentState}`);
      return Promise.resolve();
    }

    // If we're already in IDLE and nothing is active, just return
    if (currentState === AudioStates.IDLE && 
        !this.mediaRecorder && 
        !this.stream && 
        !this.audioContext) {
      console.log('Already clean, no action needed');
      return Promise.resolve();
    }

    this.stateManager.setState(AudioStates.CLEANING);
    this.cleanupPromise = this.#doCleanup().finally(() => {
      this.cleanupPromise = null;
    });

    return this.cleanupPromise;
  }

  /**
   * Perform actual cleanup of audio resources
   * @private
   * @returns {Promise<void>}
   */
  async #doCleanup() {
    if (this.isStopping) {
      console.log('Already stopping, skipping cleanup');
      return;
    }
    this.isStopping = true;

    try {
      // 1. First, stop MediaRecorder
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        console.log('Stopping MediaRecorder...');
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            console.log('MediaRecorder stop timeout reached');
            resolve();
          }, 1000);

          this.mediaRecorder.onstop = () => {
            clearTimeout(timeout);
            resolve();
          };

          try {
            this.mediaRecorder.stop();
          } catch (e) {
            console.warn('Error stopping MediaRecorder:', e);
            resolve();
          }
        });
      }

      // 2. Then, ensure all tracks are stopped
      if (this.stream) {
        console.log('Stopping all tracks...');
        const tracks = this.stream.getTracks();
        await Promise.all(
          tracks.map((track) => {
            return new Promise((resolve) => {
              track.onended = resolve;
              track.stop();
              // Fallback if onended doesn't fire
              setTimeout(resolve, 500);
            });
          })
        );
        this.stream = null;
      }

      // 3. Clean up audio context (important for iOS)
      if (this.audioContext) {
        console.log('Cleaning up audio context...');
        if (this.analyser) {
          try {
            this.analyser.disconnect();
          } catch (e) {
            console.warn('Error disconnecting analyser:', e);
          }
          this.analyser = null;
        }

        // On iOS, we need to be especially careful with the AudioContext
        if (this.isIOS) {
          try {
            // Suspend before closing
            await this.audioContext.suspend();
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (e) {
            console.warn('Error suspending audio context:', e);
          }
        }

        try {
          await this.audioContext.close();
        } catch (e) {
          console.warn('Error closing audio context:', e);
        }
        this.audioContext = null;
      }

      // 4. Clear all references
      this.mediaRecorder = null;
      this.audioChunks = [];

      // Wait a bit for iOS to catch up
      if (this.isIOS) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } finally {
      this.isStopping = false;
      console.log('✅ Audio cleanup complete');
      this.stateManager.setState(AudioStates.IDLE);
    }
  }

  /**
   * Get the current audio data
   * @returns {Promise<Blob>} The current audio data
   */
  async getAudioData() {
    return this.audioChunks.length > 0 ? new Blob(this.audioChunks, { type: 'audio/webm' }) : null;
  }

  /**
   * Get the number of recordings for a conversation
   * @param {string} conversationId - The conversation ID
   * @returns {Promise<number>} The number of recordings
   */
  async getRecordingCount(conversationId) {
    const recordings = await this.getAudio(conversationId);
    return recordings.length;
  }

  /**
   * Format a filename for an audio recording
   * @param {string} conversationId - The conversation ID
   * @param {string} title - The conversation title
   * @returns {Promise<string>} The formatted filename
   */
  async formatAudioFileName(conversationId, title) {
    const count = await this.getRecordingCount(conversationId);
    const cleanTitle = (title || 'Untitled')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim()
      .substring(0, 30);

    return `${cleanTitle} - Rec ${count + 1}.webm`;
  }

  /**
   * Save an audio recording
   * @param {string} conversationId - The conversation ID
   * @param {Blob} audioBlob - The audio blob to save
   * @returns {Promise<string>} The ID of the saved audio object
   */
  async saveAudio(conversationId, audioBlob) {
    try {
      // Make sure we have correct parameter order
      if (typeof conversationId !== 'string' || !(audioBlob instanceof Blob)) {
        console.warn('Parameter order incorrect in saveAudio, swapping parameters');
        // Swap parameters if they appear to be in the wrong order
        if (audioBlob instanceof Blob && typeof conversationId === 'object') {
          const temp = conversationId;
          conversationId = audioBlob;
          audioBlob = temp;
        }
      }
      
      // Ensure conversationId is a string
      if (typeof conversationId !== 'string') {
        throw new Error('Invalid conversation ID. Expected string but got ' + typeof conversationId);
      }
      
      // Ensure audioBlob is a Blob
      if (!(audioBlob instanceof Blob)) {
        throw new Error('Invalid audio data. Expected Blob but got ' + typeof audioBlob);
      }
      
      console.log('Saving audio for conversation:', conversationId, 'Blob size:', audioBlob.size);
      
      const conversation = await this.db.get(STORES.CONVERSATIONS, conversationId);
      if (!conversation) {
        console.warn(`Conversation ${conversationId} not found, using default title`);
      }
      
      const fileName = await this.formatAudioFileName(conversationId, conversation?.title);

      const audio = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        data: audioBlob,
        format: audioBlob.type || 'audio/webm',
        duration: null,
        file_name: fileName,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await this.db.add(STORES.AUDIO, audio);
      
      // Clear cache for this conversation
      this.#clearCache(conversationId);
      
      // Emit audio saved event
      this.eventBus.emit(AudioEvents.AUDIO_SAVED, {
        conversationId,
        audioId: audio.id,
        fileName: audio.file_name,
        format: audio.format,
        size: audioBlob.size,
        timestamp: Date.now()
      });
      
      console.log('Audio saved successfully with ID:', audio.id);
      return audio.id;
      
    } catch (error) {
      console.error('Error saving audio:', error);
      throw error;
    }
  }

  /**
   * Get all audio recordings for a conversation
   * @param {string} conversationId - The conversation ID
   * @returns {Promise<Array<Object>>} Array of audio recordings
   */
  async getAudio(conversationId) {
    // Check cache first
    const cached = this.#getFromCache(conversationId);
    if (cached) {
      console.log(`🔊 Returning ${cached.length} cached audio recordings for conversation ${conversationId}`);
      return cached;
    }
    
    console.log(`🔊 Getting audio recordings for conversation: ${conversationId}`);
    const audios = await this.db.getByIndex(STORES.AUDIO, 'conversation_id', conversationId);
    const AUDIO_DEFAULTS = { metadata: {} };
    
    const processedAudios = audios.map((a) => 
      ensureProperties(a, AUDIO_DEFAULTS, STORES.AUDIO, this.db)
    );
    
    // Update cache
    this.#updateCache(conversationId, processedAudios);
    
    // Emit audio loaded event
    this.eventBus.emit(AudioEvents.AUDIO_LOADED, {
      conversationId,
      count: processedAudios.length,
      timestamp: Date.now()
    });
    
    return processedAudios;
  }
  
  /**
   * Get a specific audio recording by ID
   * @param {string} audioId - The audio ID
   * @returns {Promise<Object>} The audio object
   */
  async getAudioById(audioId) {
    try {
      const audio = await this.db.get(STORES.AUDIO, audioId);
      if (!audio) {
        throw new Error(`Audio with ID ${audioId} not found`);
      }
      
      const AUDIO_DEFAULTS = { metadata: {} };
      return ensureProperties(audio, AUDIO_DEFAULTS, STORES.AUDIO, this.db);
    } catch (error) {
      console.error('Error getting audio by ID:', error);
      throw error;
    }
  }

  /**
   * Delete an audio recording
   * @param {string} audioId - The audio ID to delete
   * @returns {Promise<void>}
   */
  async deleteAudio(audioId) {
    try {
      // Get the audio first to determine conversation_id
      const audio = await this.db.get(STORES.AUDIO, audioId);
      if (!audio) {
        console.warn(`⚠️ Audio with ID ${audioId} not found for deletion`);
        return;
      }
      
      const conversationId = audio.conversation_id;
      await this.db.delete(STORES.AUDIO, audioId);
      
      // Clear cache for this conversation
      this.#clearCache(conversationId);
      
      // Emit audio deleted event
      this.eventBus.emit(AudioEvents.AUDIO_DELETED, {
        conversationId,
        audioId,
        fileName: audio.file_name,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error deleting audio:', error);
      throw error;
    }
  }
  
  /**
   * Get the current recording state
   * @returns {string} The current recording state
   */
  getRecordingState() {
    return this.stateManager.getState();
  }
  
  /**
   * Get audio from cache
   * @private
   * @param {string} conversationId - The conversation ID
   * @returns {Array<Object>|null} Cached audio recordings or null if not in cache
   */
  #getFromCache(conversationId) {
    const cached = this.#audioCache.get(conversationId);
    if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
      return cached.recordings;
    }
    return null;
  }
  
  /**
   * Update audio cache
   * @private
   * @param {string} conversationId - The conversation ID
   * @param {Array<Object>} recordings - The audio recordings to cache
   */
  #updateCache(conversationId, recordings) {
    if (!conversationId || !recordings) return;
    
    this.#audioCache.set(conversationId, {
      recordings,
      timestamp: Date.now()
    });
    
    console.log(`🔊 Updated cache for conversation ${conversationId} with ${recordings.length} recordings`);
    
    // Clean cache if it gets too large
    if (this.#audioCache.size > 20) {
      let oldestId = null;
      let oldestTime = Date.now();
      
      this.#audioCache.forEach((value, key) => {
        if (value.timestamp < oldestTime) {
          oldestTime = value.timestamp;
          oldestId = key;
        }
      });
      
      if (oldestId) {
        this.#audioCache.delete(oldestId);
        console.log(`🧹 Cleaned oldest audio cache entry for conversation ${oldestId}`);
      }
    }
  }
  
  /**
   * Clear audio cache for a conversation
   * @private
   * @param {string} conversationId - The conversation ID
   */
  #clearCache(conversationId) {
    this.#audioCache.delete(conversationId);
    console.log(`🧹 Cleared audio cache for conversation ${conversationId}`);
  }
}

// Export singleton instance for backward compatibility
export const audioService = new AudioService();