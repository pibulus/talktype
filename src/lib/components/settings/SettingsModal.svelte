<script>
  import { onMount } from 'svelte';
  
  // Props for the modal
  export let open = false;
  export let closeModal = () => {};
  
  // Theme/vibe selection
  let selectedVibe = 'peach'; // Default theme
  let scrollPosition = 0;
  
  // Theme options with gradient SVG files for ghost and CSS gradients for visualizer
  const vibeOptions = [
    { 
      id: 'peach', 
      name: 'Peach', 
      ghostGradientSrc: '/assets/talktype-icon-bg-gradient.svg',
      visualizerGradient: 'linear-gradient(to top, #ff9a84, #ff7eb3)',
      previewGradient: 'linear-gradient(135deg, #ff9a84, #ff7eb3)'
    },
    { 
      id: 'mint', 
      name: 'Mint', 
      ghostGradientSrc: '/assets/talktype-icon-bg-gradient-mint.svg',
      visualizerGradient: 'linear-gradient(to top, #60a5fa, #34d399)',
      previewGradient: 'linear-gradient(135deg, #60a5fa, #34d399)'
    },
    { 
      id: 'bubblegum', 
      name: 'Bubblegum', 
      ghostGradientSrc: '/assets/talktype-icon-bg-gradient-bubblegum.svg',
      visualizerGradient: 'linear-gradient(to top, #f472b6, #a78bfa)',
      previewGradient: 'linear-gradient(135deg, #f472b6, #a78bfa)'
    },
    { 
      id: 'rainbow', 
      name: 'Rainbow',
      ghostGradientSrc: '/assets/talktype-icon-bg-gradient-rainbow.svg',
      previewGradient: 'rainbow',
      animated: true
    }
  ];
  
  // Load user's theme preference from localStorage on component mount
  onMount(() => {
    if (typeof window !== 'undefined') {
      const savedVibe = localStorage.getItem('talktype-vibe');
      if (savedVibe) {
        selectedVibe = savedVibe;
      }
      
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
        });
      }
    }
  });
  
  // Function to update theme/vibe throughout the app
  function updateTheme(vibeId) {
    if (typeof window === 'undefined') return;
    
    const vibe = vibeOptions.find(v => v.id === vibeId);
    if (!vibe) return;
    
    // Store selection in localStorage
    localStorage.setItem('talktype-vibe', vibeId);
    
    // Update ghost icon by swapping the SVG file
    const ghostBg = document.querySelector('.icon-bg');
    const visualizerBars = document.querySelectorAll('.history-bar');
    
    if (ghostBg) {
      if (vibe.animated && vibe.id === 'rainbow') {
        ghostBg.classList.add('rainbow-animated');
        ghostBg.src = '/talktype-icon-bg-gradient-rainbow.svg';
      } else {
        ghostBg.classList.remove('rainbow-animated');
        // Set the appropriate gradient SVG based on theme
        switch(vibe.id) {
          case 'mint':
            ghostBg.src = '/talktype-icon-bg-gradient-mint.svg';
            break;
          case 'bubblegum':
            ghostBg.src = '/talktype-icon-bg-gradient-bubblegum.svg';
            break;
          default: // Default to peach
            ghostBg.src = '/talktype-icon-bg-gradient.svg';
            break;
        }
      }
      
      // Force a reflow to ensure the gradient is visible
      void ghostBg.offsetWidth;
    }
    
    // Update visualizer bars gradient
    visualizerBars.forEach(bar => {
      if (vibe.animated && vibe.id === 'rainbow') {
        bar.classList.add('rainbow-animated-bars');
        bar.style.backgroundImage = '';
      } else {
        bar.classList.remove('rainbow-animated-bars');
        bar.style.backgroundImage = vibe.visualizerGradient;
      }
    });
    
    // Update global CSS variables for new components
    document.documentElement.style.setProperty('--visualizer-gradient', vibe.visualizerGradient || '');
    
    // We no longer need to change the preview elements in the settings panel
    // as they will already show the correct static colors for each theme
    // This prevents the colors from randomly changing in the theme selector
  }
  
  // Handle vibe change
  function changeVibe(vibeId) {
    selectedVibe = vibeId;
    updateTheme(vibeId);
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

<dialog id="settings_modal" class="modal fixed z-50" style="overflow: hidden !important; z-index: 999;">
  <div class="modal-box bg-gradient-to-br from-white to-[#fefaf4] shadow-xl border border-pink-200 rounded-2xl overflow-y-auto max-h-[80vh] w-[95%] max-w-md md:max-w-lg animate-modal-enter">
    <form method="dialog">
      <button 
        class="btn btn-sm min-h-[32px] min-w-[32px] h-8 w-8 btn-circle absolute right-3 top-3 bg-pink-100 border-pink-200 text-pink-500 hover:bg-pink-200 hover:text-pink-700 shadow-sm flex items-center justify-center p-0"
        on:click={handleModalClose}
      >
        <span class="text-lg leading-none">✕</span>
      </button>
    </form>
    
    <div class="animate-fadeUp space-y-6">
      <div class="flex items-center gap-3 mb-1">
        <div class="w-9 h-9 bg-gradient-to-br from-white to-pink-50 rounded-full flex items-center justify-center shadow-sm border border-pink-200/60">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-pink-500">
            <path d="M12 15c-1.654 0-3-1.346-3-3s1.346-3 3-3 3 1.346 3 3-1.346 3-3 3zm9-3c0-1.488-.144-2.697-.915-3.279A9.974 9.974 0 0016 4.274V3c0-.552-.448-1-1-1h-2c-.552 0-1 .448-1 1v1.307a9.99 9.99 0 00-4.048 1.658C7.335 6.371 7.09 6.97 6.918 7.5L3 7a1 1 0 00-.894 1.447l2.874 4.78a8.73 8.73 0 00-.042 1.923C5.313 16.722 8.232 19 12 19s6.687-2.278 7.062-3.85a8.73 8.73 0 00-.042-1.923l2.874-4.78A1 1 0 0021 7l-3.835.5C17.04 6.51 16.825 6 16 6a9.974 9.974 0 00-4.048-1.726A10.082 10.082 0 0013 12z" />
          </svg>
        </div>
        <h3 class="font-black text-xl text-gray-800 tracking-tight">Settings</h3>
      </div>

      <!-- Vibe Selector Section -->
      <div class="space-y-4">
        <h4 class="text-sm font-bold text-gray-700">Choose Your Vibe</h4>
        
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {#each vibeOptions as vibe}
            <button 
              class="vibe-option flex flex-col items-center p-3 rounded-xl border border-pink-100 bg-white shadow-sm hover:shadow-md hover:border-pink-200 transition-all duration-300 relative {selectedVibe === vibe.id ? 'selected-vibe border-pink-300 ring-2 ring-pink-200 ring-opacity-60' : ''}"
              on:click={() => changeVibe(vibe.id)}
            >
              <div class="preview-container mb-1.5">
                <!-- Ghost preview -->
                <div class="preview-ghost-wrapper w-12 h-12 relative">
                  <div class="preview-icon-layers w-full h-full relative">
                    <!-- Gradient background (bottom layer) with proper theme-specific path -->
                    <!-- All themes use their SVG files directly -->
                    <img 
                      src={vibe.id === 'mint' ? '/talktype-icon-bg-gradient-mint.svg' : 
                          vibe.id === 'bubblegum' ? '/talktype-icon-bg-gradient-bubblegum.svg' :
                          vibe.id === 'rainbow' ? '/talktype-icon-bg-gradient-rainbow.svg' :
                          '/talktype-icon-bg-gradient.svg'} 
                      alt="" 
                      class="absolute inset-0 w-full h-full preview-ghost-bg" 
                      class:rainbow-animated={vibe.id === 'rainbow'} 
                      aria-hidden="true" />
                    <!-- Outline without eyes -->
                    <img src="/assets/talktype-icon-base.svg" alt="" class="absolute inset-0 w-full h-full" aria-hidden="true" />
                    <!-- Just the eyes -->
                    <img src="/assets/talktype-icon-eyes.svg" alt="" class="absolute inset-0 w-full h-full" aria-hidden="true" />
                  </div>
                </div>
                
                <!-- Visualizer preview - with static gradients that match each theme -->
                <div class="preview-visualizer-container mt-1.5 rounded-md overflow-hidden border border-pink-100 w-full h-3">
                  <div 
                    class="preview-visualizer w-full h-full"
                    class:rainbow-animated-bars={vibe.id === 'rainbow'}
                    style={vibe.id === 'peach' ? 'background-image: linear-gradient(to top, #ff9a84, #ff7eb3)' : 
                           vibe.id === 'mint' ? 'background-image: linear-gradient(to top, #60a5fa, #34d399)' :
                           vibe.id === 'bubblegum' ? 'background-image: linear-gradient(to top, #f472b6, #a78bfa)' : ''}
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
    document.getElementById('settings_modal').close();
    setTimeout(handleModalClose, 50);
  }}></div>
</dialog>

<style>
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
  
  /* Using position:absolute instead of masking now, but we need it for rainbow */
  .preview-ghost-bg {
    /* Default styling */
  }
  
  .rainbow-animated-ghost {
    -webkit-mask-image: url(/assets/talktype-icon-base.svg);
    mask-image: url(/assets/talktype-icon-base.svg);
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-position: center;
    mask-position: center;
    animation: hueShift 8s linear infinite;
    background-image: linear-gradient(135deg, #ff5e62, #ff9966, #fffc00, #73fa79, #73c2fb, #d344b7, #ff5e62);
    background-size: 200% 200%;
  }
  
  .preview-visualizer-container {
    width: 100%;
    min-width: 40px;
    height: 10px;
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
  
  /* Rainbow animation for ghost and visualizer */
  .rainbow-animated {
    animation: hueShift 8s linear infinite;
    background-image: linear-gradient(135deg, #ff5e62, #ff9966, #fffc00, #73fa79, #73c2fb, #d344b7, #ff5e62);
    background-size: 200% 200%;
  }
  
  .rainbow-animated-bars {
    animation: hueShift 8s linear infinite;
    background-image: linear-gradient(to top, #ff5e62, #ff9966, #fffc00, #73fa79, #73c2fb, #d344b7, #ff5e62);
    background-size: 100% 800%;
  }
  
  @keyframes hueShift {
    0% {
      background-position: 0% 0%;
    }
    50% {
      background-position: 100% 100%;
    }
    100% {
      background-position: 0% 0%;
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