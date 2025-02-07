<!-- FrontPage.svelte -->
<script>
  import AudioToText from '$lib/components/AudioToText.svelte';
</script>

<section class="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-r from-neutral to-base-100 animate-fadeIn">
  <div class="max-w-2xl p-8 text-center border border-opacity-50 rounded-lg shadow-2xl bg-base-100 bg-opacity-80 backdrop-blur-md border-primary card" transition:fade>
    <!-- <h4 class="text-xl font-medium text-accent">Welcome to</h4> -->
    <h1 class="mt-2 mb-6 text-6xl font-extrabold md:text-7xl text-primary">
      TalkType
    </h1>
    <p class="mb-8 text-2xl md:text-3xl text-base-content">
      Fast, accurate, and free voice-to-text transcription.
    </p>
    <p class="mb-4 text-lg text-center text-primary">
      Brought to you by Dennis & Pabs ❤️
    </p>
    <AudioToText />
  </div>
</section>
