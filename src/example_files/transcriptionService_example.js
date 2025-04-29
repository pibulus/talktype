import { IndexedDBService } from '$lib/database/indexedDBService';
import { STORES } from '$lib/database/types';
import { geminiService as defaultGeminiService } from '$lib/services/infrastructure/geminiService';
import { ensureProperties } from '$lib/utils/migrationHelpers';
import { eventBus as defaultEventBus } from '$lib/services/infrastructure/eventBus';

// Constants
const TRANSCRIPT_DEFAULTS = { metadata: {} };

// Event types
export const TranscriptionEvents = {
  TRANSCRIPT_CREATED: 'transcription:created',
  TRANSCRIPT_UPDATED: 'transcription:updated',
  TRANSCRIPT_DELETED: 'transcription:deleted',
  SPEAKER_UPDATED: 'transcription:speakerUpdated',
  TRANSCRIPTS_LOADED: 'transcription:loaded'
};

/**
 * Service for managing transcription operations
 * 
 * Responsible for:
 * - Transcribing audio to text
 * - Storing and retrieving transcript data
 * - Managing speaker identification
 * - Editing transcripts
 * 
 * Follows Domain Service pattern in the Hierarchical Service Architecture.
 */
export class TranscriptionService {
  /**
   * Creates a new TranscriptionService with optional dependency injection
   * @param {Object} dependencies - Optional service dependencies
   * @param {IndexedDBService} dependencies.db - Database service
   * @param {Object} dependencies.geminiService - AI service for transcription
   * @param {EventBus} dependencies.eventBus - Event bus for communication
   */
  constructor(dependencies = {}) {
    // Infrastructure dependencies
    this.db = dependencies.db || new IndexedDBService();
    this.geminiService = dependencies.geminiService || defaultGeminiService;
    this.eventBus = dependencies.eventBus || defaultEventBus;
    
    // Initialize transcript cache
    this.#transcriptCache = new Map();
  }
  
  // Private transcript cache
  #transcriptCache = new Map();

  /**
   * Transcribe audio to text and store in database
   * @param {Blob} audioBlob - The audio blob to transcribe
   * @param {string} conversationId - The conversation ID
   * @returns {Promise<Object>} The created transcript
   */
  async transcribeAudio(audioBlob, conversationId) {
    try {
      console.log('🎤 Starting audio transcription process');
      
      // Use Gemini to transcribe
      console.log('📝 Starting Gemini transcription');
      const { text, speakers } = await this.geminiService.transcribeAudio(audioBlob);

      // Create transcript record
      const transcript = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        text,
        speakers,
        source: 'microphone',
        audio_id: audioBlob.id, // Link to the audio recording
        timestamp: Date.now(),
        confidence: 0.95, // Note: We might want to get this from Gemini if available
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Store in database
      console.log('💾 Storing transcript in database');
      await this.db.add(STORES.TRANSCRIPT_SEGMENTS, transcript);
      
      // Invalidate cache for this conversation
      this.#clearCache(conversationId);
      
      // Emit event for transcript creation
      this.eventBus.emit(TranscriptionEvents.TRANSCRIPT_CREATED, {
        conversationId,
        transcript,
        source: 'audio',
        audioId: audioBlob.id
      });
      
      console.log('✅ Transcription process complete');
      return transcript;
    } catch (error) {
      console.error('❌ Error in transcription process:', error);
      throw new Error('Failed to transcribe audio: ' + error.message);
    }
  }

  /**
   * Get all transcripts for a conversation
   * @param {string} conversationId - The conversation ID
   * @param {Object} options - Additional options
   * @param {boolean} options.tryLegacyStores - Whether to try legacy store names if primary fails
   * @param {boolean} options.forceRefresh - Whether to bypass cache
   * @returns {Promise<Array<Object>>} Array of transcripts
   */
  async getTranscripts(conversationId, options = {}) {
    const { tryLegacyStores = true, forceRefresh = false } = options;
    console.log('📜 Getting transcripts for conversation:', conversationId);
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.#getFromCache(conversationId);
      if (cached) {
        console.log(`📝 Returning ${cached.length} cached transcripts for conversation ${conversationId}`);
        return cached;
      }
    } else {
      console.log('Bypassing cache due to force refresh option');
    }
    
    // Try multiple store names if needed
    const storeNamesToTry = [STORES.TRANSCRIPT_SEGMENTS];
    
    // Add legacy store names if enabled
    if (tryLegacyStores) {
      storeNamesToTry.push('transcripts'); // Legacy name
      
      // Also try camelCase variants
      if (STORES.TRANSCRIPT_SEGMENTS !== 'transcriptSegments') {
        storeNamesToTry.push('transcriptSegments');
      }
    }
    
    let transcripts = [];
    let successStore = null;
    
    // Try each store name until we find one with data
    for (const storeName of storeNamesToTry) {
      try {
        console.log(`📝 Trying to get transcripts from store: ${storeName}`);
        
        const results = await this.db.getByIndex(
          storeName,
          'conversation_id',
          conversationId
        );
        
        console.log(`📝 Found ${results?.length || 0} transcripts for conversation ${conversationId} in store ${storeName}`);
        
        // If we found results, use them and break the loop
        if (results && results.length > 0) {
          transcripts = results;
          successStore = storeName;
          break;
        }
      } catch (dbError) {
        console.warn(`Error retrieving transcript segments from ${storeName}:`, dbError);
        // Continue to next store on error
      }
    }
    
    try {
      // Handle empty result case
      if (!transcripts || transcripts.length === 0) {
        console.warn(`No transcript segments found for conversation: ${conversationId} after trying multiple stores`);
        return [];
      }
      
      console.log(`📝 Successfully retrieved transcripts from store: ${successStore}`);
      
      // Apply defaults and sort
      const transcriptDefaults = TRANSCRIPT_DEFAULTS;
      const updatedTranscripts = transcripts.map(t => 
        ensureProperties(t, transcriptDefaults, successStore || STORES.TRANSCRIPT_SEGMENTS, this.db)
      );
      const sortedTranscripts = updatedTranscripts.sort((a, b) => a.timestamp - b.timestamp);
      
      // Update cache
      this.#updateCache(conversationId, sortedTranscripts);
      
      // Emit event for transcript loading
      this.eventBus.emit(TranscriptionEvents.TRANSCRIPTS_LOADED, {
        conversationId,
        transcripts: sortedTranscripts,
        count: sortedTranscripts.length,
        successStore
      });
      
      return sortedTranscripts;
    } catch (error) {
      console.error('Error processing transcripts:', error);
      // Return empty array instead of throwing to make dependent processes more resilient
      return [];
    }
  }
  
  /**
   * Add a new transcript segment
   * @param {string} conversationId - The conversation ID
   * @param {string} text - The transcript text
   * @param {Object} [options] - Additional options
   * @param {Array<string>} [options.speakers] - Array of speakers in the transcript
   * @param {string} [options.source] - Source of the transcript ('text', 'microphone', etc.)
   * @returns {Promise<Object>} The created transcript
   */
  async addTranscript(conversationId, text, options = {}) {
    try {
      const { speakers = [], source = 'text' } = options;
      
      const transcript = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        text,
        speakers,
        source,
        timestamp: Date.now(),
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await this.db.add(STORES.TRANSCRIPT_SEGMENTS, transcript);
      
      // Invalidate cache
      this.#clearCache(conversationId);
      
      // Emit event for transcript creation
      this.eventBus.emit(TranscriptionEvents.TRANSCRIPT_CREATED, {
        conversationId,
        transcript,
        source: 'manual'
      });
      
      return transcript;
    } catch (error) {
      console.error('Error adding transcript:', error);
      throw error;
    }
  }
  
  /**
   * Save a transcript directly
   * @param {Object} transcript - The transcript object to save
   * @returns {Promise<Object>} The saved transcript
   */
  async saveTranscript(transcript) {
    try {
      console.log('💾 Saving transcript to database');
      
      // Ensure required properties
      const completeTranscript = {
        id: transcript.id || crypto.randomUUID(),
        conversation_id: transcript.conversationId || transcript.conversation_id,
        text: transcript.text,
        speakers: transcript.speakers || [],
        source: transcript.source || 'manual',
        timestamp: transcript.timestamp || Date.now(),
        metadata: transcript.metadata || {},
        created_at: transcript.created_at || new Date().toISOString(),
        updated_at: transcript.updated_at || new Date().toISOString()
      };
      
      await this.db.add(STORES.TRANSCRIPT_SEGMENTS, completeTranscript);
      
      // Invalidate cache
      this.#clearCache(completeTranscript.conversation_id);
      
      // Emit event for transcript creation
      this.eventBus.emit(TranscriptionEvents.TRANSCRIPT_CREATED, {
        conversationId: completeTranscript.conversation_id,
        transcript: completeTranscript,
        source: completeTranscript.source
      });
      
      return completeTranscript;
    } catch (error) {
      console.error('Error saving transcript:', error);
      throw error;
    }
  }

  /**
   * Edit a transcript
   * @param {string} transcriptId - The transcript ID
   * @param {string} newText - The new text content
   * @param {Array<string>} [newSpeakers] - Optional array of new speakers
   * @returns {Promise<Object>} The updated transcript
   */
  async editTranscription(transcriptId, newText, newSpeakers) {
    try {
      console.log('✏️ Editing transcription:', transcriptId);
      const transcript = await this.db.get(STORES.TRANSCRIPT_SEGMENTS, transcriptId);
      if (!transcript) {
        throw new Error(`Transcript with id ${transcriptId} not found.`);
      }
      
      // Store the original for event emission
      const originalTranscript = { ...transcript };
      
      // Update the transcript
      transcript.text = newText;
      if(newSpeakers) {
        transcript.speakers = newSpeakers;
      }
      transcript.updated_at = new Date().toISOString();
      await this.db.update(STORES.TRANSCRIPT_SEGMENTS, transcript);
      
      // Invalidate cache
      this.#clearCache(transcript.conversation_id);
      
      // Emit event for transcript update
      this.eventBus.emit(TranscriptionEvents.TRANSCRIPT_UPDATED, {
        conversationId: transcript.conversation_id,
        transcript,
        originalTranscript,
        changes: {
          textUpdated: originalTranscript.text !== newText,
          speakersUpdated: newSpeakers ? true : false
        }
      });
      
      console.log('✅ Transcription updated:', transcriptId);
      return transcript;
    } catch (error) {
      console.error('❌ Error editing transcription:', error);
      throw error;
    }
  }
  
  /**
   * Delete a transcript
   * @param {string} transcriptId - The transcript ID to delete
   * @returns {Promise<void>}
   */
  async deleteTranscript(transcriptId) {
    try {
      console.log('🗑️ Deleting transcript:', transcriptId);
      
      // Get the transcript before deleting to know the conversation ID
      const transcript = await this.db.get(STORES.TRANSCRIPT_SEGMENTS, transcriptId);
      if (!transcript) {
        console.warn(`⚠️ Transcript with ID ${transcriptId} not found for deletion`);
        return;
      }
      
      const conversationId = transcript.conversation_id;
      await this.db.delete(STORES.TRANSCRIPT_SEGMENTS, transcriptId);
      
      // Invalidate cache
      this.#clearCache(conversationId);
      
      // Emit event for transcript deletion
      this.eventBus.emit(TranscriptionEvents.TRANSCRIPT_DELETED, {
        conversationId,
        transcriptId,
        transcript
      });
      
      console.log('✅ Transcript deleted:', transcriptId);
    } catch (error) {
      console.error('❌ Error deleting transcript:', error);
      throw error;
    }
  }

  /**
   * Update a speaker name across all transcripts in a conversation
   * @param {string} conversationId - The conversation ID
   * @param {string} currentSpeaker - The current speaker name
   * @param {string} newSpeakerName - The new speaker name
   * @returns {Promise<Array<Object>>} Updated transcripts
   */
  async updateSpeakerName(conversationId, currentSpeaker, newSpeakerName) {
    try {
      console.log('🔄 Updating speaker from', currentSpeaker, 'to', newSpeakerName, 'in conversation:', conversationId);
      
      // Get all transcripts for this conversation
      const transcripts = await this.getTranscripts(conversationId);
      console.log('Found', transcripts.length, 'transcripts');
      
      // Create a RegExp pattern to match lines starting with speaker name
      const pattern = new RegExp(`^${currentSpeaker}:`, 'm');
      
      // Track which transcripts were updated
      const updatedTranscriptIds = [];
      
      // Update each transcript that contains the speaker
      const updatePromises = transcripts.map(async t => {
        if (pattern.test(t.text)) {
          const updatedText = t.text.replace(new RegExp(`^${currentSpeaker}:`, 'gm'), `${newSpeakerName}:`);
          
          // Update speakers array if it exists
          const updatedSpeakers = (t.speakers || []).map(s => {
            return s === currentSpeaker ? newSpeakerName : s;
          });
          
          updatedTranscriptIds.push(t.id);
          return await this.editTranscription(t.id, updatedText, updatedSpeakers);
        } else {
          return t;
        }
      });
      
      const updatedTranscripts = await Promise.all(updatePromises);
      
      // Invalidate cache
      this.#clearCache(conversationId);
      
      // Emit event for speaker update
      this.eventBus.emit(TranscriptionEvents.SPEAKER_UPDATED, {
        conversationId,
        previousSpeaker: currentSpeaker,
        newSpeaker: newSpeakerName,
        updatedTranscriptIds,
        transcriptCount: updatedTranscriptIds.length
      });
      
      console.log('✅ Speaker names updated in conversation:', conversationId);
      return updatedTranscripts;
    } catch (error) {
      console.error('❌ Error updating speaker names:', error);
      throw error;
    }
  }
  
  /**
   * Extract speakers from transcript text
   * @param {string} text - The transcript text
   * @returns {Promise<Array<string>>} Array of speaker names
   */
  async extractSpeakers(text) {
    try {
      if (!text) return [];
      
      // Simple extraction from format "Speaker: text"
      const speakerRegex = /^([^:]+):/gm;
      const speakers = new Set();
      let match;
      
      while ((match = speakerRegex.exec(text)) !== null) {
        speakers.add(match[1].trim());
      }
      
      return Array.from(speakers);
    } catch (error) {
      console.error('Error extracting speakers:', error);
      return [];
    }
  }
  
  /**
   * Get transcripts from cache
   * @private
   * @param {string} conversationId - The conversation ID
   * @returns {Array<Object>|null} Cached transcripts or null if not in cache
   */
  #getFromCache(conversationId) {
    const cached = this.#transcriptCache.get(conversationId);
    if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
      return cached.transcripts;
    }
    return null;
  }
  
  /**
   * Update transcript cache
   * @private
   * @param {string} conversationId - The conversation ID
   * @param {Array<Object>} transcripts - The transcripts to cache
   */
  #updateCache(conversationId, transcripts) {
    if (!conversationId || !transcripts) return;
    
    this.#transcriptCache.set(conversationId, {
      transcripts,
      timestamp: Date.now()
    });
    
    console.log(`📝 Updated cache for conversation ${conversationId} with ${transcripts.length} transcripts`);
    
    // Clean cache if it gets too large
    if (this.#transcriptCache.size > 20) {
      let oldestId = null;
      let oldestTime = Date.now();
      
      this.#transcriptCache.forEach((value, key) => {
        if (value.timestamp < oldestTime) {
          oldestTime = value.timestamp;
          oldestId = key;
        }
      });
      
      if (oldestId) {
        this.#transcriptCache.delete(oldestId);
        console.log(`🧹 Cleaned oldest transcript cache entry for conversation ${oldestId}`);
      }
    }
  }
  
  /**
   * Clear transcript cache for a conversation
   * @private
   * @param {string} conversationId - The conversation ID
   */
  #clearCache(conversationId) {
    this.#transcriptCache.delete(conversationId);
    console.log(`🧹 Cleared transcript cache for conversation ${conversationId}`);
  }
}

// Export singleton instance for backward compatibility
export const transcriptionService = new TranscriptionService();