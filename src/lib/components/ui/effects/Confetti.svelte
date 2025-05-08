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
    
    // Fire the main burst of confetti with more impact
    confetti({
      particleCount: Math.floor(particleCount * 0.75),
      spread: 80, // Wider spread for more coverage
      origin: { x: originX, y: Math.max(0.05, originY - 0.05) }, // Slightly higher origin for better downward motion
      colors,
      startVelocity: 45, // Higher velocity for more pop
      gravity: 0.9, // Slightly reduced gravity for longer hang time
      ticks: 400,
      shapes: ['square', 'circle'],
      scalar: 1.3, // Slightly larger particles
      zIndex: 1000,
      disableForReducedMotion: true
    });
    
    // Add a second burst for more fun (reduced delay, different angle)
    setTimeout(() => {
      confetti({
        particleCount: Math.floor(particleCount * 0.35), // More particles in second burst
        spread: 100, // Wider spread
        origin: { x: originX - 0.1, y: Math.max(0.05, originY - 0.03) }, // Slightly offset
        colors,
        startVelocity: 35, // Higher velocity
        gravity: 0.7, // Lower gravity for longer hang time
        ticks: 350,
        shapes: ['square', 'circle'],
        scalar: 1.1,
        zIndex: 1000,
        disableForReducedMotion: true
      });
    }, 80); // Reduced delay for quicker follow-up
  }
</script>

<!-- This component has no visual markup, just fires the confetti effect on mount -->