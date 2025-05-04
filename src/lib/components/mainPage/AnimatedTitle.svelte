<script>
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  
  export let title = 'TalkType';
  export let subtitle = "Voice-to-text that doesn't suck. Spooky good, freaky fast, always free.";
  
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
<h1
  class="staggered-text mb-1 text-center text-5xl font-black tracking-tight cursor-default select-none sm:mb-1 sm:text-6xl md:mb-1 md:text-7xl lg:text-8xl xl:text-9xl"
  style="font-weight: 900; letter-spacing: -0.02em; font-feature-settings: 'kern' 1; font-kerning: normal; font-variation-settings: 'wght' 900, 'opsz' 32;"
  aria-label={title}
>
  <!-- Use aria-hidden for spans if H1 has aria-label -->
  <span class="stagger-letter mr-[-0.06em]" aria-hidden="true">T</span><span class="stagger-letter ml-[-0.04em]" aria-hidden="true">a</span><span
    class="stagger-letter" aria-hidden="true">l</span
  ><span class="stagger-letter" aria-hidden="true">k</span><span class="stagger-letter mr-[-0.04em]" aria-hidden="true">T</span><span
    class="stagger-letter ml-[-0.03em]" aria-hidden="true">y</span
  ><span class="stagger-letter" aria-hidden="true">p</span><span class="stagger-letter" aria-hidden="true">e</span>
</h1>

<!-- Updated subheadline with improved typography and brand voice -->
<p
  class="slide-in-subtitle mx-auto mt-2 mb-2 max-w-prose text-xl text-center text-gray-700/85 cursor-default select-none sm:mt-6 sm:mb-4 md:mt-6 md:mb-4"
  style="font-weight: 400; letter-spacing: 0.015em; line-height: 1.6; max-width: 35ch; font-variation-settings: 'wght' 400, 'opsz' 16;"
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

  /* Media queries for mobile optimization */
  @media (max-width: 640px) {
    h1.staggered-text {
      font-size: 3rem;
      line-height: 1.1;
    }

    .slide-in-subtitle {
      max-width: 28ch !important;
      margin-top: 0.5rem !important;
      margin-bottom: 0.75rem !important;
      font-size: 1.125rem;
    }
  }
</style>