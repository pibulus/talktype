<!-- FrontPage.svelte -->
<script>
  import AudioToText from '$lib/components/AudioToText.svelte';
</script>

<section class="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-r from-neutral to-base-100 animate-fadeIn">
  <div class="max-w-2xl p-8 text-center rounded-lg shadow-lg bg-base-100 bg-opacity-80 backdrop-blur-md border border-primary border-opacity-50">
    <h1 class="mb-6 text-6xl font-extrabold md:text-7xl text-primary">
      TalkType
    </h1>
    <p class="mb-8 text-2xl md:text-3xl text-base-content">
      Fast, accurate, and free voice-to-text transcription.
    </p>
    <AudioToText />
  </div>
</section>
