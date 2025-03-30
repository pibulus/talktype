<script>
	import AudioToText from '$lib/components/AudioToText.svelte';
</script>

<section
	class="flex min-h-screen flex-col items-center justify-center bg-[#fefaf4] px-6 py-12 font-sans text-black antialiased md:px-10"
>
	<div class="mx-auto flex w-full max-w-xl flex-col items-center lg:max-w-2xl">
		<div class="mb-8 h-48 w-48 md:h-56 md:w-56 lg:h-64 lg:w-64">
			<img src="/talktype-icon.svg" alt="TalkType Ghost Icon" class="h-full w-full" />
		</div>

		<h1 class="mb-4 text-center text-6xl font-black tracking-tight md:text-7xl lg:text-8xl">
			TalkType
		</h1>
		<p class="mx-auto mb-3 max-w-lg text-center text-xl text-gray-700 md:text-2xl">
			Fast, accurate, and free voice-to-text transcription.
		</p>
		<p class="mb-10 text-center text-base text-gray-500">
			Brought to you by Dennis & Pabs <span class="text-red-500">❤️</span>
		</p>

		<AudioToText />
	</div>
</section>
