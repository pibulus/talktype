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
  
  // State
  let tooltipHoverCount = 0;
  let hasUsedCopyButton = false;
  
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
    // Ensure transcript is scrolled into view on mount
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  });
</script>

<div
  class="w-full transcript-wrapper animate-fadeIn-from-top"
  on:animationend={() => {
    // Scroll to the bottom when transcript appears
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
      class="transcript-box-wrapper relative mx-auto w-[90%] max-w-[500px] px-2 sm:w-full sm:px-3 md:px-0"
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

      <!-- Editable transcript box with controlled scrolling -->
      <div
        class="transcript-box animate-shadow-appear scrollbar-thin relative mx-auto my-4 box-border max-h-[60vh] w-full max-w-[90vw] overflow-y-auto whitespace-pre-line rounded-[2rem] border-[1.5px] border-pink-100 bg-white/95 px-4 py-4 font-mono leading-relaxed text-gray-800 shadow-xl transition-all duration-300 sm:px-6 sm:py-5"
      >
        <div
          class={`transcript-text ${responsiveFontSize} animate-text-appear`}
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
        
        <!-- Subtle gradient mask to indicate scrollable content -->
        <div
          class="scroll-indicator-bottom pointer-events-none absolute bottom-0 left-0 right-0 h-6 rounded-b-[2rem] bg-gradient-to-t from-white/90 to-transparent"
        ></div>

        <!-- Add padding at the bottom of transcript for the share button -->
        <div class="pb-16"></div>

        <!-- Simple share button at bottom middle - only visible when Web Share API is supported -->
        {#if isWebShareSupported()}
          <div
            class="absolute bottom-6 left-0 right-0 z-[200] flex w-full justify-center"
          >
            <button
              class="px-5 py-2 text-sm font-medium text-indigo-600 transition-all duration-200 rounded-full shadow-sm share-btn-text bg-gradient-to-r from-indigo-50 to-purple-100 hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 active:scale-95"
              on:click|preventDefault={() => dispatch('share', { text: getEditedTranscript() })}
              aria-label="Share transcript"
            >
              Share
            </button>
          </div>
        {/if}

        <!-- Hidden instructions for screen readers -->
        <div id="transcript-instructions" class="sr-only">
          Editable transcript. You can modify the text if needed.
        </div>
      </div>
    </div>
  </div>
</div>