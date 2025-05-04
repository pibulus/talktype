<script>
  import { ModalCloseButton } from './index.js';
  export let closeModal;
</script>

<dialog id="extension_modal" class="modal modal-bottom sm:modal-middle overflow-hidden fixed z-50" style="overflow-y: hidden!important;" role="dialog" aria-labelledby="extension_modal_title" aria-modal="true">
  <div class="modal-box bg-gradient-to-br from-[#fffaef] to-[#fff6e6] shadow-xl border border-pink-200 rounded-2xl overflow-y-auto max-h-[80vh]">
    <form method="dialog">
      <ModalCloseButton {closeModal} label="Close extension modal" modalId="extension_modal" />
    </form>

    <div class="animate-fadeUp space-y-4">
      <div class="flex items-center gap-3 mb-1">
        <div class="w-9 h-9 bg-gradient-to-br from-white to-purple-50 rounded-full flex items-center justify-center shadow-sm border border-purple-200/60">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-purple-600">
            <path d="M6 2l.01 6L10 12l-4 4 .01 6H20V2H6zm7 11a1 1 0 110-2 1 1 0 010 2zm-1-9a1 1 0 000 2h5a1 1 0 100-2h-5z" />
          </svg>
        </div>
        <h3 id="extension_modal_title" class="font-black text-xl text-gray-800 tracking-tight">Chrome Extension</h3>
      </div>

      <div class="bg-gradient-to-r from-pink-50/90 to-amber-50/90 p-4 rounded-lg border border-pink-200/60 shadow-sm">
        <p class="text-sm leading-relaxed text-gray-700">
          Use TalkType everywhere on the web! Our Chrome extension lets you transcribe directly into any text field.
          Perfect for emails, social media, messaging apps, or anywhere else you need to type.
        </p>
      </div>

      <div class="rounded-xl border border-pink-200/60 bg-gradient-to-br from-white to-pink-50/50 p-4 shadow-sm">
        <h4 class="font-bold text-sm text-gray-800 mb-2">Installation in 5 easy steps:</h4>
        <ol class="mt-2 list-decimal space-y-2 pl-5 text-left text-sm text-gray-700">
          <li class="pb-1">
            Download the extension files <a
              href="#"
              class="text-pink-600 transition-colors hover:text-pink-700 hover:underline font-medium"
              >here</a
            >
          </li>
          <li class="pb-1">
            Unzip the files to a folder on your computer
          </li>
          <li class="pb-1">
            Open Chrome and go to <code
              class="rounded-md bg-pink-100 px-1.5 py-0.5 font-mono text-pink-700"
              >chrome://extensions</code
            >
          </li>
          <li class="pb-1">Enable "Developer mode" in the top-right corner</li>
          <li>Click "Load unpacked" and select the extension folder</li>
        </ol>
      </div>

      <div class="pt-1 flex justify-end">
        <span class="text-xs text-gray-600 italic font-medium">Voice-to-text anywhere, anytime 🎙️</span>
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