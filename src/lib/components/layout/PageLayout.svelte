<script>
	import { onMount } from 'svelte';
	export let title = 'TalkType | Spooky Good Voice-to-Text';
	export let description =
		'TalkType turns your voice into text. Clean, simple, and freaky fast voice typing. Free forever. Tap the ghost and start talking!';
	export let footerYear = new Date().getFullYear();
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
</svelte:head>

<section
	class="bg-gradient-mesh main center hero grid min-h-[100dvh] gap-8 px-4 py-6 pb-16 pt-[clamp(4rem,12vh,8rem)] font-sans text-black antialiased sm:px-6 md:px-10 lg:pb-16"
>
	<div
		class="mx-auto flex w-full max-w-md flex-col items-center sm:max-w-lg md:max-w-2xl lg:max-w-3xl"
	>
		<slot />
	</div>

	<!-- Footer section with attribution and Chrome extension info -->
	<footer
		class="fixed bottom-0 left-0 right-0 z-10 box-border border-t border-pink-200/80 bg-gradient-to-r from-[#fff6e6]/90 via-[#ffead8]/90 to-[#fff1df]/90 pb-2 pt-3 text-center text-xs text-gray-600 shadow-[0_-4px_15px_rgba(249,168,212,0.3)] backdrop-blur-[3px] sm:pb-4 sm:pt-6"
	>
		<div
			class="container mx-auto flex flex-row items-center justify-center gap-1 sm:justify-between sm:gap-3"
		>
			<!-- Hide copyright on mobile, show on sm+ -->
			<div class="copyright ml-4 hidden flex-wrap items-center justify-center sm:ml-6 sm:flex md:ml-8">
				<span class="mr-1 text-sm font-medium tracking-tight">
					© {footerYear} TalkType
				</span>
				<span class="mx-2 text-pink-300">•</span>
				<span class="text-sm font-light text-gray-600"
					>Made with
					<span
						class="mx-0.5 inline-block transform animate-pulse text-pink-500 transition-transform duration-300 hover:scale-110"
						aria-label="love">❤️</span
					>
					in Melbourne
				</span>
			</div>
			<div class="flex items-center sm:mr-6 md:mr-8">
				<slot name="footer-buttons" />
			</div>
		</div>
	</footer>
</section>

<style>
	:global(.bg-gradient-mesh) {
		background-color: #fff6e6;
		background-image: radial-gradient(
			circle at center,
			#fff6e6 0%,
			#fff6e6 50%,
			#fff3df 85%,
			#ffefda 100%
		);
		background-attachment: fixed;
	}

	/* Media queries for mobile optimization */
	@media (max-width: 640px) {
		section {
			padding-top: 12vh !important;
			padding-bottom: 14vh !important;
			min-height: 100vh;
			display: flex;
			flex-direction: column;
			justify-content: flex-start;
		}

		footer {
			padding-top: 0.5rem;
			padding-bottom: 0.5rem;
		}

		footer .container {
			gap: 0.5rem;
		}

		footer .container > div.copyright {
			margin-left: 1rem;
		}

		footer .container > div:last-child {
			margin-right: 1rem;
		}
	}

	/* Desktop layout - start from top */
	@media (min-width: 1024px) {
		section {
			display: flex;
			flex-direction: column;
			justify-content: flex-start;
			padding-top: 15vh !important;
			padding-bottom: 10vh !important;
		}
	}
</style>
