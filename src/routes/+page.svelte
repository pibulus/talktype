<script>
	import AudioToText from '$lib/components/AudioToText.svelte';
</script>

<section
	class="mt-[-5vh] flex min-h-screen flex-col items-center justify-center bg-[#fefaf4] px-4 py-8 pt-[6vh] font-sans text-black antialiased sm:px-6 md:px-10 md:pt-[8vh] lg:py-12"
>
	<div
		class="mx-auto flex w-full max-w-md flex-col items-center sm:max-w-lg md:max-w-2xl lg:max-w-3xl"
	>
		<!-- Ghost Icon - Mobile: tight, Desktop: chunky -->
		<div
			class="icon-container mb-1 h-32 w-32 sm:h-40 sm:w-40 md:mb-2 md:h-56 md:w-56 lg:h-64 lg:w-64"
		>
			<img src="/talktype-icon.svg" alt="TalkType Ghost Icon" class="h-full w-full" />
		</div>

		<!-- Typography - Tighter on mobile, more spacious on desktop -->
		<h1
			class="mb-1 text-center text-5xl font-black tracking-tight sm:mb-2 sm:text-6xl md:mb-3 md:text-7xl lg:text-8xl xl:text-9xl"
		>
			TalkType
		</h1>
		<p
			class="mx-auto mb-1 max-w-sm text-center text-xl text-gray-700 sm:mb-2 sm:max-w-md sm:text-2xl md:max-w-lg md:text-3xl"
		>
			Fast, accurate, and free voice-to-text transcription.
		</p>
		<p class="mb-6 text-center text-sm text-gray-500 sm:text-base md:mb-8 md:text-lg lg:mb-10">
			Brought to you by Dennis & Pabs <span class="text-red-500">❤️</span>
		</p>

		<!-- Audio component - Full width but constrained -->
		<div class="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl">
			<AudioToText />
		</div>
	</div>
</section>

<style>
	.icon-container {
		filter: drop-shadow(0 0 8px rgba(255, 156, 243, 0.15));
		transition: all 0.3s ease;
	}

	.icon-container:hover {
		filter: drop-shadow(0 0 12px rgba(255, 156, 243, 0.3));
		transform: scale(1.03);
		animation: gentle-pulse 3s infinite;
	}

	@media (min-width: 768px) {
		.icon-container {
			filter: drop-shadow(0 0 12px rgba(255, 156, 243, 0.2));
		}

		.icon-container:hover {
			filter: drop-shadow(0 0 20px rgba(255, 156, 243, 0.4));
		}
	}

	@keyframes gentle-pulse {
		0% {
			filter: drop-shadow(0 0 12px rgba(255, 156, 243, 0.3));
		}
		50% {
			filter: drop-shadow(0 0 20px rgba(255, 156, 243, 0.5));
		}
		100% {
			filter: drop-shadow(0 0 12px rgba(255, 156, 243, 0.3));
		}
	}
</style>
