<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  function showAbout() {
    dispatch('showAbout');
  }
  
  function showSettings() {
    dispatch('showSettings');
  }
  
  function showExtension() {
    dispatch('showExtension');
  }
</script>

<div class="flex items-center space-x-1 sm:space-x-2">
  <button
    class="btn btn-sm btn-ghost text-gray-600 hover:text-pink-500 shadow-none hover:bg-pink-50/50 transition-all text-xs sm:text-sm py-2 px-2 sm:px-3 h-auto min-h-0"
    on:click={showAbout}
    aria-label="About TalkType"
  >
    About
  </button>
  <button
    class="btn btn-sm btn-ghost text-gray-600 hover:text-pink-500 shadow-none hover:bg-pink-50/50 transition-all text-xs sm:text-sm py-2 px-2 sm:px-3 h-auto min-h-0"
    on:click={showSettings}
    aria-label="Open Settings"
  >
    Settings
  </button>
  <button
    class="btn btn-sm bg-gradient-to-r from-pink-50 to-purple-100 text-purple-600 border-none hover:bg-opacity-90 shadow-sm hover:shadow transition-all text-xs sm:text-sm py-2 px-3 sm:px-4 sm:py-2.5 h-auto min-h-0"
    on:click={showExtension}
    aria-label="Chrome Extension Information"
  >
    Chrome Extension
  </button>
</div>