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
		class="footer-component tt-app-footer fixed bottom-0 left-0 right-0 z-10 box-border border-t px-4 py-3 text-center text-xs backdrop-blur-[3px] sm:px-6 sm:py-4 md:px-8"
	>
		<!-- Full-width row (not .container, whose breakpoint max-width would bunch
		     both blocks toward the middle). The footer's own px-* provides the edge
		     inset, so the attribution sits hard left and the nav hard right. -->
		<div
			class="footer-row mx-auto flex w-full flex-row items-center justify-center gap-3 sm:justify-between"
		>
			<!-- Attribution left, nav right. The attribution shrinks before the nav
			     does (shrink + min-w-0 here, shrink-0 on the nav), so a tight window
			     trims this text instead of pushing the last nav button off-screen.
			     "in Melbourne" is the first thing dropped when space runs out. -->
			<div
				class="copyright hidden min-w-0 shrink items-center whitespace-nowrap sm:flex"
				title="© {footerYear} {appName} — Made with love in Melbourne"
			>
				<span class="shrink-0 text-sm font-medium tracking-normal">
					© {footerYear}
					{appName}
				</span>
				<span class="footer-dot mx-2 shrink-0">•</span>
				<span class="flex min-w-0 items-center text-sm font-light">
					<span class="shrink-0">Made with</span>
					<span
						class="footer-heart mx-0.5 inline-block shrink-0 transform animate-pulse transition-transform duration-300 hover:scale-110"
						aria-label="love">❤️</span
					>
					<span class="footer-place ml-0.5 truncate">in Melbourne</span>
				</span>
			</div>
			<div class="flex shrink-0 items-center">
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

	/* Between sm and lg the attribution and the five nav buttons are both on the
	   row but there isn't room for every word. Shed the least-load-bearing parts
	   first — the place name, then the dot separator — so the copyright and the
	   heart survive and the nav never gets pushed off the right edge. */
	@media (min-width: 640px) and (max-width: 899px) {
		.copyright .footer-place {
			display: none;
		}
	}

	@media (min-width: 640px) and (max-width: 767px) {
		.copyright .footer-dot {
			margin-left: 0.375rem;
			margin-right: 0.375rem;
		}
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

		/* Edge inset comes from the footer's own padding — no extra margins, or
		   the row stops reaching the edges it is supposed to align to. */
		footer .footer-row {
			gap: 0.5rem;
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
