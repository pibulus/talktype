<!--
  This is the main component for audio recording and transcription.
  It handles recording, transcription, clipboard operations, and UI feedback.
-->
<script>
  import { geminiService } from '$lib/services/geminiService';
  import { promptStyle } from '$lib';
  import { onMount, onDestroy } from 'svelte';
  import AudioVisualizer from './AudioVisualizer.svelte';
  import RecordButton from './RecordButton.svelte';
  import TranscriptDisplay from './TranscriptDisplay.svelte';
  import PermissionError from './PermissionError.svelte';
  import { 
    ANIMATION, 
    CTA_PHRASES, 
    ATTRIBUTION, 
    getRandomFromArray 
  } from '$lib/constants';
  import { 
    initializeServices, 
    audioService, 
    transcriptionService, 
    // Stores
    isRecording,
    isTranscribing,
    transcriptionProgress,
    transcriptionText,
    recordingDuration,
    errorMessage,
    uiState,
    audioState,
    hasPermissionError,
    // Actions
    audioActions,
    transcriptionActions,
    uiActions
  } from '$lib/services';

  // Helper variable to check if we're in a browser environment
  const browser = typeof window !== 'undefined';

  // Service instances
  let services;
  let unsubscribers = [];

  // DOM element references
  let eyesElement;
  let ghostIconElement;
  let progressContainerElement;
  
  // Local component state
  let showCopyTooltip = false;
  let screenReaderStatus = ''; // For ARIA announcements
  let isPremiumUser = false; // Change this to true to enable premium features

  // These will be set from the parent component
  export let parentEyesElement = null;
  export let parentGhostIconElement = null;
  export let isModelPreloaded = false;
  export let onPreloadRequest = null;

  // Prompt style subscription
  let currentPromptStyle;
  const unsubscribePromptStyle = promptStyle.subscribe((value) => {
    currentPromptStyle = value;
  });

  // Export recording state and functions for external components
  export const recording = isRecording; // Export the isRecording store
  export { stopRecording, startRecording };

  // PWA Installation State Tracking - Added from stable-working-version
  const TRANSCRIPTION_COUNT_KEY = 'talktype-transcription-count';
  const PWA_PROMPT_SHOWN_KEY = 'talktype-pwa-prompt-shown';
  const PWA_PROMPT_COUNT_KEY = 'talktype-pwa-prompt-count';
  const PWA_LAST_PROMPT_DATE_KEY = 'talktype-pwa-last-prompt-date';
  const PWA_INSTALLED_KEY = 'talktype-pwa-installed';

  // Export PWA installation state functions
  export {
    shouldShowPWAPrompt,
    recordPWAPromptShown,
    markPWAAsInstalled,
    isRunningAsPWA
  };

  /**
   * Retrieves the current transcription count from localStorage.
   * Returns 0 if not found or not in a browser environment.
   * @returns {number} The current transcription count.
   */
  function getTranscriptionCount() {
    if (!browser) {
      return 0; // Not in browser, cannot access localStorage
    }
    try {
      const countStr = localStorage.getItem(TRANSCRIPTION_COUNT_KEY);
      const count = parseInt(countStr || '0', 10);
      return isNaN(count) ? 0 : count;
    } catch (error) {
      console.error('Error reading transcription count from localStorage:', error);
      return 0; // Return 0 on error
    }
  }

  /**
   * Increments the transcription count in localStorage and dispatches an event.
   * Only runs in a browser environment.
   */
  function incrementTranscriptionCount() {
    if (!browser) {
      return; // Not in browser, cannot access localStorage
    }
    try {
      const currentCount = getTranscriptionCount();
      const newCount = currentCount + 1;
      localStorage.setItem(TRANSCRIPTION_COUNT_KEY, newCount.toString());
      console.log(`📈 Transcription count incremented to: ${newCount}`);
      
      // Dispatch event to parent
      dispatchEvent(new CustomEvent('transcriptionCompleted', { detail: { count: newCount }}));
    } catch (error) {
      console.error('Error incrementing transcription count in localStorage:', error);
    }
  }

  /**
   * Checks if the PWA installation prompt should be shown.
   * Bases decision on transcription count, time since last prompt, and installation status.
   * @returns {boolean} Whether the PWA installation prompt should be shown.
   */
  function shouldShowPWAPrompt() {
    if (!browser) {
      return false; // Not in browser, cannot check installation state
    }

    try {
      // Check if the app is already installed as a PWA
      const isInstalled = localStorage.getItem(PWA_INSTALLED_KEY) === 'true';
      if (isInstalled) {
        return false; // Don't show prompt if already installed
      }

      // Get the transcription count
      const transcriptionCount = getTranscriptionCount();

      // Check if we've shown the prompt before
      const hasShownPrompt = localStorage.getItem(PWA_PROMPT_SHOWN_KEY) === 'true';

      // Get how many times we've shown the prompt
      const promptCount = parseInt(localStorage.getItem(PWA_PROMPT_COUNT_KEY) || '0', 10);

      // Get the date when we last showed the prompt
      const lastPromptDate = localStorage.getItem(PWA_LAST_PROMPT_DATE_KEY);

      // If we've never shown the prompt before, show it after 3 transcriptions
      if (!hasShownPrompt && transcriptionCount >= 3) {
        return true;
      }

      // If we've shown the prompt 1-2 times before, check if enough time has passed
      // and enough new transcriptions have happened
      if (hasShownPrompt && promptCount < 3) {
        const daysSinceLastPrompt = lastPromptDate
          ? Math.floor((Date.now() - new Date(lastPromptDate).getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        // Show again after at least 3 days and 5 more transcriptions
        if (daysSinceLastPrompt >= 3 && transcriptionCount >= 5) {
          return true;
        }
      }

      // If we've shown the prompt 3 or more times, be more conservative
      if (promptCount >= 3) {
        const daysSinceLastPrompt = lastPromptDate
          ? Math.floor((Date.now() - new Date(lastPromptDate).getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        // Show again after at least 14 days (2 weeks) and 10 more transcriptions
        if (daysSinceLastPrompt >= 14 && transcriptionCount >= 10) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking if PWA prompt should be shown:', error);
      return false; // Default to not showing on error
    }
  }

  /**
   * Records that the PWA installation prompt was shown.
   * Updates the prompt count, shown status, and last prompt date.
   */
  function recordPWAPromptShown() {
    if (!browser) {
      return;
    }

    try {
      // Mark that we've shown the prompt
      localStorage.setItem(PWA_PROMPT_SHOWN_KEY, 'true');

      // Get and increment the prompt count
      const promptCount = parseInt(localStorage.getItem(PWA_PROMPT_COUNT_KEY) || '0', 10);
      localStorage.setItem(PWA_PROMPT_COUNT_KEY, (promptCount + 1).toString());

      // Record the current date
      localStorage.setItem(PWA_LAST_PROMPT_DATE_KEY, new Date().toISOString());

      console.log(`📱 PWA installation prompt shown (count: ${promptCount + 1})`);
    } catch (error) {
      console.error('Error recording PWA prompt shown:', error);
    }
  }

  /**
   * Marks the PWA as installed in localStorage.
   * This prevents further installation prompts.
   */
  function markPWAAsInstalled() {
    if (!browser) {
      return;
    }

    try {
      localStorage.setItem(PWA_INSTALLED_KEY, 'true');
      console.log('📱 PWA marked as installed');
    } catch (error) {
      console.error('Error marking PWA as installed:', error);
    }
  }

  /**
   * Checks if the app is running as an installed PWA.
   * @returns {boolean} Whether the app is running as an installed PWA.
   */
  function isRunningAsPWA() {
    if (!browser) {
      return false;
    }

    try {
      // Different ways to detect if running as PWA
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
      const isMinimalUi = window.matchMedia('(display-mode: minimal-ui)').matches;
      const isInPWA = navigator.standalone || // iOS
        isStandalone || isFullscreen || isMinimalUi;

      // If we detect it's a PWA, also mark it in localStorage
      if (isInPWA) {
        markPWAAsInstalled();
      }

      return isInPWA;
    } catch (error) {
      console.error('Error checking if running as PWA:', error);
      return false;
    }
  }
  // End of PWA installation state tracking

  // Function to preload the speech model before recording starts
  function preloadSpeechModel() {
    if (onPreloadRequest) {
      onPreloadRequest();
    }
  }

  async function startRecording() {
    // Don't start if we're already recording
    if ($isRecording) return;

    // Try to preload the speech model if not already done
    preloadSpeechModel();

    // Reset UI state
    uiActions.clearErrorMessage();
    
    // We don't need to set up recording timer manually anymore
    // The store takes care of it

    // Scroll to bottom when recording starts
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, ANIMATION.RECORDING.SCROLL_DELAY);

    try {
      // Subtle pulse ghost icon when starting recording
      const icon = ghostIconElement || parentGhostIconElement;
      if (icon) {
        icon.classList.add('ghost-pulse');
        setTimeout(() => {
          icon.classList.remove('ghost-pulse');
        }, ANIMATION.GHOST.PULSE_DURATION);
      }

      // Start recording using the AudioService
      await audioService.startRecording();
      
      // State is tracked through stores now
    } catch (err) {
      console.error('❌ Error in startRecording:', err);
      uiActions.setErrorMessage(`Recording error: ${err.message || 'Unknown error'}`);
    }
  }

  async function stopRecording() {
    try {
      // Get current recording state
      if (!$isRecording) {
        return;
      }

      // Add wobble animation to ghost when recording stops
      const ghostIcon = ghostIconElement || parentGhostIconElement;
      if (ghostIcon) {
        // Add slight randomness to the wobble
        const wobbleClass = Math.random() > 0.5 ? 'ghost-wobble-left' : 'ghost-wobble-right';
        ghostIcon.classList.add(wobbleClass);
        setTimeout(() => {
          ghostIcon.classList.remove(wobbleClass);
        }, ANIMATION.GHOST.WOBBLE_DURATION);
      }

      // Make the ghost look like it's thinking hard
      ghostThinkingHard();

      // Stop recording and get the audio blob
      const audioBlob = await audioService.stopRecording();

      // Add confetti celebration for successful transcription (randomly 1/7 times)
      if (audioBlob && audioBlob.size > 10000 && Math.floor(Math.random() * 7) === 0) {
        setTimeout(() => {
          showConfettiCelebration();
        }, 2000);
      }

      // Start transcription process if we have audio data
      if (audioBlob && audioBlob.size > 0) {
        await transcriptionService.transcribeAudio(audioBlob);

        // Schedule scroll to bottom when transcript is complete
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.scrollTo({
              top: document.body.scrollHeight,
              behavior: 'smooth'
            });
          }
        }, ANIMATION.RECORDING.POST_RECORDING_SCROLL_DELAY);
        
        // Increment the transcription count for PWA prompt
        if (browser && 'requestIdleCallback' in window) {
          window.requestIdleCallback(() => incrementTranscriptionCount());
        } else {
          setTimeout(incrementTranscriptionCount, 0);
        }
      } else {
        // If no audio data, revert UI state
        transcriptionActions.updateProgress(0);
        uiActions.setErrorMessage('No audio recorded. Please try again.');
      }
    } catch (err) {
      console.error('❌ Error in stopRecording:', err);
      uiActions.setErrorMessage(`Error processing recording: ${err.message || 'Unknown error'}`);
    }
  }

  function toggleRecording() {
    try {
      if ($isRecording) {
        // Haptic feedback for stop - single pulse
        services.hapticService.stopRecording();

        stopRecording();
        // Screen reader announcement
        uiActions.setScreenReaderMessage('Recording stopped.');
      } else {
        // Haptic feedback for start - double pulse
        services.hapticService.startRecording();

        // When using "New Recording" button, rotate to next phrase immediately
        if ($transcriptionText) {
          console.log('🧹 Clearing transcript for new recording');

          // Pick a random CTA phrase that's not the current one
          let newIndex;
          do {
            newIndex = Math.floor(Math.random() * (CTA_PHRASES.length - 1)) + 1; // Skip first one (Start Recording)
          } while (newIndex === currentCtaIndex);

          currentCtaIndex = newIndex;
          currentCta = CTA_PHRASES[currentCtaIndex];
          console.log(`🔥 Rotating to: "${currentCta}"`);

          // Then clear transcript
          transcriptionActions.completeTranscription('');
        }

        startRecording();
        // Screen reader announcement
        uiActions.setScreenReaderMessage('Recording started. Speak now.');
      }
    } catch (err) {
      console.error('Recording operation failed:', err);

      // Show error message using existing toast system
      uiActions.setErrorMessage(`Recording error: ${err.message || 'Unknown error'}`);

      // Haptic feedback for error
      services.hapticService.error();

      // Update screen reader status
      uiActions.setScreenReaderMessage('Recording failed. Please try again.');
    }
  }

  // Ghost expression functions - add personality through blinking
  function ghostThinkingHard() {
    // Try using the element from the parent component first
    if (parentEyesElement) {
      parentEyesElement.classList.add('blink-thinking-hard');
    } else if (eyesElement) {
      eyesElement.classList.add('blink-thinking-hard');
    }
  }

  function ghostStopThinking() {
    // Try using the element from the parent component first
    if (parentEyesElement) {
      parentEyesElement.classList.remove('blink-thinking-hard');
    } else if (eyesElement) {
      eyesElement.classList.remove('blink-thinking-hard');
    }
  }

  function ghostReactToTranscript(textLength = 0) {
    if (!eyesElement && !parentEyesElement) return;
    
    const eyes = eyesElement || parentEyesElement;
    
    if (textLength > 20) {
      // For longer transcripts, do a "satisfied" double blink
      setTimeout(() => {
        eyes.classList.add('blink-once');
        setTimeout(() => {
          eyes.classList.remove('blink-once');
          setTimeout(() => {
            eyes.classList.add('blink-once');
            setTimeout(() => {
              eyes.classList.remove('blink-once');
            }, ANIMATION.GHOST.THINKING_BLINK_RATE);
          }, ANIMATION.GHOST.THINKING_BLINK_RATE);
        }, ANIMATION.GHOST.THINKING_BLINK_RATE);
      }, ANIMATION.GHOST.REACTION_DELAY);
    } else if (textLength > 0) {
      // For short transcripts, just do a single blink
      setTimeout(() => {
        eyes.classList.add('blink-once');
        setTimeout(() => {
          eyes.classList.remove('blink-once');
        }, ANIMATION.BLINK.SINGLE_DURATION);
      }, ANIMATION.GHOST.REACTION_DELAY);
    }
  }

  // Confetti celebration effect for successful transcription
  function showConfettiCelebration() {
    // Only run in browser environment
    if (!browser) return;

    // Create a container for the confetti
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    // Create and animate confetti pieces
    for (let i = 0; i < ANIMATION.CONFETTI.PIECE_COUNT; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';

      // Random styling
      const size = Math.random() * (ANIMATION.CONFETTI.MAX_SIZE - ANIMATION.CONFETTI.MIN_SIZE) + ANIMATION.CONFETTI.MIN_SIZE;
      const color = ANIMATION.CONFETTI.COLORS[Math.floor(Math.random() * ANIMATION.CONFETTI.COLORS.length)];

      // Shape variety (circle, square, triangle)
      const shape = Math.random() > 0.66 ? 'circle' : Math.random() > 0.33 ? 'triangle' : 'square';

      // Set styles
      confetti.style.width = `${size}px`;
      confetti.style.height = `${size}px`;
      confetti.style.background = color;
      confetti.style.borderRadius = shape === 'circle' ? '50%' : shape === 'triangle' ? '0' : '2px';
      if (shape === 'triangle') {
        confetti.style.background = 'transparent';
        confetti.style.borderBottom = `${size}px solid ${color}`;
        confetti.style.borderLeft = `${size / 2}px solid transparent`;
        confetti.style.borderRight = `${size / 2}px solid transparent`;
        confetti.style.width = '0';
        confetti.style.height = '0';
      }

      // Random position and animation duration
      const startPos = Math.random() * 100; // Position 0-100%
      const delay = Math.random() * 0.8; // Delay variation (0-0.8s)
      const duration = Math.random() * 2 + 2; // Animation duration (2-4s)
      const rotation = Math.random() * 720 - 360; // Rotation -360 to +360 degrees

      // Apply positions and animation styles
      const horizontalPos = Math.random() * 10 - 5; // Small horizontal variation
      confetti.style.left = `calc(${startPos}% + ${horizontalPos}px)`;
      const startOffset = Math.random() * 15 - 7.5; // Starting y-position variation
      confetti.style.top = `${startOffset}px`;
      confetti.style.animationDelay = `${delay}s`;
      confetti.style.animationDuration = `${duration}s`;

      // Choose a random easing function for variety
      const easing =
        Math.random() > 0.7
          ? 'cubic-bezier(0.25, 0.1, 0.25, 1)'
          : Math.random() > 0.5
            ? 'cubic-bezier(0.42, 0, 0.58, 1)'
            : 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      confetti.style.animationTimingFunction = easing;
      confetti.style.transform = `rotate(${rotation}deg)`;

      // Add to container
      container.appendChild(confetti);
    }

    // Remove container after animation completes
    setTimeout(() => {
      document.body.removeChild(container);
    }, ANIMATION.CONFETTI.ANIMATION_DURATION);
  }

  // Function to calculate responsive font size based on transcript length and device
  function getResponsiveFontSize(text) {
    if (!text) return 'text-base'; // Default size

    // Get viewport width for more responsive sizing
    let viewportWidth = 0;
    if (typeof window !== 'undefined') {
      viewportWidth = window.innerWidth;
    }

    // Smaller base sizes for mobile
    const isMobile = viewportWidth > 0 && viewportWidth < 640;

    const length = text.length;
    if (length < 50) return isMobile ? 'text-lg sm:text-xl md:text-2xl' : 'text-xl md:text-2xl'; // Very short text
    if (length < 150) return isMobile ? 'text-base sm:text-lg md:text-xl' : 'text-lg md:text-xl'; // Short text
    if (length < 300) return isMobile ? 'text-sm sm:text-base md:text-lg' : 'text-base md:text-lg'; // Medium text
    if (length < 500) return isMobile ? 'text-xs sm:text-sm md:text-base' : 'text-sm md:text-base'; // Medium-long text
    return isMobile ? 'text-xs sm:text-sm' : 'text-sm md:text-base'; // Long text
  }

  // Reactive font size based on transcript length
  $: responsiveFontSize = getResponsiveFontSize($transcriptionText);

  // CTA rotation
  let currentCtaIndex = 0;
  let currentCta = CTA_PHRASES[currentCtaIndex];
  
  // Button label computation - fixed to show CTA phrases
  $: buttonLabel = $isRecording ? 'Stop Recording' : $transcriptionText ? currentCta : currentCta;

  // Handler for transcript component events
  function handleTranscriptEvent(event) {
    const { type, detail } = event;
    
    if (type === 'copy') {
      // Get the current text from the transcript component ref
      const transcriptRef = event.target.getEditedTranscript();
      transcriptionService.copyToClipboard(transcriptRef);
    } else if (type === 'share') {
      const transcriptRef = event.target.getEditedTranscript();
      transcriptionService.shareTranscript(transcriptRef);
    } else if (type === 'focus') {
      uiActions.setScreenReaderMessage(detail.message);
    }
  }

  // State changes for transcript completion
  function handleTranscriptCompletion() {
    // React to transcript with ghost expression based on length
    ghostReactToTranscript($transcriptionText?.length || 0);
    
    // Stop thinking animation
    ghostStopThinking();

    // Automatically copy to clipboard when transcription finishes
    if ($transcriptionText) {
      transcriptionService.copyToClipboard($transcriptionText);
    }
  }

  // Lifecycle hooks
  onMount(() => {
    // Initialize services
    services = initializeServices({ debug: false });

    // Set local references using parent elements if available
    eyesElement = parentEyesElement;
    ghostIconElement = parentGhostIconElement;

    // Subscribe to transcription state for completion events
    const transcriptUnsub = transcriptionText.subscribe(text => {
      if (text && !$isTranscribing) {
        handleTranscriptCompletion();
      }
    });

    // Subscribe to permission denied state to show error modal
    const permissionUnsub = hasPermissionError.subscribe(denied => {
      if (denied) {
        // Show permission error modal
        uiActions.setPermissionError(true);
        
        // Add sad eyes animation
        if (eyesElement || parentEyesElement) {
          const eyes = eyesElement || parentEyesElement;
          eyes.classList.add('eyes-sad');
          setTimeout(() => {
            eyes.classList.remove('eyes-sad');
          }, 2000);
        }
      }
    });

    // Add to unsubscribe list
    unsubscribers.push(transcriptUnsub, permissionUnsub);
    
    // Check if the app is running as a PWA after a short delay
    if (browser) {
      setTimeout(() => {
        const isPWA = isRunningAsPWA();
        if (isPWA) {
          console.log('📱 App is running as PWA');
        }
      }, 100);
    }
  });

  // Clean up subscriptions and services
  onDestroy(() => {
    // Unsubscribe from all subscriptions
    unsubscribers.forEach((unsub) => unsub());

    // Ensure audio resources are released
    audioService.cleanup();

    // Unsubscribe from prompt style
    if (unsubscribePromptStyle) unsubscribePromptStyle();
  });

  // Add/remove recording class on ghost icon when recording state changes
  $: {
    if (typeof window !== 'undefined' && ghostIconElement) {
      if ($isRecording) {
        ghostIconElement.classList.add('recording');
      } else {
        ghostIconElement.classList.remove('recording');
      }
    }
  }

  // Use reactive declarations for progress updates instead of DOM manipulation
  $: progressValue = $transcriptionProgress;
</script>

<!-- Main wrapper with proper containment to prevent layout issues -->
<div class="box-border w-full mx-auto main-wrapper">
  <!-- Shared container with proper centering for mobile -->
  <div class="flex flex-col items-center justify-center w-full mobile-centered-container">
    <!-- Recording button/progress bar section - sticky positioned for stability -->
    <div
      class="relative sticky top-0 z-20 flex justify-center w-full pt-2 pb-4 bg-transparent button-section"
    >
      <div class="button-container mx-auto flex w-full max-w-[500px] justify-center">
        <RecordButton
          recording={$isRecording}
          transcribing={$isTranscribing}
          clipboardSuccess={$uiState.clipboardSuccess}
          recordingDuration={$recordingDuration}
          progress={progressValue}
          {isPremiumUser}
          {buttonLabel}
          on:click={toggleRecording}
          on:preload={preloadSpeechModel}
        />
      </div>
    </div>

    <!-- Dynamic content area with smooth animation and proper containment -->
    <div
      class="relative flex flex-col items-center w-full mt-2 mb-20 transition-all duration-300 ease-in-out position-wrapper"
    >
      <!-- Content container with controlled overflow -->
      <div class="flex flex-col items-center w-full content-container">
        <!-- Audio visualizer - properly positioned -->
        {#if $isRecording}
          <div
            class="absolute top-0 left-0 flex justify-center w-full visualizer-container"
            on:animationend={() => {
              // Scroll to the bottom when visualizer appears
              if (typeof window !== 'undefined') {
                window.scrollTo({
                  top: document.body.scrollHeight,
                  behavior: 'smooth'
                });
              }
            }}
          >
            <div class="flex justify-center w-full wrapper-container">
              <div
                class="visualizer-wrapper mx-auto w-[90%] max-w-[500px] animate-fadeIn rounded-[2rem] border-[1.5px] border-pink-100 bg-white/80 p-4 backdrop-blur-md sm:w-full"
                style="box-shadow: 0 10px 25px -5px rgba(249, 168, 212, 0.3), 0 8px 10px -6px rgba(249, 168, 212, 0.2), 0 0 15px rgba(249, 168, 212, 0.15);"
              >
                <AudioVisualizer />
              </div>
            </div>
          </div>
        {/if}

        <!-- Transcript output - only visible when not recording and has transcript -->
        {#if $transcriptionText && !$isRecording}
          <TranscriptDisplay 
            transcript={$transcriptionText}
            {showCopyTooltip}
            {responsiveFontSize}
            on:copy={handleTranscriptEvent}
            on:share={handleTranscriptEvent}
            on:focus={handleTranscriptEvent}
          />
        {/if}
      </div>

      <!-- Error message -->
      {#if $errorMessage}
        <p class="mt-4 font-medium text-center text-red-500 error-message">
          {$errorMessage}
        </p>
      {/if}
    </div>
  </div>
</div>

<!-- Screen reader only status announcements -->
<div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
  {#if $uiState.screenReaderMessage}
    {$uiState.screenReaderMessage}
  {/if}
</div>

<!-- Permission error modal -->
{#if $uiState.showPermissionError}
  <PermissionError on:close={() => uiActions.setPermissionError(false)} />
{/if}

<style>
  @import '$lib/styles/audioToText.css';
</style>