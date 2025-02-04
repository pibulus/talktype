<!-- FrontPage.svelte -->
<script>
  import AudioToText from '$lib/components/AudioToText.svelte';
</script>

<section class="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-r from-background to-gray-800 animate-fadeIn">
  <div class="max-w-2xl p-8 text-center bg-gray-900 rounded-lg shadow-lg bg-opacity-90">
    <h1 class="mb-6 text-6xl font-extrabold md:text-7xl text-primary">
      TalkType
    </h1>
    <p class="mb-8 text-2xl md:text-3xl text-secondary">
      Fast, accurate, and free voice-to-text transcription.
    </p>
    <AudioToText />
  </div>
</section>
