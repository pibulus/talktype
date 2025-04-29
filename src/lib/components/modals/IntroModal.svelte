<script>
  import { browser } from '$app/environment';
  
  export let closeModal;
  export let markIntroAsSeen;
  export let triggerGhostClick;

  function handleActionButton() {
    const modal = document.getElementById('intro_modal');
    if (modal) modal.close();
    markIntroAsSeen();
    
    setTimeout(() => {
      triggerGhostClick();
    }, 300);
  }
</script>

<dialog id="intro_modal" class="modal modal-bottom sm:modal-middle" role="dialog" aria-labelledby="intro_modal_title" aria-modal="true">
  <div class="modal-box relative bg-[#fff9ed] rounded-3xl p-6 sm:p-8 md:p-10 w-[95%] max-w-[90vw] sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto border-0"
    style="box-shadow: 0 10px 25px -5px rgba(249, 168, 212, 0.3), 0 8px 10px -6px rgba(249, 168, 212, 0.2), 0 0 15px rgba(249, 168, 212, 0.15);">

    <form method="dialog">
      <button class="btn btn-sm btn-circle absolute right-4 top-4 bg-[#fff9ed]/80 border-0 text-neutral-400 hover:bg-[#fff6e6] hover:text-neutral-700 shadow-sm" aria-label="Close Intro">✕</button>
    </form>

    <div class="space-y-5 sm:space-y-6 md:space-y-7 animate-fadeIn">
      <div class="flex justify-center mb-4">
        <div class="relative w-16 h-16 animate-pulse-slow">
          <img src="/talktype-icon-bg-gradient.svg" alt="" class="absolute inset-0 w-full h-full" loading="lazy" />
          <img src="/assets/talktype-icon-base.svg" alt="" class="absolute inset-0 w-full h-full" loading="lazy" />
          <img src="/assets/talktype-icon-eyes.svg" alt="" class="absolute inset-0 w-full h-full intro-eyes" loading="lazy" />
        </div>
      </div>

      <h1 id="intro_modal_title" class="text-center text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-gray-900">
        TalkType's the best. <br> Kick out the rest.
      </h1>

      <div class="space-y-3 sm:space-y-4">
        <p class="text-sm sm:text-base md:text-lg font-medium text-gray-700 leading-relaxed">
          Clean, sweet, and stupidly easy.
        </p>

        <p class="text-sm sm:text-base md:text-lg font-medium text-gray-700 leading-relaxed">
          Tap the ghost to speak — we turn your voice into text.
        </p>

        <p class="text-sm sm:text-base md:text-lg font-medium text-gray-700 leading-relaxed">
          Use it anywhere. Save it to your home screen.
          Add the extension. Talk into any box on any site.
        </p>
      </div>

      <button
        class="w-full bg-gradient-to-r from-amber-100 to-amber-200 px-4 py-3 sm:px-5 sm:py-4 rounded-xl text-center text-sm sm:text-base md:text-lg text-gray-800 font-bold shadow-md border border-amber-300/50 hover:shadow-lg hover:bg-gradient-to-r hover:from-amber-200 hover:to-amber-300 hover:text-gray-900 active:scale-[0.98] transition-all duration-300 cursor-pointer relative"
        on:click={handleActionButton}
      >
        You click the ghost, we do the most.
      </button>

      <p class="text-center text-pink-600 font-bold text-base sm:text-lg md:text-xl py-2">
        It's fast, it's fun, it's freaky good.
      </p>

      <form method="dialog">
        <button
          class="w-full text-base sm:text-lg font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-full bg-gradient-to-r from-yellow-400 to-pink-400 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
          on:click={markIntroAsSeen}
        >
          Let's Go! 🚀
        </button>
      </form>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>

<style>
  .animate-fadeIn {
    animation: fadeIn 0.5s ease-out forwards;
  }

  @keyframes fadeIn {
    0% {
      opacity: 0;
      transform: translateY(8px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-pulse-slow {
    animation: pulse-slow 3s ease-in-out infinite;
  }

  @keyframes pulse-slow {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }

  :global(.intro-eyes) {
    animation: intro-blink 3s infinite;
  }

  @keyframes intro-blink {
    0%, 30%, 33%, 69%, 100% {
      transform: scaleY(1);
    }
    31%, 32% {
      transform: scaleY(0);
    }
    70%, 71% {
      transform: scaleY(0);
    }
  }
</style>