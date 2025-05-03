/**
 * Animation Effects System
 * 
 * Handles the direct DOM manipulations required by animations
 * while maintaining a clean interface with the animation store.
 */

// DOM Effect handlers
export const createDomEffects = () => {
  // Internal effect registry
  const effects = new Map();
  
  // Force DOM reflow for reliable animations
  const forceReflow = (element) => {
    if (!element) return;
    void element.offsetWidth;
  };
  
  // Apply and optionally remove a class
  const applyClass = (element, className, duration = 0) => {
    if (!element) return null;
    
    forceReflow(element);
    element.classList.add(className);
    
    if (duration <= 0) return null;
    
    return {
      type: 'timeout',
      id: setTimeout(() => {
        element.classList.remove(className);
      }, duration),
      cleanup: () => element.classList.remove(className)
    };
  };
  
  // Apply a transform to an element
  const applyTransform = (element, transform) => {
    if (!element) return;
    forceReflow(element);
    element.style.transform = transform;
  };
  
  // Register an element for effects
  const registerElement = (id, element) => {
    // Handle special case for eyes structure
    if (id === 'eyes' && element && typeof element === 'object' && element.left && element.right) {
      effects.set(id, { 
        element: element.container,
        left: element.left,
        right: element.right,
        active: {} 
      });
      console.log('✅ Registered individual eye elements');
    } else {
      effects.set(id, { element, active: {} });
    }
    return () => effects.delete(id);
  };
  
  // Apply eye blink effect - now just updates the store
  const applyEyeBlink = (eyesId, closed = true) => {
    const entry = effects.get(eyesId);
    if (!entry) return;
    
    // Update the isClosed state - DOM will update via Svelte binding
    entry.isClosed = closed;
    
    // No direct DOM manipulation - the inline style in the component will handle this
    console.log(`👁️ Eye state updated: ${closed ? 'closed' : 'open'}`);
  };
  
  // Apply eye position effect - updates store only
  const applyEyePosition = (eyesId, x, y) => {
    const entry = effects.get(eyesId);
    if (!entry) {
      console.error(`❌ Cannot apply eye position: no entry found for ID ${eyesId}`, { 
        registeredIds: Array.from(effects.keys())
      });
      return;
    }
    
    // Update stored position - DOM will update via Svelte binding
    entry.position = { x, y };
    
    console.log(`👁️ Eye position updated: (${x}, ${y})`);
    
    // No direct DOM manipulation - the inline style in the component will handle this
  };
  
  // Apply wobble effect
  const applyWobble = (elementId, direction, duration = 600) => {
    const entry = effects.get(elementId);
    if (!entry || !entry.element) return;
    
    // Clear any active wobble
    if (entry.active.wobble) {
      clearTimeout(entry.active.wobble.id);
      entry.active.wobble.cleanup();
      entry.active.wobble = null;
    }
    
    // Apply new wobble class
    const wobbleClass = direction || (Math.random() > 0.5 ? 'wobble-left' : 'wobble-right');
    const effect = applyClass(entry.element, wobbleClass, duration);
    
    if (effect) {
      entry.active.wobble = effect;
    }
  };
  
  // Apply pulse effect
  const applyPulse = (elementId, duration = 600) => {
    const entry = effects.get(elementId);
    if (!entry || !entry.element) return;
    
    const effect = applyClass(entry.element, 'ghost-pulse', duration);
    
    if (effect) {
      entry.active.pulse = effect;
    }
  };
  
  // Apply spin effect
  const applySpin = (elementId, duration = 1500) => {
    const entry = effects.get(elementId);
    if (!entry || !entry.element) return;
    
    const effect = applyClass(entry.element, 'spin', duration);
    
    if (effect) {
      entry.active.spin = effect;
    }
  };
  
  // Set recording state visual effects
  const setRecordingState = (elementId, isRecording) => {
    const entry = effects.get(elementId);
    if (!entry || !entry.element) return;
    
    entry.element.classList.toggle('recording', isRecording);
  };
  
  // Set theme on ghost element
  const setTheme = (elementId, theme, backgroundId) => {
    const entry = effects.get(elementId);
    if (!entry || !entry.element) return;
    
    // Remove all theme classes
    const allThemes = ['peach', 'mint', 'bubblegum', 'rainbow'];
    allThemes.forEach(themeClass => {
      entry.element.classList.toggle(`theme-${themeClass}`, themeClass === theme);
    });
    
    // Special handling for rainbow animation
    const bgEntry = effects.get(backgroundId);
    if (bgEntry && bgEntry.element) {
      bgEntry.element.classList.toggle('rainbow-animated', theme === 'rainbow');
    }
  };
  
  // Update eye state - store only, no DOM manipulation
  const updateEyeState = (eyesId, { closed, position }) => {
    const entry = effects.get(eyesId);
    if (!entry) return;
    
    // Update stored state - DOM will update via Svelte binding
    entry.isClosed = closed;
    if (position) {
      entry.position = position;
    }
    
    // If we have separate eye elements, they'll both read from the same state
    console.log(`👁️ Eye state fully updated: closed=${closed}, position=(${position?.x || 0}, ${position?.y || 0})`);
    
    // No direct DOM manipulation - the inline style in the component will handle this
  };
  
  // Cleanup all effects
  const cleanup = () => {
    effects.forEach(entry => {
      Object.values(entry.active).forEach(effect => {
        if (effect && effect.id) {
          clearTimeout(effect.id);
        }
        if (effect && effect.cleanup) {
          effect.cleanup();
        }
      });
    });
    
    effects.clear();
  };
  
  return {
    registerElement,
    applyEyeBlink,
    applyEyePosition,
    applyWobble,
    applyPulse,
    applySpin,
    setRecordingState,
    setTheme,
    updateEyeState,
    cleanup
  };
};

// Export singleton instance
export const domEffects = createDomEffects();