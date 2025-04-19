<script>
  import { onMount } from 'svelte';
  import { theme, autoRecord, showSettingsModal, applyTheme, promptStyle } from '$lib';
  import { geminiService } from '$lib/services/geminiService';
  import { PROMPT_STYLES } from '$lib/constants';
  
  // Props for the modal
  export let closeModal = () => {};
  
  // Theme/vibe selection
  let selectedVibe;
  let scrollPosition = 0;
  let autoRecordValue = false;
  
  // Prompt style selection
  let promptStyles = [];
  let selectedPromptStyle = 'standard';
  
  // Subscribe to theme store
  const unsubscribeTheme = theme.subscribe(value => {
    selectedVibe = value;
  });
  
  // Subscribe to autoRecord store
  const unsubscribeAutoRecord = autoRecord.subscribe(value => {
    autoRecordValue = value === 'true';
  });
  
  // Subscribe to promptStyle store
  const unsubscribePromptStyle = promptStyle.subscribe(value => {
    selectedPromptStyle = value;
  });
  
  // Theme options with gradient SVG files for ghost and CSS gradients for visualizer
  const vibeOptions = [
    { 
      id: 'peach', 
      name: 'Peach', 
      ghostGradientSrc: '/assets/talktype-icon-bg-gradient.svg',
      visualizerGradient: 'linear-gradient(to top, #ffa573, #ff9f9a, #ff7fcd, #ffb6f3)',
      previewGradient: 'linear-gradient(135deg, #ffa573, #ff8f9a, #ff7fcd, #ffb6f3)'
    },
    { 
      id: 'mint', 
      name: 'Mint', 
      ghostGradientSrc: '/assets/talktype-icon-bg-gradient-mint.svg',
      visualizerGradient: 'linear-gradient(to top, #86efac, #5eead4, #67e8f9)',
      previewGradient: 'linear-gradient(135deg, #86efac, #5eead4, #67e8f9)'
    },
    { 
      id: 'bubblegum', 
      name: 'Bubblegum', 
      ghostGradientSrc: '/assets/talktype-icon-bg-gradient-bubblegum.svg',
      visualizerGradient: 'linear-gradient(to top, #20c5ff, #4d7bff, #c85aff, #ee45f0, #ff3ba0, #ff1a8d)', 
      previewGradient: 'linear-gradient(135deg, #20c5ff, #4d7bff, #c85aff, #ee45f0, #ff1a8d)'
    },
    { 
      id: 'rainbow', 
      name: 'Rainbow',
      ghostGradientSrc: '/assets/talktype-icon-bg-gradient-rainbow.svg',
      visualizerGradient: 'rainbow-gradient', /* Special identifier for rainbow animation */
      previewGradient: 'rainbow',
      animated: true
    }
  ];
  
  // Prompt style mapping for display names
  const promptStyleNames = {
    'standard': 'Standard',
    'surlyPirate': 'Surly Pirate',
    'corporate': 'Corporate'
  };
  
  // Icons for prompt styles
  const promptStyleIcons = {
    'standard': '💬',
    'surlyPirate': '🏴‍☠️',
    'corporate': '💼'
  };
  
  // Set up event listeners for the modal on component mount
  onMount(() => {
    // Get available prompt styles from the service
    promptStyles = geminiService.getAvailableStyles();
    
    // Get currently selected prompt style
    selectedPromptStyle = geminiService.getPromptStyle();
    
    // Set up event listeners for the modal
    const modal = document.getElementById('settings_modal');
    if (modal) {
      // Listen for custom beforeshow event
      modal.addEventListener('beforeshow', () => {
        // Just update the selected value, don't apply theme
        // The main app already has the theme applied
        // This fixes the double flash issue
      });

      // Also listen for the standard dialog open event
      modal.addEventListener('open', () => {
        // No need to apply theme here - we just want settings to reflect current state
        
        // Update prompt style selection in case it was changed elsewhere
        selectedPromptStyle = geminiService.getPromptStyle();
      });
    }
    
    // Clean up subscriptions on component destroy
    return () => {
      unsubscribeTheme();
      unsubscribeAutoRecord();
      unsubscribePromptStyle();
    };
  });
  
  // Handle vibe change
  function changeVibe(vibeId) {
    selectedVibe = vibeId;
    applyTheme(vibeId);
  }
  
  // Handle prompt style change
  function changePromptStyle(style) {
    selectedPromptStyle = style;
    geminiService.setPromptStyle(style);
    
    // Update the store (this will also save to localStorage)
    promptStyle.set(style);
    
    // Dispatch a custom event that the main page can listen for
    window.dispatchEvent(new CustomEvent('talktype-setting-changed', {
      detail: { setting: 'promptStyle', value: style }
    }));
  }
  
  // Handle auto-record toggle
  function toggleAutoRecord() {
    autoRecordValue = !autoRecordValue;
    autoRecord.set(autoRecordValue.toString());
    
    // Dispatch a custom event that the main page can listen for (for backward compatibility)
    window.dispatchEvent(new CustomEvent('talktype-setting-changed', {
      detail: { setting: 'autoRecord', value: autoRecordValue }
    }));
  }
  
  // Handle modal opening - called when the modal is opened
  function handleModalOpen() {
    if (typeof window === 'undefined') return;
    
    // Get current scroll position
    scrollPosition = window.scrollY;
    const width = document.body.clientWidth;
    
    // Lock the body in place exactly where it was
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.width = `${width}px`;
    document.body.style.overflow = 'hidden';
  }
  
  // Handle modal closure - called when the modal is closed
  function handleModalClose() {
    // Restore body styles
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    
    // Restore scroll position
    window.scrollTo(0, scrollPosition);
    
    // Call the passed closeModal function
    closeModal();
  }
  
  // No need to watch for changes since we'll use direct DOM methods
  // When this component is initialized, we just make sure the modal exists
</script>

<dialog id="settings_modal" class="modal fixed z-50" style="overflow: hidden !important; z-index: 999;" role="dialog" aria-labelledby="settings_modal_title" aria-modal="true">
  <div class="modal-box bg-gradient-to-br from-[#fffaef] to-[#fff6e6] shadow-xl border border-pink-200 rounded-2xl overflow-y-auto max-h-[80vh] w-[95%] max-w-md md:max-w-lg animate-modal-enter relative">
    <form method="dialog">
      <button 
        class="close-btn absolute right-3 top-3 z-50 h-9 w-9 rounded-full bg-pink-100 border border-pink-200 text-pink-500 hover:bg-pink-200 hover:text-pink-700 shadow-sm transition-all duration-200 ease-in-out flex items-center justify-center"
        on:click={handleModalClose}
      >
        <span class="text-lg font-medium leading-none relative top-[-1px]">✕</span>
      </button>
    </form>
    
    <div class="animate-fadeUp space-y-6">
      <div class="flex items-center gap-3 mb-1">
        <div class="w-9 h-9 bg-gradient-to-br from-white to-pink-50 rounded-full flex items-center justify-center shadow-sm border border-pink-200/60">
          <div class="relative w-7 h-7">
            <img src="/talktype-icon-bg-gradient.svg" alt="" class="absolute inset-0 w-full h-full" />
            <img src="/assets/talktype-icon-base.svg" alt="" class="absolute inset-0 w-full h-full" />
            <img src="/assets/talktype-icon-eyes.svg" alt="" class="absolute inset-0 w-full h-full" />
          </div>
        </div>
        <h3 id="settings_modal_title" class="font-black text-xl text-gray-800 tracking-tight">Settings</h3>
      </div>

      <!-- Vibe Selector Section -->
      <!-- Behavior Settings Section -->
      <div class="space-y-3 mb-5">
        <h4 class="text-sm font-bold text-gray-700">Behavior</h4>
        
        <div class="flex items-center justify-between p-3 rounded-xl border border-pink-100 bg-[#fffdf5] shadow-sm hover:border-pink-200 transition-all duration-200">
          <div>
            <span class="text-sm font-medium text-gray-700">Auto-Record on Start</span>
            <p class="text-xs text-gray-500 mt-0.5">Start recording immediately when you open TalkType</p>
          </div>
          <label class="cursor-pointer flex items-center">
            <span class="sr-only">Auto-Record Toggle {autoRecordValue ? 'Enabled' : 'Disabled'}</span>
            <div class="relative">
              <input 
                type="checkbox" 
                class="sr-only"
                checked={autoRecordValue}
                on:change={toggleAutoRecord}
              />
              <div class={`w-10 h-5 rounded-full ${autoRecordValue ? 'bg-pink-400' : 'bg-gray-200'} transition-all duration-200`}></div>
              <div class={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-all duration-200 transform ${autoRecordValue ? 'translate-x-5' : ''}`}></div>
            </div>
          </label>
        </div>
        
        <!-- Prompt Style Selection Section -->
        <div class="mt-4">
          <h5 class="text-sm font-bold text-gray-700 mb-2">Response Style</h5>
          
          <div class="grid grid-cols-1 gap-2">
            {#if promptStyles && promptStyles.length > 0}
              {#each promptStyles as style}
                <button 
                  class="flex items-center justify-between p-3 rounded-xl border hover:border-pink-200 transition-all duration-200 {selectedPromptStyle === style ? 'border-pink-300 bg-pink-50/50 shadow-sm' : 'border-pink-100 bg-[#fffdf5]'}"
                  on:click={() => changePromptStyle(style)}
                >
                  <div class="flex items-center gap-2">
                    <span class="text-lg">{promptStyleIcons[style] || '💬'}</span>
                    <div>
                      <span class="text-sm font-medium text-gray-700">{promptStyleNames[style] || style}</span>
                      <p class="text-xs text-gray-500 mt-0.5">
                        {#if style === 'standard'}
                          Professional, helpful responses
                        {:else if style === 'surlyPirate'}
                          Arrr matey! Talk like a surly pirate, ye scallywag!
                        {:else if style === 'corporate'}
                          Professional jargon and buzzwords
                        {:else}
                          Custom response style
                        {/if}
                      </p>
                    </div>
                  </div>
                  
                  {#if selectedPromptStyle === style}
                    <div class="h-6 w-6 rounded-full bg-pink-400 flex items-center justify-center text-white text-xs">
                      ✓
                    </div>
                  {/if}
                </button>
              {/each}
            {:else}
              <div class="text-xs text-gray-500 italic">Loading prompt styles...</div>
            {/if}
          </div>
        </div>
      </div>
      
      <div class="space-y-4">
        <h4 class="text-sm font-bold text-gray-700">Choose Your Vibe</h4>
        
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {#each vibeOptions as vibe}
            <button 
              class="vibe-option flex flex-col items-center p-3 rounded-xl border border-pink-100 bg-[#fffdf5] shadow-sm hover:shadow-md hover:border-pink-200 transition-all duration-300 relative {selectedVibe === vibe.id ? 'selected-vibe border-pink-300 ring-2 ring-pink-200 ring-opacity-60' : ''}"
              data-vibe-type={vibe.id}
              on:click={() => changeVibe(vibe.id)}
            >
              <div class="preview-container mb-1.5">
                <!-- Ghost preview -->
                <div class="preview-ghost-wrapper w-12 h-12 relative">
                  <div class="preview-icon-layers w-full h-full relative">
                    <!-- Gradient background (bottom layer) with proper theme-specific path -->
                    <!-- Each SVG file already contains the proper ghost shape with its gradient -->
                    <!-- Use the same paths as the main app for consistency -->
                    <img 
                      src={vibe.id === 'mint' ? '/talktype-icon-bg-gradient-mint.svg' : 
                          vibe.id === 'bubblegum' ? '/talktype-icon-bg-gradient-bubblegum.svg' :
                          vibe.id === 'rainbow' ? '/talktype-icon-bg-gradient-rainbow.svg' :
                          '/talktype-icon-bg-gradient.svg'} 
                      class={vibe.id === 'rainbow' ? 'absolute inset-0 w-full h-full rainbow-animated' : 'absolute inset-0 w-full h-full'} 
                      alt="" 
                      aria-hidden="true" />
                    <!-- Outline without eyes -->
                    <img src="/assets/talktype-icon-base.svg" alt="" class="absolute inset-0 w-full h-full" aria-hidden="true" />
                    <!-- Just the eyes (with the blink animation) -->
                    <img src="/assets/talktype-icon-eyes.svg" alt="" class="absolute inset-0 w-full h-full preview-eyes" aria-hidden="true" />
                  </div>
                </div>
                
                <!-- Visualizer preview - with static gradients that match each theme -->
                <div class="preview-visualizer-container mt-1.5 rounded-md overflow-hidden border border-pink-100 w-full h-3">
                  <div 
                    class="preview-visualizer w-full h-full"
                    data-preview-theme={vibe.id}
                  ></div>
                </div>
              </div>
              
              <span class="text-xs font-medium text-gray-700">{vibe.name}</span>
              
              {#if selectedVibe === vibe.id}
                <div class="absolute -top-1 -right-1 bg-pink-400 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-sm">
                  ✓
                </div>
              {/if}
            </button>
          {/each}
        </div>
        
        <p class="text-xs text-gray-500 italic mt-1">Changes are applied immediately and saved for future visits.</p>
      </div>
      
      <!-- Premium Features Section -->
      <div class="space-y-3 bg-gradient-to-r from-pink-50/50 to-amber-50/50 p-4 rounded-lg border border-pink-100/60 shadow-sm">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-bold text-gray-700">Bonus Features <span class="text-pink-500 text-xs font-normal">(Coming Soon)</span></h4>
          <span class="badge badge-sm bg-amber-100 text-amber-700 border-amber-200 gap-1 font-medium">
            <span class="text-[10px]">✧</span> Premium
          </span>
        </div>
        
        <div class="space-y-3 pt-1">
          <!-- Toggle items -->
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-gray-600">Save transcript + audio</span>
            <input type="checkbox" disabled class="toggle toggle-xs toggle-primary bg-gray-200" />
          </div>
          
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-gray-600">View transcript history</span>
            <input type="checkbox" disabled class="toggle toggle-xs toggle-primary bg-gray-200" />
          </div>
          
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-gray-600">Batch download everything</span>
            <input type="checkbox" disabled class="toggle toggle-xs toggle-primary bg-gray-200" />
          </div>
          
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-gray-600">Custom filename builder</span>
            <input type="checkbox" disabled class="toggle toggle-xs toggle-primary bg-gray-200" />
          </div>
          
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-gray-600">Auto-clean filler words</span>
            <input type="checkbox" disabled class="toggle toggle-xs toggle-primary bg-gray-200" />
          </div>
          
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-gray-600">Auto Markdown formatter</span>
            <input type="checkbox" disabled class="toggle toggle-xs toggle-primary bg-gray-200" />
          </div>
        </div>
        
        <div class="flex justify-end">
          <span class="text-xs text-gray-500 italic">We're working on these goodies!</span>
        </div>
      </div>
      
      <div class="border-t border-pink-100 pt-3 text-center">
        <p class="text-xs text-gray-500">TalkType v0.1.1 • Made with 💜 by Dennis & Pablo</p>
      </div>
    </div>
  </div>
  
  <div class="modal-backdrop bg-black/40" on:click|self|preventDefault|stopPropagation={() => {
    const modal = document.getElementById('settings_modal');
    if (modal) {
      modal.close();
      setTimeout(handleModalClose, 50);
    }
  }}></div>
</dialog>

<style>
  /* Improve close button */
  .close-btn {
    -webkit-tap-highlight-color: transparent;
    outline: none;
    cursor: pointer;
    user-select: none;
    z-index: 1000;
  }
  
  .close-btn:hover {
    transform: scale(1.1);
  }
  
  .close-btn:active {
    transform: scale(0.95);
  }
  
  .animate-fadeUp {
    animation: fadeUp 0.5s cubic-bezier(0.19, 1, 0.22, 1) forwards;
  }
  
  @keyframes fadeUp {
    0% {
      opacity: 0;
      transform: translateY(8px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .selected-vibe {
    box-shadow: 0 0 0 2px rgba(249, 168, 212, 0.4), 0 4px 8px rgba(249, 168, 212, 0.2);
  }
  
  /* Default styles for image-based gradients */
  .preview-ghost-bg {
    /* Default styling */
  }
  
  /* Properly masked rainbow gradient that only shows inside the ghost */
  .masked-rainbow-gradient {
    /* Apply mask to clip the gradient to the ghost shape */
    -webkit-mask-image: url(/assets/talktype-icon-base.svg);
    mask-image: url(/assets/talktype-icon-base.svg);
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-position: center;
    mask-position: center;
    
    /* Apply rainbow gradient and animation */
    animation: hueShift 5s linear infinite;
    background-image: linear-gradient(135deg, #61D4B3, #FDD365, #FB8D62, #FD2EB3, #61D4B3);
    background-size: 200% 200%;
  }
  
  .preview-visualizer-container {
    width: 100%;
    min-width: 40px;
    height: 10px;
  }
  
  /* Theme-specific gradient styles for previews */
  .preview-visualizer[data-preview-theme="peach"] {
    background: linear-gradient(to top, #ffa573, #ff9f9a, #ff7fcd, #ffb6f3);
  }
  
  .preview-visualizer[data-preview-theme="mint"] {
    background: linear-gradient(to top, #86efac, #5eead4, #67e8f9);
  }
  
  .preview-visualizer[data-preview-theme="bubblegum"] {
    background: linear-gradient(to top, #a875ff, #d554ff, #f95bf9, #ff2a8d);
  }
  
  .preview-visualizer[data-preview-theme="rainbow"] {
    animation: rainbowFlow 5s linear infinite;
    background-image: linear-gradient(to top, #FF3D7F, #FF8D3C, #FFF949, #4DFF60, #35DEFF, #9F7AFF, #FF3D7F);
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.18), 0 0 18px rgba(255, 156, 227, 0.15);
  }
  
  @keyframes rainbowPreview {
    0%, 100% { filter: drop-shadow(0 0 3px rgba(255, 61, 127, 0.4)) saturate(1.3) brightness(1.1); }
    25% { filter: drop-shadow(0 0 4px rgba(255, 249, 73, 0.5)) saturate(1.4) brightness(1.15); }
    50% { filter: drop-shadow(0 0 4px rgba(53, 222, 255, 0.5)) saturate(1.5) brightness(1.2); }
    75% { filter: drop-shadow(0 0 3px rgba(159, 122, 255, 0.4)) saturate(1.4) brightness(1.15); }
  }
  
  .vibe-option {
    transition: all 0.2s ease-in-out;
  }
  
  .vibe-option:hover {
    transform: translateY(-2px);
  }
  
  .vibe-option:active {
    transform: translateY(0px);
  }
  
  /* Rainbow animation for ghost with sparkle effect */
  .rainbow-animated {
    animation: rainbowFlow 8.3s linear infinite;
    filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.4));
  }
  
  @keyframes rainbowFlow {
    0% { filter: hue-rotate(0deg) saturate(1.4) brightness(1.15); }
    100% { filter: hue-rotate(360deg) saturate(1.5) brightness(1.2); }
  }
  
  /* Add extra sparkle when previewing the rainbow theme */
  .vibe-option[data-vibe-type="rainbow"]:hover .preview-icon-layers .rainbow-animated {
    animation: rainbowFlow 4.7s linear infinite, settingsSparkle 2s ease-in-out infinite;
  }
  
  @keyframes settingsSparkle {
    0%, 100% { filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.6)) drop-shadow(0 0 6px rgba(255, 61, 127, 0.5)); }
    25% { filter: drop-shadow(0 0 4px rgba(255, 141, 60, 0.7)) drop-shadow(0 0 8px rgba(255, 249, 73, 0.6)); }
    50% { filter: drop-shadow(0 0 4px rgba(77, 255, 96, 0.6)) drop-shadow(0 0 7px rgba(53, 222, 255, 0.7)); }
    75% { filter: drop-shadow(0 0 5px rgba(159, 122, 255, 0.7)) drop-shadow(0 0 8px rgba(255, 61, 127, 0.6)); }
  }
  
  /* Theme-based visualizer styling using data-theme */
  :global([data-theme="rainbow"] .history-bar) {
    animation: hueShift 5s ease-in-out infinite, rainbowPreview 3s ease-in-out infinite;
    background-image: linear-gradient(to top, #FF3D7F, #FF8D3C, #FFF949, #4DFF60, #35DEFF, #9F7AFF, #FF3D7F);
    background-size: 100% 600%;
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.15), 0 0 15px rgba(255, 156, 227, 0.1);
  }
  
  /* Connect the preview eyes to the main app's Brian Eno-inspired ambient blinking system */
  .preview-eyes {
    animation: preview-blink 6s infinite;
    transform-origin: center center;
  }
  
  /* Each theme preview has a slightly different blink timing 
     to create an organic, non-synchronized effect */
  .vibe-option:nth-child(1) .preview-eyes {
    animation-duration: 6.7s;
    animation-delay: 0.4s;
  }
  
  .vibe-option:nth-child(2) .preview-eyes {
    animation-duration: 7.3s;
    animation-delay: 1.2s;
  }
  
  .vibe-option:nth-child(3) .preview-eyes {
    animation-duration: 5.9s;
    animation-delay: 2.3s;
  }
  
  .vibe-option:nth-child(4) .preview-eyes {
    animation-duration: 8.2s;
    animation-delay: 0.7s;
  }
  
  @keyframes preview-blink {
    0%, 96.5%, 100% {
      transform: scaleY(1);
    }
    97.5% {
      transform: scaleY(0); /* Closed eyes */
    }
    98.5% {
      transform: scaleY(1); /* Open eyes */
    }
  }
  
  /* Removed redundant rainbow-animated-bars class */
  
  @keyframes hueShift {
    0% {
      background-position: 0% 0%;
      filter: saturate(1.3) brightness(1.1);
    }
    25% {
      background-position: 0% 33%;
      filter: saturate(1.4) brightness(1.15);
    }
    50% {
      background-position: 0% 66%;
      filter: saturate(1.5) brightness(1.2);
    }
    75% {
      background-position: 0% 100%;
      filter: saturate(1.4) brightness(1.15);
    }
    100% {
      background-position: 0% 0%;
      filter: saturate(1.3) brightness(1.1);
    }
  }
  
  /* Modal centering and animation styles */
  :global(dialog.modal) {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    overflow: hidden !important;
    max-height: 100vh !important;
    max-width: 100vw !important;
    padding: 0 !important;
    margin: 0 !important;
    background: transparent !important;
    border: none !important;
    inset: 0 !important;
  }

  /* Ensure modal box is centered and properly styled */
  :global(.modal-box) {
    position: relative !important;
    margin: 1.5rem auto !important;
    transform: none !important;
    transition: transform 0.3s ease-out, opacity 0.3s ease-out !important;
  }
  
  /* Modal entrance animation */
  .animate-modal-enter {
    animation: modalEnter 0.4s cubic-bezier(0.19, 1, 0.22, 1) forwards;
    will-change: transform, opacity;
  }
  
  @keyframes modalEnter {
    0% {
      opacity: 0;
      transform: scale(0.95) translateY(10px);
    }
    60% {
      opacity: 1;
      transform: scale(1.02) translateY(-5px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  /* Fix modal backdrop with animation */
  :global(.modal-backdrop) {
    animation: backdropFadeIn 0.3s ease forwards !important;
    background-color: rgba(0, 0, 0, 0.4) !important;
    bottom: 0 !important;
    left: 0 !important;
    position: fixed !important;
    right: 0 !important;
    top: 0 !important;
    z-index: -1 !important;
  }
  
  @keyframes backdropFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>