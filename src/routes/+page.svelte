<script>
	import AudioToText from '$lib/components/AudioToText.svelte';
</script>

<section
	class="flex min-h-screen flex-col items-center justify-center bg-[#fefaf4] px-4 pb-20 pt-16 font-sans text-black antialiased"
>
	<div class="mx-auto flex w-full max-w-md flex-col items-center lg:max-w-lg">
		<div class="mb-4 h-32 w-32">
			<img src="/talktype-icon.svg" alt="TalkType Ghost Icon" class="h-full w-full" />
		</div>

		<h1 class="mb-2 text-center text-6xl font-black tracking-tight md:text-7xl">TalkType</h1>
		<p class="mx-auto mb-1 max-w-md text-center text-xl text-gray-700">
			Fast, accurate, and free voice-to-text transcription.
		</p>
		<p class="mb-6 text-center text-base text-gray-500">
			Brought to you by Dennis & Pabs <span class="text-red-500">❤️</span>
		</p>

		<AudioToText />
	</div>
</section>
