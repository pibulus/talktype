<script>
  import { promptStyle } from '$lib';
  import { geminiService } from '$lib/services/geminiService';
  import { PROMPT_STYLES } from '$lib/constants';

  // Props
  export let selectedPromptStyle = 'standard';
  
  // Available styles (excluding leetSpeak and sparklePop)
  const availableStyles = [
    PROMPT_STYLES.STANDARD, // Keep standard/refined as a selectable option
    PROMPT_STYLES.SURLY_PIRATE,
    PROMPT_STYLES.CODE_WHISPERER,
    PROMPT_STYLES.QUILL_AND_INK
  ];

  // Define style icons with nicer SVG icons in more distinct colors
  const styleIcons = {
    standard: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-pink-500">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>`,
    surlyPirate: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-amber-500">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                 </svg>`,
    codeWhisperer: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-cyan-500">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                   </svg>`,
    quillAndInk: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-violet-500">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                 </svg>`
  };

  // Style names (more descriptive)
  const styleNames = {
    standard: 'Standard',
    surlyPirate: 'Pirate',
    codeWhisperer: 'Code',
    quillAndInk: 'Victorian'
  };

  // Style tooltips (full descriptions for tooltips)
  const styleTooltips = {
    standard: 'Elegant, professional tone',
    surlyPirate: 'Pirate lingo & swagger',
    codeWhisperer: 'Structured tech syntax',
    quillAndInk: 'Victorian literature style'
  };

  // Props for handler function
  export let changePromptStyle = (style) => {
    // Simply set the selected style
    selectedPromptStyle = style;
    
    // Update the service
    geminiService.setPromptStyle(style);

    // Update the store (this will also save to localStorage)
    promptStyle.set(style);

    // Dispatch a custom event that the main page can listen for
    window.dispatchEvent(
      new CustomEvent('talktype-setting-changed', {
        detail: { setting: 'promptStyle', value: style }
      })
    );
  };
</script>

<div class="space-y-2">
  <h4 class="text-sm font-bold text-gray-700">Transcription Style</h4>
  
  <!-- Using exact same grid pattern as vibe selector -->
  <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
    {#each availableStyles as style}
      <button
        class="vibe-option relative flex flex-col items-center rounded-xl border border-pink-100 bg-[#fffdf5] p-2 shadow-sm transition-all duration-300 hover:border-pink-200 hover:shadow-md {selectedPromptStyle === style ? 'selected-vibe border-pink-300 ring-2 ring-pink-200 ring-opacity-60' : ''}"
        on:click={() => changePromptStyle(style)}
        aria-label={styleNames[style] || style}
        title={styleTooltips[style]}
        data-style-type={style}
      >
        <div class="preview-container mb-1">
          <!-- Using same dimensions as theme preview for consistency -->
          <div class="preview-ghost-wrapper relative h-10 w-10">
            <div class="preview-icon-layers relative h-full w-full flex items-center justify-center">
              {@html styleIcons[style] || ''}
            </div>
          </div>
        </div>
        
        <!-- Style Name -->
        <span class="text-xs font-medium text-gray-700">{styleNames[style] || style}</span>

        <!-- Tooltip on hover -->
        <div class="tooltip opacity-0 invisible absolute -top-9 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap pointer-events-none transition-opacity duration-150">
          {styleTooltips[style]}
          <div class="tooltip-arrow absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>

        <!-- Selected indicator (matching vibe selector above) -->
        {#if selectedPromptStyle === style}
          <div class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-pink-400 text-xs text-white shadow-sm">
            ✓
          </div>
        {/if}
      </button>
    {/each}
  </div>
  
</div>

<style>
  /* Using the exact same classes as the vibe selector for complete consistency */
  /* We inherit all styling from the main modal's vibe-option and selected-vibe classes */
  
  /* Explicitly adding the shadows to match in case of CSS specificity issues */
  .selected-vibe {
    box-shadow:
      0 0 0 2px rgba(249, 168, 212, 0.4),
      0 4px 8px rgba(249, 168, 212, 0.2);
  }
  
  /* SVG icon styling */
  svg {
    transition: all 0.3s ease;
    height: 24px;
    width: 24px;
  }
  
  .style-option:hover svg {
    filter: drop-shadow(0 0 3px rgba(249, 168, 212, 0.5));
  }
  
  /* Tooltip styling */
  button:hover .tooltip {
    opacity: 1;
    visibility: visible;
  }
  
  .tooltip {
    z-index: 10;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
  }
  
  .tooltip-arrow {
    width: 0;
    height: 0;
  }
</style>