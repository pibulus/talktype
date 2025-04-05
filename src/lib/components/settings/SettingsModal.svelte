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
      ghostGradientSrc: '/static/assets/talktype-icon-bg-gradient.svg',
      visualizerGradient: 'linear-gradient(to top, #ff9a84, #ff7eb3)',
      previewGradient: 'linear-gradient(135deg, #ff9a84, #ff7eb3)'
    },
    { 
      id: 'mint', 
      name: 'Mint', 
      ghostGradientSrc: '/static/assets/talktype-icon-bg-gradient-mint.svg',
      visualizerGradient: 'linear-gradient(to top, #60a5fa, #34d399)',
      previewGradient: 'linear-gradient(135deg, #60a5fa, #34d399)'
    },
    { 
      id: 'bubblegum', 
      name: 'Bubblegum', 
      ghostGradientSrc: '/static/assets/talktype-icon-bg-gradient-bubblegum.svg',
      visualizerGradient: 'linear-gradient(to top, #f472b6, #a78bfa)',
      previewGradient: 'linear-gradient(135deg, #f472b6, #a78bfa)'
    },
    { 
      id: 'rainbow', 
      name: 'Rainbow',
      ghostGradientSrc: '/static/assets/talktype-icon-bg-gradient-rainbow.svg',
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
          // Apply theme immediately
          updateTheme(selectedVibe);
        });

        // Also listen for the standard dialog open event
        modal.addEventListener('open', () => {
          // Apply theme after a slight delay to ensure DOM is ready
          setTimeout(() => updateTheme(selectedVibe), 100);
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
    
    // Use the new inline SVG approach
    // Get the SVG gradient elements and visualizer bars
    const linearGradient = document.querySelector('#pinkPurpleGradient');
    const svgStops = linearGradient ? linearGradient.querySelectorAll('stop') : null;
    const ghostFill = document.querySelector('.ghost-fill');
    const visualizerBars = document.querySelectorAll('.history-bar');
    
    // Define theme colors based on the selected vibe
    let startColor, endColor;
    
    switch(vibeId) {
      case 'mint':
        startColor = '#60a5fa';  // Light blue
        endColor = '#34d399';    // Light green
        break;
      case 'bubblegum':
        startColor = '#f472b6';  // Pink
        endColor = '#a78bfa';    // Purple
        break;
      case 'peach':
      default:
        startColor = '#ffb6c1';  // Light pink
        endColor = '#dda0dd';    // Light purple
        break;
    }
    
    // Update SVG gradient colors directly
    if (svgStops && svgStops.length >= 2 && ghostFill) {
      if (vibe.animated && vibe.id === 'rainbow') {
        // Apply rainbow animation to the fill
        ghostFill.classList.add('rainbow-animated');
        // Use the rainbow gradient for the fill
        ghostFill.setAttribute('fill', 'url(#rainbowGradient)');
      } else {
        // Remove any animation classes
        ghostFill.classList.remove('rainbow-animated');
        // Restore the regular gradient fill
        ghostFill.setAttribute('fill', 'url(#pinkPurpleGradient)');
        
        // Update gradient colors if not rainbow
        if (svgStops[0] && startColor) {
          svgStops[0].setAttribute('stop-color', startColor);
        }
        if (svgStops[1] && endColor) {
          svgStops[1].setAttribute('stop-color', endColor);
        }
      }
      
      // Force a reflow to ensure the gradient is visible
      void ghostFill.offsetWidth;
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
    
    // For preview elements in the settings panel
    const previewGhost = document.querySelector('.preview-ghost-bg');
    if (previewGhost) {
      if (vibe.animated && vibe.id === 'rainbow') {
        previewGhost.classList.add('rainbow-animated');
        previewGhost.style.backgroundImage = '';
      } else {
        previewGhost.classList.remove('rainbow-animated');
        previewGhost.style.backgroundImage = vibe.previewGradient;
      }
    }
    
    // Update preview visualizer
    const previewVisualizer = document.querySelector('.preview-visualizer');
    if (previewVisualizer) {
      if (vibe.animated && vibe.id === 'rainbow') {
        previewVisualizer.classList.add('rainbow-animated');
      } else {
        previewVisualizer.classList.remove('rainbow-animated');
        previewVisualizer.style.backgroundImage = vibe.visualizerGradient;
      }
    }
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
        class="btn btn-sm btn-circle absolute right-3 top-3 bg-pink-100 border-pink-200 text-pink-500 hover:bg-pink-200 hover:text-pink-700 shadow-sm"
        on:click={handleModalClose}
      >✕</button>
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
                  <div 
                    class="preview-ghost-bg absolute inset-0 w-full h-full rounded-full"
                    class:rainbow-animated={vibe.id === 'rainbow'}
                    style={vibe.id !== 'rainbow' ? `background-image: ${vibe.previewGradient}` : ''}
                  ></div>
                  <div class="ghost-outline absolute inset-0 w-full h-full opacity-80">
                    <svg viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path 
                        d="M513.404419,867.481567 
                        C500.638763,868.907959 488.331787,868.194336 476.009705,867.866089 
                        C446.462891,867.078796 417.884583,859.610352 388.801971,855.681885 
                        C370.149475,853.162231 352.112579,857.574646 334.511139,863.822144 
                        C315.368408,870.616699 297.161530,879.791504 277.721497,885.828918 
                        C254.681473,892.984314 231.232208,897.413452 207.021820,896.261047 
                        C189.047836,895.405457 171.990540,891.317932 158.356384,878.565979 
                        C147.208923,868.139954 141.529053,854.882935 139.624680,839.847839 
                        C137.264587,821.214722 142.483505,803.992310 148.934418,786.895508 
                        C156.505127,766.830994 164.596375,746.925598 168.849991,725.765869 
                        C174.432098,697.997681 173.665695,670.337097 168.186920,642.630127 
                        C163.947479,621.190674 156.486160,600.699402 150.462204,579.785400 
                        C143.638535,556.094910 139.159988,532.038147 137.504852,507.372742 
                        C131.064590,411.397430 157.581161,325.368225 215.925552,249.300003 
                        C256.117920,196.897995 307.335602,158.445419 368.502960,133.354050 
                        C400.531647,120.215607 433.768219,111.837654 468.098663,107.519447 
                        C487.134308,105.125092 506.230377,104.015808 525.362000,104.827698 
                        C596.538330,107.848198 662.704651,127.277710 722.209900,167.011292 
                        C803.810486,221.498611 856.047241,296.743835 879.300354,392.061066 
                        C884.184937,412.083374 887.114685,432.389526 888.554993,452.994354 
                        C889.719971,469.660492 889.983215,486.340546 889.047058,502.913361 
                        C886.752075,543.540771 877.620850,582.802795 862.444458,620.580078 
                        C840.634644,674.869141 809.072632,722.769043 765.879944,762.294067 
                        C714.632507,809.189697 656.007019,842.916016 587.328186,857.500854 
                        C563.079834,862.650391 538.753174,867.051331 513.404419,867.481567 
                        M231.830231,347.227020 
                        C210.293030,395.676147 198.984055,446.071472 202.137405,499.390686 
                        C203.379990,520.401123 207.011154,540.925964 212.771942,561.075439 
                        C221.804901,592.669983 232.889542,623.721558 235.886505,656.807068 
                        C237.528046,674.929260 238.041809,693.021240 236.125473,711.088745 
                        C233.663315,734.302429 228.079376,756.867920 220.703934,778.997375 
                        C216.070633,792.899231 211.026505,806.639221 204.976135,820.001709 
                        C202.237274,826.050598 204.640930,829.986755 211.224380,830.599182 
                        C212.216553,830.691467 213.222946,830.652954 214.222412,830.641785 
                        C229.674545,830.469666 244.630646,827.182190 259.157257,822.373352 
                        C278.265167,816.048035 297.069214,808.811035 316.070312,802.155701 
                        C350.310822,790.162659 385.034760,785.834839 420.907745,794.570801 
                        C442.249481,799.768066 464.089172,802.233215 486.075745,802.573059 
                        C510.252686,802.946838 534.166016,800.326538 557.923584,795.787598 
                        C608.719604,786.082764 654.687195,765.450806 695.782959,734.304016 
                        C746.750122,695.675598 782.895020,645.900330 805.225037,585.981445 
                        C818.084045,551.476379 824.147156,515.703613 824.386597,479.079163 
                        C824.510071,460.195374 822.352417,441.325256 818.809448,422.629791 
                        C806.773621,359.119690 777.563049,304.698578 731.504028,259.715424 
                        C677.962280,207.424286 613.008545,178.958206 538.785400,171.496796 
                        C511.977112,168.801819 485.289978,171.008865 458.802246,175.699249 
                        C411.962860,183.993408 369.315247,202.284042 330.532043,229.690826 
                        C287.560181,260.057526 255.228470,299.415741 231.830231,347.227020 
                        z" 
                        fill="white" fill-opacity="0.8" stroke="#333" stroke-width="2"/>
                      
                      <!-- Eyes -->
                      <path 
                        d="M580.705505,471.768982 
                        C579.774292,452.215668 582.605713,433.818390 590.797302,416.428589 
                        C595.017090,407.470551 600.340088,399.277374 607.772888,392.579346 
                        C627.716553,374.607117 653.145935,376.202209 670.873657,396.487671 
                        C682.259460,409.516235 688.856201,424.818604 691.954407,441.620636 
                        C696.671631,467.203156 693.889832,491.915649 682.163452,515.365479 
                        C678.942444,521.806519 674.902405,527.726013 669.904602,532.915588 
                        C649.577148,554.023315 621.761536,553.062683 602.886780,530.571594 
                        C591.909119,517.490662 585.759705,502.182648 582.712219,485.533203 
                        C581.906189,481.129486 581.375549,476.675323 580.705505,471.768982 
                        z"
                        fill="#333" />
                      
                      <path 
                        d="M445.338440,471.851562 
                        C443.176758,493.788635 436.942841,513.715637 422.903229,530.550293 
                        C414.712860,540.371216 404.428955,546.983215 391.426178,547.988098 
                        C380.129303,548.861206 370.128235,544.991821 361.551147,537.658081 
                        C346.242279,524.568481 338.807251,507.057800 334.925110,487.966980 
                        C330.108337,464.279877 331.868622,440.935730 341.490295,418.566833 
                        C348.688934,401.831055 359.017548,387.645721 377.318176,381.896362 
                        C395.780701,376.096130 410.714722,383.333527 422.873901,396.788544 
                        C435.662811,410.940399 441.511841,428.347931 444.441101,446.954803 
                        C445.723877,455.103149 445.097168,463.233063 445.338440,471.851562 
                        z"
                        fill="#333" />
                    </svg>
                  </div>
                </div>
                
                <!-- Visualizer preview -->
                <div class="preview-visualizer-container mt-1.5 rounded-md overflow-hidden border border-pink-100 w-full h-3">
                  <div 
                    class="preview-visualizer w-full h-full"
                    class:rainbow-animated-bars={vibe.id === 'rainbow'}
                    style={vibe.id !== 'rainbow' ? `background-image: ${vibe.visualizerGradient}` : ''}
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
  
  .preview-ghost-bg {
    -webkit-mask-image: url(/static/assets/talktype-icon-base.svg);
    mask-image: url(/static/assets/talktype-icon-base.svg);
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-position: center;
    mask-position: center;
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