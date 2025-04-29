import { geminiService as defaultGeminiService } from '$lib/services/geminiService';
import { eventBus } from '../infrastructure/eventBus';

export const TranscriptionEvents = {
  TRANSCRIPTION_STARTED: 'transcription:started',
  TRANSCRIPTION_PROGRESS: 'transcription:progress',
  TRANSCRIPTION_COMPLETED: 'transcription:completed',
  TRANSCRIPTION_ERROR: 'transcription:error',
  TRANSCRIPTION_COPIED: 'transcription:copied',
  TRANSCRIPTION_SHARED: 'transcription:shared'
};

export class TranscriptionService {
  constructor(dependencies = {}) {
    this.geminiService = dependencies.geminiService || defaultGeminiService;
    this.eventBus = dependencies.eventBus || eventBus;
    
    this.currentTranscript = '';
    this.transcriptionInProgress = false;
    
    this.lastTranscriptionTimestamp = null;
  }
  
  async transcribeAudio(audioBlob) {
    try {
      if (!audioBlob || !(audioBlob instanceof Blob)) {
        throw new Error('Invalid audio data provided');
      }
      
      this.transcriptionInProgress = true;
      this.lastTranscriptionTimestamp = Date.now();
      
      this.eventBus.emit(TranscriptionEvents.TRANSCRIPTION_STARTED, {
        blobSize: audioBlob.size,
        mimeType: audioBlob.type,
        timestamp: this.lastTranscriptionTimestamp
      });
      
      // Start progress animation
      this.startProgressAnimation();
      
      // Transcribe using Gemini
      const transcriptText = await this.geminiService.transcribeAudio(audioBlob);
      
      // Store the transcript
      this.currentTranscript = transcriptText;
      
      // Complete progress animation with smooth transition
      this.completeProgressAnimation();
      
      // Emit completion event
      this.eventBus.emit(TranscriptionEvents.TRANSCRIPTION_COMPLETED, {
        text: transcriptText,
        duration: Date.now() - this.lastTranscriptionTimestamp,
        timestamp: Date.now()
      });
      
      this.transcriptionInProgress = false;
      return transcriptText;
      
    } catch (error) {
      console.error('Transcription error:', error);
      this.transcriptionInProgress = false;
      
      this.eventBus.emit(TranscriptionEvents.TRANSCRIPTION_ERROR, {
        error: error.message || 'Unknown transcription error',
        timestamp: Date.now()
      });
      
      throw error;
    }
  }
  
  startProgressAnimation() {
    let progress = 0;
    const animate = () => {
      if (!this.transcriptionInProgress) return;
      
      progress = Math.min(95, progress + 1);
      
      this.eventBus.emit(TranscriptionEvents.TRANSCRIPTION_PROGRESS, {
        progress,
        estimatedRemaining: 100 - progress,
        timestamp: Date.now()
      });
      
      if (progress < 95) {
        setTimeout(animate, 50);
      }
    };
    
    // Start animation loop
    animate();
  }
  
  completeProgressAnimation() {
    let progress = 95;
    
    const complete = () => {
      progress = Math.min(100, progress + (100 - progress) * 0.2);
      
      this.eventBus.emit(TranscriptionEvents.TRANSCRIPTION_PROGRESS, {
        progress,
        estimatedRemaining: 100 - progress,
        timestamp: Date.now()
      });
      
      if (progress < 99.5) {
        requestAnimationFrame(complete);
      } else {
        this.eventBus.emit(TranscriptionEvents.TRANSCRIPTION_PROGRESS, {
          progress: 100,
          estimatedRemaining: 0,
          timestamp: Date.now()
        });
      }
    };
    
    // Start completion animation
    requestAnimationFrame(complete);
  }
  
  async copyToClipboard(text) {
    if (!text) {
      text = this.currentTranscript;
    }
    
    if (!text || text.trim() === '') {
      throw new Error('No text available to copy');
    }
    
    try {
      // Add attribution
      const textWithAttribution = `${text}\n\n𝘛𝘳𝘢𝘯𝘴𝘤𝘳𝘪𝘣𝘦𝘥 𝘣𝘺 𝘛𝘢𝘭𝘬𝘛𝘺𝘱𝘦 👻`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(textWithAttribution);
      
      // Emit copy event
      this.eventBus.emit(TranscriptionEvents.TRANSCRIPTION_COPIED, {
        text: textWithAttribution,
        wasDocumentFocused: document.hasFocus(),
        timestamp: Date.now()
      });
      
      return true;
      
    } catch (error) {
      console.error('Clipboard copy error:', error);
      
      // Emit error event but don't throw
      this.eventBus.emit(TranscriptionEvents.TRANSCRIPTION_ERROR, {
        context: 'clipboard',
        error: error.message || 'Unknown clipboard error',
        timestamp: Date.now()
      });
      
      return false;
    }
  }
  
  async shareTranscript(text) {
    if (!text) {
      text = this.currentTranscript;
    }
    
    if (!text || text.trim() === '') {
      throw new Error('No text available to share');
    }
    
    try {
      // Check if Web Share API is available
      if (!navigator.share) {
        throw new Error('Web Share API not supported');
      }
      
      // Add attribution
      const textWithAttribution = `${text}\n\n𝘛𝘳𝘢𝘯𝘴𝘤𝘳𝘪𝘣𝘦𝘥 𝘣𝘺 𝘛𝘢𝘭𝘬𝘛𝘺𝘱𝘦 👻`;
      
      // Share using Web Share API
      await navigator.share({
        text: textWithAttribution
      });
      
      // Emit share event
      this.eventBus.emit(TranscriptionEvents.TRANSCRIPTION_SHARED, {
        timestamp: Date.now()
      });
      
      return true;
      
    } catch (error) {
      // Don't treat user cancellation as an error
      if (error.name === 'AbortError') {
        return false;
      }
      
      console.error('Share error:', error);
      
      // Try fallback to clipboard if sharing fails
      if (error.message === 'Web Share API not supported') {
        return this.copyToClipboard(text);
      }
      
      // Emit error event but don't throw
      this.eventBus.emit(TranscriptionEvents.TRANSCRIPTION_ERROR, {
        context: 'share',
        error: error.message || 'Unknown sharing error',
        timestamp: Date.now()
      });
      
      return false;
    }
  }
  
  getCurrentTranscript() {
    return this.currentTranscript;
  }
  
  clearTranscript() {
    this.currentTranscript = '';
  }
  
  isTranscribing() {
    return this.transcriptionInProgress;
  }
  
  getRandomCopyMessage() {
    const copyMessages = [
      'Copied to clipboard! ✨',
      'Boom! In your clipboard! 🎉',
      'Text saved to clipboard! 👍',
      'Snagged that for you! 🙌',
      'All yours now! 💫',
      'Copied and ready to paste! 📋',
      'Captured in clipboard! ✅',
      'Text copied successfully! 🌟',
      'Got it! Ready to paste! 🚀',
      'Your text is saved! 💖',
      'Copied with magic! ✨',
      'Text safely copied! 🔮',
      'Copied and good to go! 🎯',
      'Saved to clipboard! 🎊'
    ];
    
    return copyMessages[Math.floor(Math.random() * copyMessages.length)];
  }
}

export const transcriptionService = new TranscriptionService();