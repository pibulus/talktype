<script>
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { AppSuffix } from '$lib/components/ui';

  const dispatch = createEventDispatcher();
  
  export let title = 'TalkType';
  export let subtitle = "Voice-to-text that doesn't suck. Spooky good, freaky fast, always free.";
  export let showAppSuffix = true;
  export let suffixColor = "inherit"; // Inherit color from parent title
  export let suffixSize = "40%"; // Smaller suffix (40% of parent size)
  
  onMount(() => {
    // Set up animation sequence timing (for title/subtitle)
    setTimeout(() => {
      dispatch('titleAnimationComplete');
    }, 1200); // After staggered animation
    
    setTimeout(() => {
      dispatch('subtitleAnimationComplete');
    }, 2000); // After subtitle slide-in
  });
</script>

<!-- Typography with improved kerning and weight using font-variation-settings -->
<div class="title-container relative">
  <h1
    class="staggered-text mb-2 text-center text-5xl font-black tracking-tight cursor-default select-none sm:mb-3 md:mb-3 sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl"
    style="font-weight: 900; letter-spacing: -0.02em; font-feature-settings: 'kern' 1; font-kerning: normal; font-variation-settings: 'wght' 900, 'opsz' 32;"
    aria-label={title}
  >
    <!-- Use aria-hidden for spans if H1 has aria-label -->
    <span class="talktype-main-word">
      <span class="stagger-letter mr-[-0.06em]" aria-hidden="true">T</span><span class="stagger-letter ml-[-0.04em]" aria-hidden="true">a</span><span
        class="stagger-letter" aria-hidden="true">l</span
      ><span class="stagger-letter" aria-hidden="true">k</span><span class="stagger-letter mr-[-0.04em]" aria-hidden="true">T</span><span
        class="stagger-letter ml-[-0.03em]" aria-hidden="true">y</span
      ><span class="stagger-letter" aria-hidden="true">p</span><span class="stagger-letter" aria-hidden="true">e</span>
    </span>
    
    {#if showAppSuffix}
      <span class="app-suffix-container stagger-letter" style="animation-delay: 0.45s; position: relative;">
        <AppSuffix 
          color={suffixColor}
          size={suffixSize}
          offsetX="-0.3em"
          offsetY="8px"
          position="bottom-right"
          wiggleOnHover={true}
          customClass="title-suffix"
        />
      </span>
    {/if}
  </h1>
</div>

<!-- Updated subheadline with improved typography and brand voice -->
<p
  class="slide-in-subtitle mx-auto mt-2 mb-8 max-w-prose text-base text-center text-gray-700/85 cursor-default select-none sm:mt-3 sm:mb-10 sm:text-lg md:mt-3 md:mb-10 md:text-xl lg:text-2xl"
  style="font-weight: 400; letter-spacing: 0.015em; line-height: 1.65; max-width: 35ch; font-variation-settings: 'wght' 400, 'opsz' 16;"
>
  {subtitle}
</p>

<style>
  /* Staggered text animation for title - more reliable approach */
  .staggered-text {
    opacity: 1;
    font-feature-settings: "kern" 1;
    font-kerning: normal;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .stagger-letter {
    display: inline-block;
    opacity: 0;
    transform: translateY(15px);
    animation: staggerFadeIn 0.6s cubic-bezier(0.19, 1, 0.22, 1) forwards;
    will-change: transform, opacity;
  }

  /* Apply different delays to each letter */
  .stagger-letter:nth-child(1) { animation-delay: 0.05s; }
  .stagger-letter:nth-child(2) { animation-delay: 0.1s; }
  .stagger-letter:nth-child(3) { animation-delay: 0.15s; }
  .stagger-letter:nth-child(4) { animation-delay: 0.2s; }
  .stagger-letter:nth-child(5) { animation-delay: 0.25s; }
  .stagger-letter:nth-child(6) { animation-delay: 0.3s; }
  .stagger-letter:nth-child(7) { animation-delay: 0.35s; }
  .stagger-letter:nth-child(8) { animation-delay: 0.4s; }

  @keyframes staggerFadeIn {
    0% {
      opacity: 0;
      transform: translateY(15px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Slide-in animation for subtitle - with hardware acceleration for performance */
  .slide-in-subtitle {
    opacity: 0;
    transform: translateY(10px);
    animation: slideIn 0.8s cubic-bezier(0.19, 1, 0.22, 1) forwards;
    animation-delay: 0.6s;
    will-change: transform, opacity;
    backface-visibility: hidden;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-feature-settings: "kern" 1;
    font-kerning: normal;
    max-width: 40ch;
  }

  @keyframes slideIn {
    0% {
      opacity: 0;
      transform: translateY(10px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Main container for title to help with centering */
  .title-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  }
  
  /* Container to visually center the main "TalkType" word */
  .talktype-main-word {
    display: inline-block;
    position: relative;
  }
  
  /* App suffix container styling */
  .app-suffix-container {
    display: inline-block;
    width: 0;
    height: 0;
    overflow: visible;
  }
  
  /* Styles applied to the AppSuffix component */
  :global(.title-suffix) {
    letter-spacing: -0.01em;
    font-variation-settings: inherit;
    opacity: 0.85; /* Slightly less prominent than the main title */
  }
  
  /* Media queries for mobile optimization */
  @media (max-width: 640px) {
    h1.staggered-text {
      font-size: 3rem;
      line-height: 1.1;
    }

    .slide-in-subtitle {
      max-width: 28ch !important;
      margin-top: 0.5rem !important;
      margin-bottom: 2.5rem !important; /* ~40px on mobile */
      font-size: 1rem; /* 16px on mobile as requested */
      line-height: 1.6;
    }
    
    .badge-container {
      bottom: 0.3em;
    }
  }
</style>