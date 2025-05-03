/**
 * Animation Coordinator
 * 
 * Coordinates complex animations by managing transitions between states
 * and orchestrating the timing of multiple animation effects.
 * 
 * Includes an animation queue system to ensure animations run sequentially
 * without overlapping.
 */
import { get } from 'svelte/store';
import { domEffects } from './animationEffects';
// Use the base store to avoid circular dependencies
import { animationStateStore as ghostAnimationStore } from './storeInstances';

// Animation timing constants
const TIMING = {
  BLINK: {
    DURATION: 150,  // Duration of a single blink
    MIN_INTERVAL: 4000, // Minimum time between ambient blinks
    MAX_INTERVAL: 8000  // Maximum time between ambient blinks
  },
  WOBBLE: {
    DURATION: 600
  },
  THINKING: {
    BLINK_DURATION: 50,
    PATTERN_INTERVAL: 1000
  },
  TRANSITION: {
    DELAY: 50  // Minimum delay between animation state transitions
  },
  // Safety buffer for animations to ensure complete finishing
  SAFETY_BUFFER: 100
};

/**
 * Creates a new animation coordinator
 */
export function createAnimationCoordinator() {
  const coordinator = {
    initialized: false,
    elements: {
      ghost: null,
      eyes: null,
      background: null
    },
    timeouts: new Map(),
    animationQueue: [],
    currentlyAnimating: false,
    
    /**
     * Initialize the coordinator with DOM elements
     */
    initialize(elements) {
      if (this.initialized) {
        console.log('🔄 Reinitializing animation coordinator - cleaning up first');
        this.cleanup();
      }
      
      console.log('🔍 Initializing animation coordinator with elements:', {
        ghost: !!elements.ghost,
        eyes: !!elements.eyes,
        background: !!elements.background
      });
      
      this.elements = {
        ghost: elements.ghost || null,
        eyes: elements.eyes || null,
        background: elements.background || null
      };
      
      // Register elements with the DOM effects system
      if (this.elements.ghost) {
        domEffects.registerElement('ghost', this.elements.ghost);
        console.log('✅ Registered ghost element with DOM effects');
      } else {
        console.log('❌ Missing ghost element - eye tracking will not work');
      }
      
      if (this.elements.eyes) {
        domEffects.registerElement('eyes', this.elements.eyes);
        console.log('✅ Registered eyes element with DOM effects');
      } else {
        console.log('❌ Missing eyes element - eye tracking will not work');
      }
      
      if (this.elements.background) {
        domEffects.registerElement('background', this.elements.background);
        console.log('✅ Registered background element with DOM effects');
      }
      
      this.initialized = true;
      
      // Sync current store state to DOM
      this.syncAllStates();
      
      console.log('✅ Animation coordinator initialized successfully');
      
      return this;
    },
    
    /**
     * Clean up all animations and timeouts
     */
    cleanup() {
      this.clearAllTimeouts();
      this.clearAnimationQueue(false); // Clear all animations including uncancelable ones
      this.currentlyAnimating = false;
      this.initialized = false;
    },
    
    /**
     * Sync all animation states from the store to the DOM
     */
    syncAllStates() {
      if (!this.initialized) return;
      
      const state = get(ghostAnimationStore);
      
      // Sync recording state
      this.syncRecordingState(state.isRecording);
      
      // Sync theme
      this.syncTheme(state.theme.current);
      
      // Sync eye state
      this.syncEyeState(state.eyes);
      
      // Start ambient animations if appropriate
      if (!state.isRecording && !state.isProcessing) {
        this.scheduleNextAmbientBlink();
      }
    },
    
    /**
     * Sync recording state to DOM
     */
    syncRecordingState(isRecording) {
      if (!this.initialized) return;
      domEffects.setRecordingState('ghost', isRecording);
    },
    
    /**
     * Sync theme to DOM
     */
    syncTheme(theme) {
      if (!this.initialized) return;
      domEffects.setTheme('ghost', theme, 'background');
    },
    
    /**
     * Sync eye state to DOM
     */
    syncEyeState(eyeState) {
      if (!this.initialized) return;
      
      domEffects.updateEyeState('eyes', {
        closed: eyeState.closed,
        position: eyeState.position
      });
    },
    
    /**
     * Handle a mouse move event for eye tracking
     */
    handleMouseMove(event) {
      if (!this.initialized) {
        console.log('👁️ Eye tracking not initialized yet');
        return;
      }
      
      if (!this.elements.ghost) {
        console.log('👁️ Ghost element not available for eye tracking');
        return;
      }
      
      if (!this.elements.eyes) {
        console.log('👁️ Eyes element not available for eye tracking');
        return;
      }
      
      // Get current eye state
      const state = get(ghostAnimationStore);
      if (state.eyes.closed) {
        // Skip tracking when eyes are closed for blinking
        return;
      }
      
      if (!state.eyes.tracking) {
        console.log('👁️ Eye tracking disabled in store');
        return;
      }
      
      // Calculate relative position
      const ghostRect = this.elements.ghost.getBoundingClientRect();
      const ghostCenterX = ghostRect.left + ghostRect.width / 2;
      const ghostCenterY = ghostRect.top + ghostRect.height / 2;
      
      const distanceX = event.clientX - ghostCenterX;
      const distanceY = event.clientY - ghostCenterY;
      
      // Normalize position (range: -1 to 1)
      const maxDistanceX = window.innerWidth / 3;
      const maxDistanceY = window.innerHeight / 3;
      const normalizedX = Math.max(-1, Math.min(1, distanceX / maxDistanceX));
      const normalizedY = Math.max(-1, Math.min(1, distanceY / maxDistanceY));
      
      // Apply smoothing (configurable from store)
      const { sensitivity = 0.2 } = state.eyes.config || {};
      const currentX = state.eyes.position.x || 0;
      const currentY = state.eyes.position.y || 0;
      
      const newX = currentX + (normalizedX - currentX) * sensitivity;
      const newY = currentY + (normalizedY - currentY) * sensitivity;
      
      // Log position changes
      if (Math.abs(newX - currentX) > 0.01 || Math.abs(newY - currentY) > 0.01) {
        console.log(`👁️ Eye position: (${(newX * 20).toFixed(2)}, ${(newY * 10).toFixed(2)})`);
      }
      
      // Update store position
      ghostAnimationStore.update(state => ({
        ...state,
        eyes: {
          ...state.eyes,
          position: { x: newX, y: newY }
        }
      }));
      
      // Update position in store - will be reflected in component's inline style
    },
    
    /**
     * Schedule the next ambient blink
     */
    scheduleNextAmbientBlink() {
      if (!this.initialized) return;
      
      this.clearTimeout('ambientBlink');
      
      // Don't schedule during recording/processing
      const state = get(ghostAnimationStore);
      if (state.isRecording || state.isProcessing) return;
      
      // Random delay within range
      const delay = TIMING.BLINK.MIN_INTERVAL + 
        Math.random() * (TIMING.BLINK.MAX_INTERVAL - TIMING.BLINK.MIN_INTERVAL);
      
      // Schedule next blink
      this.setTimeout('ambientBlink', () => {
        // Check current animation state before starting ambient blinks
        if (this.currentlyAnimating) {
          // If we're in the middle of another animation, try again later
          this.setTimeout('retry-ambient', () => this.scheduleNextAmbientBlink(), 1000);
          return;
        }
        
        // Determine if single or double blink
        const random = Math.random();
        if (random < 0.25) {
          // Double blink (25% chance)
          this.performSequentialBlinks(2, 180, () => this.scheduleNextAmbientBlink());
        } else {
          // Single blink (75% chance)
          this.performSequentialBlinks(1, 150, () => this.scheduleNextAmbientBlink());
        }
      }, delay);
    },
    
    /**
     * Perform a sequence of blinks
     */
    performSequentialBlinks(count, interval, onComplete) {
      if (!this.initialized) return;
      
      // Calculate total duration for the animation
      const singleBlinkDuration = interval;
      const totalDuration = (count * singleBlinkDuration) + (count > 1 ? (count - 1) * (interval * 0.5) : 0);
      
      // Queue the blink animation
      this.queueAnimation({
        name: `blink-sequence-${count}`,
        duration: totalDuration,
        priority: count > 1 ? 2 : 1, // Double blinks higher priority
        execute: () => {
          let currentBlink = 0;
          
          const doBlink = () => {
            // Close eyes - directly update store only
            ghostAnimationStore.update(state => ({
              ...state,
              eyes: { ...state.eyes, closed: true }
            }));
            
            // Schedule opening
            this.setTimeout(`blink-${currentBlink}`, () => {
              // Open eyes - directly update store only
              ghostAnimationStore.update(state => ({
                ...state,
                eyes: { ...state.eyes, closed: false }
              }));
              
              // Continue sequence or complete
              currentBlink++;
              if (currentBlink < count) {
                this.setTimeout(`blink-sequence-${currentBlink}`, doBlink, interval * 0.5);
              } else if (onComplete) {
                this.setTimeout('blink-complete', onComplete, interval);
              }
            }, interval);
          };
          
          // Start the sequence
          doBlink();
        }
      });
    },
    
    /**
     * Start thinking animation pattern
     */
    startThinking() {
      if (!this.initialized) return;
      
      ghostAnimationStore.update(state => ({
        ...state,
        eyes: { ...state.eyes, thinking: true }
      }));
      this.clearTimeout('ambientBlink');
      
      const animateThinking = () => {
        // If not in thinking state anymore, stop
        if (!get(ghostAnimationStore).eyes.thinking) return;
        
        // Close eyes briefly - update store only
        ghostAnimationStore.update(state => ({
          ...state,
          eyes: { ...state.eyes, closed: true }
        }));
        
        // Open eyes
        this.setTimeout('thinking-open', () => {
          ghostAnimationStore.update(state => ({
            ...state,
            eyes: { ...state.eyes, closed: false }
          }));
          
          // Schedule next pattern
          this.setTimeout('thinking-next', animateThinking, TIMING.THINKING.PATTERN_INTERVAL);
        }, TIMING.THINKING.BLINK_DURATION);
      };
      
      // Start the animation loop
      animateThinking();
    },
    
    /**
     * Stop thinking animation
     */
    stopThinking() {
      if (!this.initialized) return;
      
      ghostAnimationStore.update(state => ({
        ...state,
        eyes: { ...state.eyes, thinking: false, closed: false }
      }));
      
      // Make sure eyes are open
      const state = get(ghostAnimationStore);
      domEffects.updateEyeState('eyes', {
        closed: false,
        position: state.eyes.position
      });
      
      // Resume ambient blinking
      this.setTimeout('post-thinking', () => this.scheduleNextAmbientBlink(), 500);
    },
    
    /**
     * React to transcript with appropriate animation
     */
    reactToTranscript(textLength = 0) {
      if (!this.initialized) return;
      
      this.clearTimeout('ambientBlink');
      
      if (textLength === 0) {
        this.scheduleNextAmbientBlink();
        return;
      }
      
      const reactionDelay = 500;
      const totalDuration = reactionDelay + (textLength > 20 ? 800 : 600);
      
      // Queue the reaction animation
      this.queueAnimation({
        name: 'transcript-reaction',
        duration: totalDuration,
        priority: 4, // Higher than blinks, lower than wobbles
        cancelable: false, // Transcript reactions are important user feedback
        execute: () => {
          // Wait a moment before reacting
          this.setTimeout('transcript-reaction', () => {
            if (textLength > 20) {
              // For longer transcripts, satisfied double blink
              this.performSequentialBlinks(2, 200, () => this.scheduleNextAmbientBlink());
            } else {
              // For shorter transcripts, single blink
              this.performSequentialBlinks(1, 300, () => this.scheduleNextAmbientBlink());
            }
          }, reactionDelay);
        }
      });
    },
    
    /**
     * Force a wobble animation
     */
    forceWobble(options = {}) {
      if (!this.initialized) return;
      
      const opts = typeof options === 'string' ? { direction: options } : options;
      const { direction = '', priority = 5 } = opts;
      
      // Queue the wobble animation with high priority
      this.queueAnimation({
        name: `wobble-${direction || 'random'}`,
        duration: TIMING.WOBBLE.DURATION,
        priority: priority, // Higher priority than blinks
        execute: () => {
          ghostAnimationStore.update(state => ({
            ...state,
            body: { ...state.body, wobbling: true }
          }));
          
          domEffects.applyWobble('ghost', direction, TIMING.WOBBLE.DURATION);
          
          this.setTimeout('wobble-end', () => {
            ghostAnimationStore.update(state => ({
              ...state,
              body: { ...state.body, wobbling: false }
            }));
          }, TIMING.WOBBLE.DURATION);
        }
      });
    },
    
    /**
     * Trigger a pulse animation
     */
    pulse() {
      if (!this.initialized) return;
      
      // Queue the pulse animation
      this.queueAnimation({
        name: 'pulse',
        duration: 600,
        priority: 3, // Medium priority
        execute: () => {
          ghostAnimationStore.update(state => ({
            ...state,
            body: { ...state.body, pulsing: true }
          }));
          
          domEffects.applyPulse('ghost');
          
          this.setTimeout('pulse-end', () => {
            ghostAnimationStore.update(state => ({
              ...state,
              body: { ...state.body, pulsing: false }
            }));
          }, 600);
        }
      });
    },
    
    /**
     * Manage timeouts with cleanup
     */
    setTimeout(name, callback, delay) {
      this.clearTimeout(name);
      
      const id = setTimeout(callback, delay);
      this.timeouts.set(name, id);
      
      return id;
    },
    
    /**
     * Clear a named timeout
     */
    clearTimeout(name) {
      if (this.timeouts.has(name)) {
        clearTimeout(this.timeouts.get(name));
        this.timeouts.delete(name);
      }
    },
    
    /**
     * Clear all timeouts
     */
    clearAllTimeouts() {
      this.timeouts.forEach(id => clearTimeout(id));
      this.timeouts.clear();
    },

    /**
     * Add an animation to the queue
     * @param {Object} animation - Animation definition
     * @param {string} animation.name - Unique name for the animation
     * @param {Function} animation.execute - Function to execute the animation
     * @param {number} animation.duration - Total duration of the animation in ms
     * @param {number} [animation.priority=0] - Priority level (higher = more important)
     * @param {boolean} [animation.cancelable=true] - Whether this animation can be canceled 
     */
    queueAnimation(animation) {
      if (!animation || !animation.name || !animation.execute || !animation.duration) {
        console.error('❌ Invalid animation passed to queue:', animation);
        return false;
      }

      const existingIndex = this.animationQueue.findIndex(a => a.name === animation.name);
      if (existingIndex >= 0) {
        // Skip if identical animation is already queued
        console.log(`⏭️ Animation "${animation.name}" already in queue, skipping`);
        return false;
      }

      // Set defaults
      const queuedAnimation = {
        ...animation,
        priority: animation.priority || 0,
        cancelable: animation.cancelable !== false,
        timestamp: Date.now()
      };

      // Add to queue
      this.animationQueue.push(queuedAnimation);
      console.log(`➕ Added "${animation.name}" to animation queue (${this.animationQueue.length} total)`);
      
      // If not currently animating, start processing queue
      if (!this.currentlyAnimating) {
        this.processNextAnimation();
      }

      return true;
    },

    /**
     * Process the next animation in the queue
     */
    processNextAnimation() {
      if (this.currentlyAnimating || this.animationQueue.length === 0) {
        return;
      }

      // Sort by priority (highest first), then timestamp (oldest first)
      this.animationQueue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.timestamp - b.timestamp; // Older timestamp first
      });

      // Get the next animation
      const nextAnimation = this.animationQueue.shift();
      this.currentlyAnimating = true;

      console.log(`▶️ Executing animation "${nextAnimation.name}" (duration: ${nextAnimation.duration}ms)`);
      
      // Run the animation
      try {
        nextAnimation.execute();
      } catch (error) {
        console.error(`❌ Error executing animation "${nextAnimation.name}":`, error);
      }

      // Schedule next animation after this one finishes (plus safety buffer)
      const totalDuration = nextAnimation.duration + TIMING.SAFETY_BUFFER;
      this.setTimeout(`queue-next-${nextAnimation.name}`, () => {
        this.currentlyAnimating = false;
        console.log(`✅ Animation "${nextAnimation.name}" completed`);
        this.processNextAnimation();
      }, totalDuration);
    },

    /**
     * Clear the animation queue
     * @param {boolean} [keepUncancelable=true] - Whether to keep uncancelable animations 
     */
    clearAnimationQueue(keepUncancelable = true) {
      if (keepUncancelable) {
        // Filter out cancelable animations
        const uncancelableCount = this.animationQueue.filter(a => !a.cancelable).length;
        this.animationQueue = this.animationQueue.filter(a => !a.cancelable);
        console.log(`🧹 Cleared animation queue, kept ${uncancelableCount} uncancelable animations`);
      } else {
        // Clear all
        this.animationQueue = [];
        console.log('🧹 Cleared entire animation queue');
      }
    }
  };
  
  return coordinator;
}

// Create and export singleton instance
export const animationCoordinator = createAnimationCoordinator();