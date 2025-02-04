<!-- FrontPage.svelte -->
<script>
  import AudioToText from '$lib/components/AudioToText.svelte';
</script>

<section class="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-r from-background to-gray-800">
  <div class="max-w-2xl text-center">
    <h1 class="mb-6 text-5xl font-extrabold md:text-6xl text-primary">
      TalkType
    </h1>
    <p class="mb-8 text-xl md:text-2xl text-secondary">
      Fast, accurate, and free voice-to-text transcription.
    </p>
    <div class="mb-10">
      <AudioToText />
    </div>
    <div class="flex flex-wrap justify-center gap-4">
      <a href="#features" class="px-6 py-3 transition-colors border-2 rounded-full border-primary text-primary hover:bg-primary hover:text-background">
        Features
      </a>
      <a href="#download" class="px-6 py-3 transition-colors rounded-full bg-primary text-background hover:bg-opacity-80">
        Download
      </a>
    </div>
  </div>
</section>
