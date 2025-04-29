<script>
  import { createEventDispatcher } from 'svelte';
  
  // Event handling
  const dispatch = createEventDispatcher();
  
  // Close the modal when clicked
  function closeModal() {
    dispatch('close');
  }
</script>

<div
  class="flex justify-center w-full permission-error-container"
  on:click={closeModal}
  role="alertdialog"
  aria-labelledby="permission_error_title"
  aria-describedby="permission_error_description"
  aria-live="assertive"
>
  <div class="permission-error-modal">
    <!-- Icon and title -->
    <div class="modal-header">
      <div class="error-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="w-6 h-6"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h3 id="permission_error_title">Microphone Access Denied</h3>
    </div>

    <!-- Permission error message -->
    <p id="permission_error_description">
      TalkType needs microphone access to transcribe your speech. Please update your browser
      settings to allow microphone access.
    </p>

    <!-- Solution steps -->
    <div class="error-steps">
      <div class="step">
        <div class="step-number">1</div>
        <p>Click the microphone or lock icon in your address bar</p>
      </div>
      <div class="step">
        <div class="step-number">2</div>
        <p>Select "Allow" for microphone access</p>
      </div>
      <div class="step">
        <div class="step-number">3</div>
        <p>Refresh the page and try again</p>
      </div>
    </div>

    <!-- Dismiss button -->
    <button class="dismiss-btn" on:click|stopPropagation={closeModal}>
      Got it
    </button>
  </div>
</div>