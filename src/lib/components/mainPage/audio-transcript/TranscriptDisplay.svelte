<script>
  import { ANIMATION, ATTRIBUTION } from '$lib/constants';
  import { createEventDispatcher, onMount } from 'svelte';
  import Ghost from '$lib/components/ghost/Ghost.svelte';
  
  // Props
  export let transcript = '';
  export let showCopyTooltip = false;
  export let responsiveFontSize = 'text-base';
  
  // Refs
  let editableTranscript;
  let copyButtonRef;
  let transcriptBoxRef;
  
  // State
  let tooltipHoverCount = 0;
  let hasUsedCopyButton = false;
  let isScrollable = false;
  
  // Event dispatcher
  const dispatch = createEventDispatcher();
  
  // Get the current editable content
  export function getEditedTranscript() {
    return editableTranscript ? editableTranscript.innerText : transcript;
  }

  function handleTooltipMouseEnter() {
    if (typeof window !== 'undefined' && 
        window.innerWidth >= 640 &&
        !hasUsedCopyButton &&
        tooltipHoverCount < ANIMATION.COPY.TOOLTIP_MAX_COUNT) {
      showCopyTooltip = true;
      tooltipHoverCount++;
    }
  }
  
  // Check if content is scrollable
  function checkScrollable() {
    if (transcriptBoxRef) {
      isScrollable = transcriptBoxRef.scrollHeight > transcriptBoxRef.clientHeight;
    }
  }
  
  // Browser feature detection
  function isWebShareSupported() {
    return (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      navigator.share &&
      typeof navigator.share === 'function'
    );
  }
  
  onMount(() => {
    // Check if content is scrollable on mount
    checkScrollable();
    
    // Watch for content changes to update scrollable state
    const resizeObserver = new ResizeObserver(() => {
      checkScrollable();
    });
    
    if (transcriptBoxRef) {
      resizeObserver.observe(transcriptBoxRef);
    }
    
    return () => {
      if (transcriptBoxRef) {
        resizeObserver.unobserve(transcriptBoxRef);
      }
    };
  });
</script>

<div
  class="transcript-wrapper w-full animate-fadeIn-from-top"
  on:animationend={() => {
    // No page scrolling needed anymore with fixed layout
    checkScrollable();
  }}
>
  <div class="wrapper-container flex w-full justify-center">
    <div
      class="transcript-box-container relative mx-auto w-[95%] max-w-[580px] px-0 sm:w-full"
    >
      <!-- Ghost icon copy button positioned outside the transcript box -->
      <button
        class="copy-btn absolute -right-4 -top-4 z-[200] h-10 w-10 rounded-full bg-gradient-to-r from-pink-100 to-purple-50 p-1.5 shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 active:scale-95"
        on:click|preventDefault={() => dispatch('copy', { text: getEditedTranscript() })}
        on:mouseenter={handleTooltipMouseEnter}
        on:mouseleave={() => { showCopyTooltip = false; }}
        aria-label="Copy transcript to clipboard"
        bind:this={copyButtonRef}
      >
        <div class="w-full h-full">
          <Ghost 
            size="100%" 
            clickable={false} 
            class="copy-ghost"
            seed={42} 
          />
        </div>

        <!-- Smart tooltip - only shows for first few hovers -->
        {#if showCopyTooltip}
          <div
            class="copy-tooltip absolute right-0 top-12 z-[250] whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-medium text-purple-800 shadow-md"
          >
            Copy to clipboard
            <div
              class="tooltip-arrow absolute -top-1.5 right-4 h-3 w-3 rotate-45 bg-white"
            ></div>
          </div>
        {/if}
      </button>

      <!-- Redesigned transcript box with proper structure -->
      <div
        class="transcript-box animate-shadow-appear relative mx-auto my-4 box-border 
               rounded-[2rem] border-[1.5px] border-pink-100/70 bg-white/95
               shadow-xl transition-all duration-300 contain-layout"
      >
        <!-- Content Area - scrollable -->
        <div 
          class="transcript-content-area w-full max-h-[320px] overflow-y-auto px-7 pt-5 pb-1 sm:px-10 sm:pt-6 sm:pb-2 relative z-10"
          bind:this={transcriptBoxRef}
        >
          <div
            class={`transcript-text ${responsiveFontSize} text-left custom-transcript-text animate-text-appear font-mono mb-3`}
            contenteditable="true"
            role="textbox"
            aria-label="Transcript editor"
            aria-multiline="true"
            tabindex="0"
            aria-describedby="transcript-instructions"
            bind:this={editableTranscript}
            on:focus={() => {
              dispatch('focus', {
                message: 'You can edit this transcript. Use keyboard to make changes.'
              });
            }}
          >
            {transcript}
          </div>
          
          <!-- Hidden instructions for screen readers -->
          <div id="transcript-instructions" class="sr-only">
            Editable transcript. You can modify the text if needed.
          </div>
        </div>
        
        <!-- Scroll indicator - only visible when scrollable -->
        {#if isScrollable}
          <div
            class="scroll-indicator-bottom pointer-events-none absolute bottom-0 left-0 right-0 z-10"
          ></div>
        {/if}
        
        <!-- Share button area - integrated with content -->
        {#if isWebShareSupported()}
          <div class="transcript-button-area w-full py-3 pb-5 relative z-10">
            <div class="flex w-full justify-center">
              <button
                class="px-5 py-2 text-sm font-medium text-indigo-600 transition-all duration-200 rounded-full shadow-sm share-btn-text bg-gradient-to-r from-indigo-50 to-purple-100 hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 active:scale-95"
                on:click|preventDefault={() => dispatch('share', { text: getEditedTranscript() })}
                aria-label="Share transcript"
              >
                Share
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  /* Container layout */
  .transcript-wrapper {
    contain: layout;
    margin-top: 32px; /* Space between button and transcript */
  }
  
  /* Box structure */
  .transcript-box {
    display: flex;
    flex-direction: column;
    overflow: hidden; /* Contain all scrolling internally */
    transition: all 0.6s cubic-bezier(0.22, 1, 0.36, 1);
    animation: subtle-breathe 10s infinite ease-in-out alternate;
    position: relative; /* For the pseudo-element highlight */
  }
  
  /* Extremely subtle mouseover highlight effect */
  .transcript-box::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 2rem;
    background: radial-gradient(circle at 50% 50%, rgba(249, 168, 212, 0.04), transparent 70%);
    opacity: 0;
    transition: opacity 0.6s ease-in-out;
    pointer-events: none; /* Allow clicks to pass through */
    z-index: 1;
  }
  
  .transcript-box:hover::before {
    opacity: 1;
  }
  
  /* Subtle breathing animation - 80/20 rule applied for subtlety */
  @keyframes subtle-breathe {
    0% {
      box-shadow: 0 8px 28px rgba(249, 168, 212, 0.2);
      border-color: rgba(252, 231, 243, 0.7);
    }
    50% {
      box-shadow: 0 9px 29px rgba(249, 168, 212, 0.23);
      border-color: rgba(252, 231, 243, 0.75);
    }
    100% {
      box-shadow: 0 10px 30px rgba(249, 168, 212, 0.25);
      border-color: rgba(252, 231, 243, 0.8);
    }
  }
  
  /* Elegant hover effect - extremely subtle */
  .transcript-box:hover {
    box-shadow: 0 10px 30px rgba(249, 168, 212, 0.28);
    border-color: rgba(249, 168, 212, 0.4);
    transform: translateY(-0.5px) scale(1.001);
  }
  
  /* Enhanced transcript text styling - dynamic sizing based on content */
  .custom-transcript-text {
    text-align: left;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    transition: background-color 0.4s ease, font-size 0.5s ease-out;
    line-height: 1.6; /* Consistent comfortable line height */
    /* Base text size now handled by responsiveFontSize classes */
  }
  
  /* Optimize spacing based on font size for better readability */
  .text-xs, .text-sm {
    letter-spacing: 0.01em; /* Slightly open tracking for smaller text */
  }
  
  .text-base, .text-lg {
    letter-spacing: 0; /* Normal tracking for medium text */
  }
  
  .text-xl, .text-2xl, .text-3xl, .text-4xl {
    line-height: 1.5; /* Slightly tighter for larger text */
    letter-spacing: -0.01em; /* Slightly tighter tracking for large text */
  }
  
  /* Elegant highlight when clicked/editing */
  .custom-transcript-text:focus {
    background-color: rgba(253, 242, 248, 0.6); /* Very light pink background */
    outline: none;
    border-radius: 0.75rem; /* Rounded corners */
    padding: 0.5rem; /* Subtle padding */
    margin: -0.5rem; /* Compensate for padding to maintain layout */
    box-shadow: inset 0 0 0 1px rgba(249, 168, 212, 0.15); /* Extremely subtle inner border */
  }
  
  /* Content area scrolling - more refined */
  .transcript-content-area {
    scrollbar-width: thin;
    scrollbar-color: rgba(249, 168, 212, 0.5) transparent;
    overscroll-behavior: contain; /* More controlled overscroll */
    -webkit-overflow-scrolling: touch; /* Smoother scrolling on iOS */
    scroll-behavior: smooth; /* Smoother scrolling */
    transition: all 0.3s ease-out; /* Smooth transitions */
  }
  
  /* Custom scrollbar styles for WebKit browsers */
  .transcript-content-area::-webkit-scrollbar {
    width: 6px;
  }
  
  .transcript-content-area::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .transcript-content-area::-webkit-scrollbar-thumb {
    background-color: rgba(249, 168, 212, 0.5);
    border-radius: 20px;
    border: 2px solid transparent;
  }
  
  /* Elegant scroll indicator for content overflow */
  .scroll-indicator-bottom {
    height: 40px; /* Taller gradient for more presence */
    background: linear-gradient(to top, 
                rgba(255, 255, 255, 0.98) 0%, 
                rgba(253, 242, 248, 0.9) 15%,
                rgba(253, 242, 248, 0.5) 40%,
                rgba(253, 242, 248, 0.1) 75%,
                rgba(255, 255, 255, 0) 100%);
    box-shadow: 0 -6px 12px -6px rgba(249, 168, 212, 0.15);
    border-bottom-left-radius: 2rem;
    border-bottom-right-radius: 2rem;
    pointer-events: none; /* Ensures text behind it is selectable */
    opacity: 0.95; /* Slight transparency */
  }
  
  /* Mobile optimization */
  @media (max-width: 600px) {
    .transcript-content-area {
      max-height: 280px; /* Slightly smaller on mobile */
      padding: 1.5rem;
      scrollbar-width: none; /* Hide scrollbar on Firefox */
    }
    
    .transcript-content-area::-webkit-scrollbar {
      display: none; /* Hide scrollbar on Webkit browsers */
    }
    
    .transcript-wrapper {
      margin-top: 24px; /* Smaller gap on mobile */
    }
    
    /* Slightly taller scroll indicator on mobile */
    .scroll-indicator-bottom {
      height: 48px;
    }
  }
  
  /* Button area styling - integrated with content */
  .transcript-button-area {
    flex-shrink: 0; /* Prevent button area from shrinking */
    background: transparent; /* Make it blend with content */
    margin-top: -8px; /* Pull it slightly closer to the content */
  }
  
  /* Ensure Share button stays centered */
  :global(.share-btn-text) {
    display: inline-block;
    text-align: center;
  }
  
  /* Animation classes */
  .animate-shadow-appear {
    box-shadow: 0 8px 30px rgba(249, 168, 212, 0.25);
    animation: shadowAppear 0.5s ease-out forwards;
  }
  
  .animate-text-appear {
    animation: textAppear 0.4s ease-out forwards;
  }
  
  @keyframes shadowAppear {
    from {
      box-shadow: 0 0 0 rgba(249, 168, 212, 0);
    }
    to {
      box-shadow: 0 8px 30px rgba(249, 168, 212, 0.25);
    }
  }
  
  @keyframes textAppear {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>