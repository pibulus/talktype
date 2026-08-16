<script>
	import Seo from './Seo.svelte';
	import FooterCharm from '$lib/charms/FooterCharm.svelte';
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
		class="footer-component tt-app-footer fixed bottom-0 left-0 right-0 z-10 box-border border-t px-4 py-3 text-center text-xs sm:px-6 sm:py-4 md:px-8"
	>
		<!-- Full-width row (not .container, whose breakpoint max-width would bunch
		     both blocks toward the middle). The footer's own px-* provides the edge
		     inset, so the attribution sits hard left and the nav hard right. -->
		<div
			class="footer-row mx-auto flex w-full flex-row items-center justify-between gap-2 sm:gap-3"
		>
			<!-- Attribution left, nav right. The attribution shrinks before the nav
			     does (shrink + min-w-0 here, shrink-0 on the nav), so a tight window
			     trims this text instead of pushing the last nav button off-screen.
			     "in Melbourne" is the first thing dropped when space runs out. -->
			<div
				class="copyright flex min-w-0 shrink items-center whitespace-nowrap"
				title="© {footerYear} {appName} — Made with love in Melbourne"
			>
				<span class="footer-copy shrink-0 text-sm font-medium tracking-normal">
					© {footerYear}
					{appName}
				</span>
				<span class="footer-dot mx-2 shrink-0">•</span>
				<span class="flex min-w-0 items-center text-sm font-light">
					<!-- "Made with ❤️" alone is a sentence fragment; it asks for an
					     ending that isn't there. Mobile drops the lead-in and the "in"
					     instead, landing on "❤️ Melbourne" — short, complete, warm. -->
					<span class="footer-lead shrink-0">Made with</span>
					<FooterCharm charms={['❤️']} rare={['👻', '🌮']} />
					<a
						class="footer-place ml-0.5 truncate"
						href="https://github.com/pibulus"
						target="_blank"
						rel="noopener noreferrer"><span class="footer-in">in&nbsp;</span>Melbourne</a
					>
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
		color: var(--footer-text-color, #463f3a);
		border-color: var(--footer-border-color, var(--tt-footer-border-color));
		background: var(--footer-bg, var(--tt-footer-bg-image));
		box-shadow: var(--tt-footer-shadow);
		/* Fleet-standard frosted footer (2026-07-21) — same values across
		   ziplist / talktype / daysay / riffrap / dr_shrink. Declared in CSS
		   rather than a backdrop-blur-* utility so it can't be dropped by a
		   later class shuffle. 3px was too weak to frost anything; 14px +
		   saturation is what makes it read as glass instead of a thin veil. */
		-webkit-backdrop-filter: blur(14px) saturate(1.5);
		backdrop-filter: blur(14px) saturate(1.5);
	}

	/* No backdrop-filter support: go nearly opaque. The translucency only
	   earns its keep when a blur is actually frosting what's behind it. */
	@supports not (backdrop-filter: blur(1px)) {
		.tt-app-footer {
			background: rgba(255, 246, 230, 0.97);
		}
	}

	.footer-dot {
		color: var(--footer-dot-color, var(--tt-footer-dot-color));
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

	/* Under 640px the copyright used to be hidden outright, which left two nav
	   words floating in an empty band. Keep the row anchored instead: the ©
	   line and the charm stay, the place name goes. */
	@media (max-width: 639px) {
		/* A phone cannot hold the full attribution AND three nav words without
		   them colliding. Keep "Made with ❤️" — the love is the personality,
		   the city is trivia — and shed the rest; the nav is the load-bearing
		   half. */
		.copyright .footer-place,
		.copyright .footer-copy,
		.copyright .footer-dot {
			display: none;
		}

		.copyright {
			font-size: 0.78rem;
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
</style>
