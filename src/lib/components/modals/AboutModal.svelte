<script>
  export let closeModal;
</script>

<dialog id="about_modal" class="modal modal-bottom sm:modal-middle overflow-hidden fixed z-50" style="overflow-y: hidden!important;" role="dialog" aria-labelledby="about_modal_title" aria-modal="true">
  <div class="modal-box bg-gradient-to-br from-[#fffaef] to-[#fff6e6] shadow-xl border border-pink-200 rounded-2xl overflow-y-auto max-h-[80vh]">
    <form method="dialog">
      <button
        class="btn btn-sm btn-circle absolute right-3 top-3 bg-pink-100 border-pink-200 text-pink-500 hover:bg-pink-200 hover:text-pink-700 shadow-sm"
        on:click={closeModal}
      >✕</button>
    </form>

    <div class="animate-fadeUp space-y-4">
      <div class="flex items-center gap-3 mb-1">
        <div class="w-9 h-9 bg-gradient-to-br from-white to-pink-50 rounded-full flex items-center justify-center shadow-sm border border-pink-200/60">
          <div class="relative w-7 h-7">
            <img src="/talktype-icon-bg-gradient.svg" alt="" class="absolute inset-0 w-full h-full" />
            <img src="/assets/talktype-icon-base.svg" alt="" class="absolute inset-0 w-full h-full" />
            <img src="/assets/talktype-icon-eyes.svg" alt="" class="absolute inset-0 w-full h-full" />
          </div>
        </div>
        <h3 id="about_modal_title" class="font-black text-xl text-gray-800 tracking-tight">About TalkType</h3>
      </div>

      <div class="bg-gradient-to-r from-pink-50/90 to-amber-50/90 p-4 rounded-lg border border-pink-200/60 shadow-sm">
        <p class="text-sm leading-relaxed text-gray-700">
          TalkType is a minimalist voice-to-text tool that transforms your speech into text effortlessly.
          Built with love by two friends who think tech should be <span class="text-pink-600 font-medium">simple</span>,
          <span class="text-amber-600 font-medium">delightful</span>, and actually <span class="text-pink-600 font-medium">helpful</span>.
        </p>
      </div>

      <div>
        <h4 class="font-bold text-sm text-gray-700 mb-2">Why we made this:</h4>
        <ul class="space-y-1.5 text-sm text-gray-600">
          <li class="flex items-start gap-2">
            <span class="text-pink-500 text-lg">⬩</span>
            <span>We both think better by <span class="italic">talking</span>, not typing</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-pink-500 text-lg">⬩</span>
            <span>Other voice-typing tools are either expensive or clunky</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-pink-500 text-lg">⬩</span>
            <span>We wanted something beautiful that just works</span>
          </li>
        </ul>
      </div>

      <div class="border-l-3 border-pink-300 py-1 pl-4 ml-1 my-2 italic text-gray-600">
        "A little bit of soul, a hint of chaos, and a deep love for clarity."
      </div>

      <div class="flex justify-between items-end pt-2">
        <div>
          <p class="text-xs text-gray-500">Made with ☕ in Melbourne, Australia</p>
        </div>
        <div class="flex items-center gap-2 text-xs font-medium text-gray-600">
          <span class="animate-pulse text-pink-500">❤️</span> Dennis & Pabs
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop bg-black/40" on:click={closeModal}></div>
</dialog>

<style>
  .animate-fadeUp {
    animation: fadeUp 0.5s ease-out forwards;
  }

  @keyframes fadeUp {
    0% {
      opacity: 0;
      transform: translateY(8px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>