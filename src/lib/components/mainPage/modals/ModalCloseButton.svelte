<script>
  /**
   * A reusable modal close button component that provides consistent styling and behavior
   * across all modals in the application.
   */
  export let position = 'right-3 top-3';
  export let size = 'md';
  export let label = 'Close';
  export let closeModal;
  export let modalId = null;
  
  // Size classes mapping
  const sizeClasses = {
    sm: 'h-6 w-6 text-sm',
    md: 'h-8 w-8 text-base',
    lg: 'h-10 w-10 text-lg'
  };
  
  // Get size classes based on the size prop
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  
  // Handle click with both dialog closing and function call
  function handleClick() {
    if (modalId) {
      // Close the dialog by ID first
      const modal = document.getElementById(modalId);
      if (modal && typeof modal.close === 'function') {
        modal.close();
      }
    }
    
    // Then call the provided closeModal function
    if (typeof closeModal === 'function') {
      closeModal();
    }
  }
</script>

<button
  type="button"
  class="modal-close-btn absolute {position} z-50 flex {sizeClass} items-center justify-center rounded-full border border-pink-200 bg-pink-100 text-pink-500 shadow-sm transition-all duration-200 ease-in-out hover:bg-pink-200 hover:text-pink-700"
  aria-label={label}
  on:click|preventDefault={handleClick}
>
  <span class="relative leading-none flex items-center justify-center h-full w-full">✕</span>
</button>

<style>
  .modal-close-btn {
    -webkit-tap-highlight-color: transparent;
    outline: none;
    cursor: pointer;
    user-select: none;
  }

  .modal-close-btn:hover {
    transform: scale(1.05);
  }

  .modal-close-btn:active {
    transform: scale(0.95);
  }
</style>