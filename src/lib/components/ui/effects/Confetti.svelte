<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import confetti from 'canvas-confetti';
  import { ANIMATION } from '$lib/constants';
  
  // Props with defaults
  export let targetSelector = null;
  export let duration = ANIMATION.CONFETTI.ANIMATION_DURATION;
  export let colors = ANIMATION.CONFETTI.COLORS;
  export let particleCount = ANIMATION.CONFETTI.PIECE_COUNT;
  
  const dispatch = createEventDispatcher();
  
  onMount(() => {
    // Fire confetti effect
    fireConfetti();
    
    // Dispatch complete event after animation duration
    setTimeout(() => {
      dispatch('complete');
    }, duration);
  });
  
  function fireConfetti() {
    let originX = 0.5; // Center of screen by default
    let originY = 0.1; // Near the top by default
    
    // If target selector provided, use its position
    if (targetSelector && typeof document !== 'undefined') {
      const targetElement = document.querySelector(targetSelector);
      
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Calculate center point relative to viewport (0-1 range)
        originX = (rect.left + rect.width / 2) / windowWidth;
        originY = rect.top / windowHeight;
      }
    }
    
    // Fire the main burst of confetti
    confetti({
      particleCount: Math.floor(particleCount * 0.75),
      spread: 70,
      origin: { x: originX, y: originY },
      colors,
      startVelocity: 30,
      gravity: 1,
      ticks: 400,
      shapes: ['square', 'circle'],
      scalar: 1.2,
      zIndex: 1000,
      disableForReducedMotion: true
    });
    
    // Add a second burst for more fun (slight delay, different angle)
    setTimeout(() => {
      confetti({
        particleCount: Math.floor(particleCount * 0.25),
        spread: 90,
        origin: { x: originX - 0.1, y: originY },
        colors,
        startVelocity: 25,
        gravity: 0.8,
        ticks: 350,
        shapes: ['square', 'circle'],
        scalar: 1.1,
        zIndex: 1000,
        disableForReducedMotion: true
      });
    }, 150);
  }
</script>

<!-- This component has no visual markup, just fires the confetti effect on mount -->