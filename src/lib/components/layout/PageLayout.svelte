<script>
	import Seo from './Seo.svelte';
	import { DEFAULT_SEO } from '$lib/config/seo.js';

	export let title = DEFAULT_SEO.title;
	export let description = DEFAULT_SEO.description;
	export let path = '/';
	export let image = DEFAULT_SEO.image;
	export let imageAlt = DEFAULT_SEO.imageAlt;
	export let noindex = false;
	export let includeStructuredData = true;
	export let structuredData = null;
	export let footerYear = new Date().getFullYear();
	export let appName = 'TalkType';
</script>

<Seo
	{title}
	{description}
	{path}
	{image}
	{imageAlt}
	{noindex}
	{includeStructuredData}
	{structuredData}
/>

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
		class="footer-component tt-app-footer fixed bottom-0 left-0 right-0 z-10 box-border border-t pb-2 pt-3 text-center text-xs backdrop-blur-[3px] sm:pb-4 sm:pt-6"
	>
		<div
			class="container mx-auto flex flex-row items-center justify-center gap-1 sm:justify-between sm:gap-3"
		>
			<!-- Hide copyright on mobile, show on sm+ -->
			<div
				class="copyright ml-4 hidden flex-wrap items-center justify-center sm:ml-6 sm:flex md:ml-8"
			>
				<span class="mr-1 text-sm font-medium tracking-normal">
					© {footerYear}
					{appName}
				</span>
				<span class="footer-dot mx-2">•</span>
				<span class="text-sm font-light"
					>Made with
					<span
						class="footer-heart mx-0.5 inline-block transform animate-pulse transition-transform duration-300 hover:scale-110"
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
		background-color: var(--tt-page-bg-color, #fff6e6);
		background-image: var(
			--tt-page-bg-image,
			radial-gradient(circle at 50% 35%, #fff8ed 0%, #fff6e6 52%, #fff3df 82%, #ffefda 100%)
		);
		background-attachment: scroll;
		background-position: center top;
		background-repeat: no-repeat;
		background-size: 100% 100%;
	}

	.tt-app-footer {
		color: var(--footer-text-color, #4b5563);
		border-color: var(--footer-border-color, var(--tt-footer-border-color));
		background: var(--footer-bg, var(--tt-footer-bg-image));
		box-shadow: var(--tt-footer-shadow);
	}

	.footer-dot {
		color: var(--footer-dot-color, var(--tt-footer-dot-color));
	}

	.footer-heart {
		color: var(--footer-heart-color, var(--tt-footer-heart-color));
	}

	/* Media queries for mobile optimization */
	@media (max-width: 640px) {
		section {
			padding-top: max(env(safe-area-inset-top), clamp(4rem, 10svh, 5.5rem)) !important;
			padding-bottom: max(6rem, calc(env(safe-area-inset-bottom) + 5.5rem)) !important;
			min-height: 100dvh;
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

	@media (prefers-reduced-motion: reduce) {
		.footer-heart {
			animation: none;
		}
	}
</style>
