<script context="module">
  // Removed module-level state related to old modals
</script>

<script>
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { geminiService } from '$lib/services/geminiService';
  import AudioToText from '$lib/components/AudioToText.svelte';
  import Ghost from '$lib/components/Ghost.svelte';
  import AnimatedTitle from '$lib/components/AnimatedTitle.svelte';
  import { PageLayout } from '$lib/components/layout';
  import { themeService } from '$lib/services/theme';
  import { modalService } from '$lib/services/modals';
  import { firstVisitService, isFirstVisit } from '$lib/services/first-visit';
  import { 
    pwaService, 
    deferredInstallPrompt, 
    showPwaInstallPrompt 
  } from '$lib/services/pwa';
  import { isRecording as recordingStore } from '$lib/services';
  
  // Import modals lazily
  import { AboutModal, ExtensionModal, IntroModal } from '$lib/components/modals';

  // Lazy load settings modal - only import when needed
  let SettingsModal;
  let loadingSettingsModal = false;
  
  // PWA Install Prompt component - lazy loaded
  let PwaInstallPrompt;
  let loadingPwaPrompt = false;

  // Track speech model preloading state
  let speechModelPreloaded = false;

  // PWA Install Prompt Logic is now handled by pwaService

  // --- Ghost State Variables ---
  // Use the store value directly with $ prefix
  let isProcessing = false;
  let ghostAnimationState = 'idle'; // Possible values: 'idle', 'wobble-start', 'wobble-stop'

  // Create a reusable Svelte action for handling clicks outside an element
  function clickOutside(node, { enabled = true, callback = () => {} }) {
    const handleClick = (event) => {
      if (!node.contains(event.target) && !event.defaultPrevented && enabled) {
        callback();
      }
    };

    document.addEventListener('click', handleClick, true);

    return {
      update(params) {
        enabled = params.enabled;
        callback = params.callback;
      },
      destroy() {
        document.removeEventListener('click', handleClick, true);
      }
    };
  }

  let audioToTextComponent; // Still needed to trigger start/stop

  // Debug Helper that won't pollute console in production but helps during development
  function debug(message) {
    // Uncomment the line below during development for verbose logging
    // console.log(`[TalkType Page] ${message}`);
  }

  // Animation state variables (for title/subtitle, not ghost)
  let titleAnimationComplete = false;
  let subtitleAnimationComplete = false;

  // --- MINIMAL Event Handlers - Just State Updates ---
  function handleRecordingStart() {
    isProcessing = false;
  }

  function handleRecordingStop() {
    // No need to set isRecording - it's handled by the store
  }

  function handleProcessingStart() {
    isProcessing = true;
  }

  function handleProcessingEnd() {
    isProcessing = false;
  }

  // Function to handle title animation complete
  function handleTitleAnimationComplete() {
    debug('Title animation complete');
    titleAnimationComplete = true;
  }

  // Function to handle subtitle animation complete
  function handleSubtitleAnimationComplete() {
    debug('Subtitle animation complete');
    subtitleAnimationComplete = true;
  }

  // Function to trigger ghost click
  function triggerGhostClick() {
    debug('Triggering ghost click after intro modal close');
    // Simply call handleToggleRecording which will set animation state and handle recording
    handleToggleRecording();
  }
  
  // Handle the toggle recording action
  function handleToggleRecording() {
    debug('Toggle recording triggered by Ghost component');
    
    // Set animation state based on current recording state from the store
    if ($recordingStore) {
      // Set animation state to wobble-stop
      ghostAnimationState = 'wobble-stop';
      
      // Call stopRecording if component is available
      if (audioToTextComponent) {
        debug('Calling stopRecording()');
        audioToTextComponent.stopRecording();
      } else {
        debug('audioToTextComponent not available');
      }
    } else {
      // Set animation state to wobble-start
      ghostAnimationState = 'wobble-start';
      
      // Preload model and start recording if component is available
      if (audioToTextComponent) {
        // Preload model if user clicks before hovering
        preloadSpeechModel();
        debug('Calling startRecording()');
        audioToTextComponent.startRecording();
      } else {
        debug('audioToTextComponent not available');
      }
    }
    
    // Reset animation state after a short delay
    setTimeout(() => {
      ghostAnimationState = 'idle';
    }, 700); // Slightly longer than animation duration
  }

  // Function to preload speech model for faster initial response
  function preloadSpeechModel() {
    if (!speechModelPreloaded && browser) {
      debug('Preloading speech model for faster response');
      speechModelPreloaded = true; // Assume success initially
      
      // Make sure the current prompt style is set before preloading
      if (browser && localStorage.getItem('talktype-prompt-style')) {
        const savedStyle = localStorage.getItem('talktype-prompt-style');
        debug(`Setting prompt style from localStorage: ${savedStyle}`);
        geminiService.setPromptStyle(savedStyle);
      }
      
      // Log available prompt styles
      const availableStyles = geminiService.getAvailableStyles();
      debug(`Available prompt styles: ${availableStyles.join(', ')}`);
      
      geminiService.preloadModel()
        .then(() => {
          debug('Speech model preloaded successfully.');
        })
        .catch(err => {
          // Just log the error, don't block UI
          console.error('Error preloading speech model:', err);
          debug(`Error preloading speech model: ${err.message}`);
          // Reset so we can try again
          speechModelPreloaded = false;
        });
    } else if (speechModelPreloaded) {
      debug('Speech model already preloaded or preloading.');
    }
  }

  // Reference to the Ghost component
  let ghostComponent;

  // Component lifecycle
  onMount(() => {
    // Initialize theme
    themeService.initializeTheme();

      // No longer need the document event listener as we now use Svelte events

    // Pre-load the SettingsModal component after a short delay
    setTimeout(async () => {
      if (!SettingsModal && !loadingSettingsModal) {
        try {
          loadingSettingsModal = true;
          debug('Pre-loading SettingsModal component');
          const module = await import('$lib/components/settings/SettingsModal.svelte');
          SettingsModal = module.default;
          loadingSettingsModal = false;
          debug('SettingsModal component pre-loaded successfully');
        } catch (err) {
          console.error('Error pre-loading SettingsModal:', err);
          loadingSettingsModal = false;
        }
      }
    }, 1000);

    // Check for auto-record setting and start recording if enabled
    if (browser && localStorage.getItem('talktype-autoRecord') === 'true') {
      // Wait minimal time for component initialization
      setTimeout(() => {
        if (audioToTextComponent && !isRecording) { // Check local isRecording state
          debug('Auto-record enabled, attempting to start recording immediately');
          try {
            audioToTextComponent.startRecording(); // This will trigger handleRecordingStart
            debug('Auto-record: Called startRecording()');
          } catch (err) {
            debug(`Auto-record: Error starting recording: ${err.message}`);
          }
        } else {
          debug('Auto-record: Conditions not met (no component or already recording).');
        }
      }, 500); // Reduced delay - just enough for component initialization
    } else {
      debug('Auto-record not enabled or not in browser.');
    }

    // Listen for settings changes
    if (browser) {
      window.addEventListener('talktype-setting-changed', (event) => {
        if (event.detail && event.detail.setting === 'autoRecord') {
          debug(`Setting changed event: autoRecord = ${event.detail.value}`);
          // No immediate action needed, setting will apply on next page load/refresh
        }
        
        if (event.detail && event.detail.setting === 'promptStyle') {
          debug('Prompt style setting changed:', event.detail.value);
          // Update the prompt style in the service
          geminiService.setPromptStyle(event.detail.value);
        }
      });
      debug('Added listener for settings changes.');
    }

    // Check if first visit to show intro
    firstVisitService.showIntroModal();
    
    // PWA initialization is now handled by the pwaService

    return () => {
      debug('Component unmounting, clearing timeouts and event listeners');
    };
  });

  // Function to show the About modal
  function showAboutModal() {
    debug('showAboutModal called');
    modalService.openModal('about_modal');
  }

  // Function to show the Extension modal
  function showExtensionModal() {
    debug('showExtensionModal called');
    modalService.openModal('extension_modal');
  }

  // Function to show the Settings modal
  async function openSettingsModal() {
    debug('openSettingsModal called');
    
    // First, ensure any open dialogs are closed
    if (modalService.isModalOpen()) {
      debug('Another modal was open, closing it first.');
      modalService.closeModal();
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Check if we're already loading the modal
    if (loadingSettingsModal) {
      debug('SettingsModal is already loading, aborting.');
      return;
    }

    // Dynamically import the SettingsModal component if not already loaded
    if (!SettingsModal) {
      loadingSettingsModal = true;
      debug('Lazy loading SettingsModal component...');

      try {
        // Import the component dynamically
        const module = await import('$lib/components/settings/SettingsModal.svelte');
        SettingsModal = module.default;
        debug('SettingsModal component loaded successfully');
      } catch (err) {
        console.error('Error loading SettingsModal:', err);
        debug(`Error loading SettingsModal: ${err.message}`);
        loadingSettingsModal = false;
        return; // Don't proceed if loading failed
      } finally {
        loadingSettingsModal = false; // Ensure this is always reset
      }
    }

    // Open the settings modal
    modalService.openModal('settings_modal');
  }

  // Function to close the Settings modal
  function closeSettingsModal() {
    debug('closeSettingsModal called (likely from component event)');
    modalService.closeModal();
  }

  // Function to close modals (used by modal components)
  function closeModal() {
    modalService.closeModal();
  }

  /**
   * Handles the transcriptionCompleted event from AudioToText.
   * The actual PWA prompt logic is now handled by pwaService.
   * @param {CustomEvent<{count: number}>} event
   */
  async function handleTranscriptionCompleted(event) {
    if (!browser) return;

    const newCount = event.detail.count;
    debug(`🔔 Transcription completed event received. Count: ${newCount}`);

    // The PWA service handles most of the logic, but we need to lazy-load the component
    if ($showPwaInstallPrompt && !PwaInstallPrompt) {
      loadingPwaPrompt = true;
      debug('📱 Lazy loading PWA install prompt component...');

      try {
        // Import the component dynamically
        const module = await import('$lib/components/pwa/PwaInstallPrompt.svelte');
        PwaInstallPrompt = module.default;
        debug('📱 PWA install prompt component loaded successfully');
      } catch (err) {
        console.error('Error loading PWA install prompt:', err);
        debug(`Error loading PWA install prompt: ${err.message}`);
      } finally {
        loadingPwaPrompt = false;
      }
    }
  }

  /**
   * Closes the PWA install prompt.
   */
  function closePwaInstallPrompt() {
    debug('ℹ️ PWA install prompt dismissed.');
    pwaService.dismissPrompt();
  }
</script>

<PageLayout>
  <!-- Ghost Icon using the component -->
  <div class="ghost-icon-wrapper mb-4 h-36 w-36 sm:h-40 sm:w-40 md:mb-0 md:h-56 md:w-56 lg:h-64 lg:w-64">
    <Ghost
      bind:this={ghostComponent}
      isRecording={$recordingStore}
      {isProcessing}
      animationState={ghostAnimationState}
      on:toggleRecording={handleToggleRecording}
    />
  </div>

  <AnimatedTitle 
    on:titleAnimationComplete={handleTitleAnimationComplete}
    on:subtitleAnimationComplete={handleSubtitleAnimationComplete}
  />

  <!-- Audio component - Wider container for better transcript layout -->
  <div class="w-full max-w-xl mt-4 sm:mt-0 sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
    <AudioToText
      bind:this={audioToTextComponent}
      isModelPreloaded={speechModelPreloaded}
      onPreloadRequest={preloadSpeechModel}
      ghostComponent={ghostComponent}
      on:transcriptionCompleted={handleTranscriptionCompleted}
      on:recordingstart={handleRecordingStart}
      on:recordingstop={handleRecordingStop}
      on:processingstart={handleProcessingStart}
      on:processingend={handleProcessingEnd}
    />
  </div>

  <svelte:fragment slot="footer-buttons">
    <button
      class="btn btn-sm btn-ghost text-gray-600 hover:text-pink-500 shadow-none hover:bg-pink-50/50 transition-all text-xs sm:text-sm py-2 px-3 sm:px-4 sm:py-2.5 h-auto min-h-0"
      on:click={showAboutModal}
      aria-label="About TalkType"
    >
      About
    </button>
    <button
      class="btn btn-sm btn-ghost text-gray-600 hover:text-pink-500 shadow-none hover:bg-pink-50/50 transition-all text-xs sm:text-sm py-2 px-3 sm:px-4 sm:py-2.5 h-auto min-h-0"
      on:click={openSettingsModal}
      aria-label="Open Settings"
    >
      Settings
    </button>
    <button
      class="btn btn-sm bg-gradient-to-r from-pink-50 to-purple-100 text-purple-600 border-none hover:bg-opacity-90 shadow-sm hover:shadow transition-all text-xs sm:text-sm py-2 px-3 sm:px-4 sm:py-2.5 h-auto min-h-0"
      on:click={showExtensionModal}
      aria-label="Chrome Extension Information"
    >
      Chrome Extension
    </button>
  </svelte:fragment>
</PageLayout>

<!-- Modals -->
<AboutModal closeModal={closeModal} />
<ExtensionModal closeModal={closeModal} />
<IntroModal 
  closeModal={closeModal} 
  markIntroAsSeen={() => firstVisitService.markIntroAsSeen()} 
  triggerGhostClick={triggerGhostClick} 
/>

<!-- Settings Modal - lazy loaded -->
{#if SettingsModal}
  <!-- Pass the close function down to the component -->
  <svelte:component this={SettingsModal} on:close={closeSettingsModal} />
{/if}

<!-- PWA Install Prompt -->
{#if $showPwaInstallPrompt && PwaInstallPrompt}
  <svelte:component
    this={PwaInstallPrompt}
    installPromptEvent={$deferredInstallPrompt}
    on:closeprompt={closePwaInstallPrompt}
  />
{/if}

<style>
  /* Ghost icon wrapper styling */
  .ghost-icon-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
  }
  
  @media (min-width: 768px) {
    .ghost-icon-wrapper {
      margin-bottom: 1.5rem;
    }
  }
</style>