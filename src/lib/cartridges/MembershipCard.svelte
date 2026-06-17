<script>
	import { onMount } from 'svelte';
	import { generateMemberIdentity } from './identityUtils.js';
	import { hexToRgba, mixHex } from './passportPalettes.js';
	import { buildPassportAvatar } from './passportAvatar.js';
	import { selectSkin, selectNamedSkin } from './passportSkins.js';
	import { buildPassportSyncUrl, getVaultHandshakeQR } from '$lib/services/qrHandshakeService.js';
	import {
		readStoredSupporterCode,
		readStoredVaultServerUrl
	} from '$lib/services/vaultHashStorage.js';

	export let vaultHash = '';
	export let passportCode = '';
	// Optional: force a named skin (e.g. 'hacker') for preview/dev. When unset,
	// the skin is derived deterministically from the vault hash.
	export let skinName = '';

	let storedPassportCode = '';
	let storedVaultUrl = '';
	let cardEl;
	// Pointer-driven holofoil state (0-100 across the card face).
	let mouseX = 50;
	let mouseY = 50;
	let isHovered = false;
	let qrHasLoaded = false;
	let qrHasFailed = false;
	let previousQrImageUrl = '';

	// rAF throttle so we only touch the DOM once per frame while moving.
	let rafId = null;
	let pendingX = 50;
	let pendingY = 50;

	// Gyroscope (mobile tilt) state.
	let gyroSupported = false;
	let gyroEnabled = false;
	let removeGyroListener = null;
	// Honour prefers-reduced-motion: no parallax tilt, no gyroscope.
	let reducedMotion = false;

	const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

	// --hovered drives the foil/glare bloom ceiling + the idle-drift stop. It
	// changes outside pointer moves (enter/leave, gyro), so write it reactively.
	$: if (cardEl) cardEl.style.setProperty('--hovered', isHovered || gyroEnabled ? '1' : '0');

	$: identity = generateMemberIdentity(vaultHash);
	$: hasVaultHash = !identity.isFallback;

	// Skin = one coordinate in the modular axis space (holo/frame/texture/type/
	// avatar) + palette. Deterministic from the hash, or forced via skinName.
	$: skin = skinName
		? selectNamedSkin(skinName, vaultHash)
		: selectSkin(vaultHash);
	$: palette = skin.palette;
	$: avatarUri = buildPassportAvatar(vaultHash || 'talktype', skin.avatarStyle);

	// Dark-substrate frames (terminal) force light ink so text stays legible.
	$: isDarkSubstrate = skin.choices.frame === 'terminal';
	$: inkColor = isDarkSubstrate ? '#e8fff0' : palette.ink;
	$: inkSoftColor = isDarkSubstrate ? 'rgba(232, 255, 240, 0.66)' : palette.inkSoft;

	// STATIC style: palette + skin vars. These change only when the supporter /
	// skin changes, so they live on the inline style attribute. The per-frame
	// pointer vars are written directly to cardEl.style in commitPointer() to
	// avoid rebuilding this ~1kb string 60×/sec while the pointer moves.
	$: cardStyle = [
		`--p-bg-1: ${palette.bg[0]}`,
		`--p-bg-2: ${palette.bg[1]}`,
		`--p-bg-3: ${palette.bg[2] || palette.bg[1]}`,
		`--p-accent: ${palette.accent}`,
		`--p-ink: ${inkColor}`,
		`--p-ink-soft: ${inkSoftColor}`,
		`--p-glow: ${palette.glow}`,
		// Pre-mixed glow/accent alphas (rgba, no CSS color-mix dependency) so the
		// whole card renders correctly on older Safari/Chrome.
		`--p-glow-16: ${hexToRgba(palette.glow, 0.16)}`,
		`--p-glow-20: ${hexToRgba(palette.glow, 0.2)}`,
		`--p-glow-22: ${hexToRgba(palette.glow, 0.22)}`,
		`--p-glow-24: ${hexToRgba(palette.glow, 0.24)}`,
		`--p-glow-28: ${hexToRgba(palette.glow, 0.28)}`,
		`--p-glow-32: ${hexToRgba(palette.glow, 0.32)}`,
		`--p-glow-38: ${hexToRgba(palette.glow, 0.38)}`,
		`--p-accent-18: ${hexToRgba(palette.accent, 0.18)}`,
		`--p-accent-22: ${hexToRgba(palette.accent, 0.22)}`,
		`--p-accent-40: ${hexToRgba(palette.accent, 0.4)}`,
		// Accent blended toward white (for stripe pattern + ghost-mark tints).
		`--p-accent-w22: ${mixHex(palette.accent, 0.22)}`,
		`--p-accent-w42: ${mixHex(palette.accent, 0.42)}`,
		`--p-accent-w45: ${mixHex(palette.accent, 0.45)}`,
		`--p-accent-w86: ${mixHex(palette.accent, 0.86)}`,
		// Aliases kept for frame shadows defined in passportSkins.js.
		`--f-glow-38: ${hexToRgba(palette.glow, 0.38)}`,
		`--f-glow-20: ${hexToRgba(palette.glow, 0.2)}`,
		// Skin axis vars (holo / frame / texture / type) — the modular layer.
		skin.varString
	].join('; ');
	$: effectivePassportCode = passportCode || storedPassportCode;
	$: passportSyncUrl =
		hasVaultHash && effectivePassportCode
			? buildPassportSyncUrl({
					code: effectivePassportCode,
					vaultUrl: storedVaultUrl
				})
			: '';
	$: passportQrImageUrl = passportSyncUrl
		? getVaultHandshakeQR({ data: passportSyncUrl, style: 'sunset', size: 256 })
		: '';
	$: if (passportQrImageUrl !== previousQrImageUrl) {
		previousQrImageUrl = passportQrImageUrl;
		qrHasLoaded = false;
		qrHasFailed = false;
	}

	// Write the per-frame pointer CSS vars straight onto the element. Avoids
	// rebuilding the full inline-style string (and a setAttribute flush) 60×/sec.
	function writePointerVars(x, y) {
		if (!cardEl) return;
		const s = cardEl.style;
		s.setProperty('--mx', `${x}%`);
		s.setProperty('--my', `${y}%`);
		s.setProperty('--pointer-x', `${x}%`);
		s.setProperty('--pointer-y', `${y}%`);
		s.setProperty('--bg-x', `${50 + (x - 50) * 0.5}%`);
		s.setProperty('--bg-y', `${50 + (y - 50) * 0.5}%`);
		s.setProperty('--from-center', `${clamp(Math.hypot(y - 50, x - 50) / 50, 0, 1)}`);
	}

	// Push the latest pointer position once per animation frame.
	function commitPointer() {
		rafId = null;
		mouseX = pendingX;
		mouseY = pendingY;
		writePointerVars(mouseX, mouseY);
	}

	function schedulePointer(x, y) {
		pendingX = clamp(x);
		pendingY = clamp(y);
		if (rafId === null && typeof requestAnimationFrame === 'function') {
			rafId = requestAnimationFrame(commitPointer);
		}
	}

	function handlePointerMove(e) {
		if (!cardEl) return;
		const rect = cardEl.getBoundingClientRect();
		schedulePointer(
			((e.clientX - rect.left) / rect.width) * 100,
			((e.clientY - rect.top) / rect.height) * 100
		);
	}

	function settleToCenter() {
		isHovered = false;
		schedulePointer(50, 50);
	}

	// Map device tilt (gamma = left/right, beta = front/back) onto the same
	// 0-100 pointer space the mouse uses, clamped so it never pins to an edge.
	function handleOrientation(event) {
		const gamma = event.gamma ?? 0; // -90..90
		const beta = event.beta ?? 0; // -180..180
		schedulePointer(50 + clamp(gamma, -35, 35) * (50 / 35), 50 + clamp(beta - 45, -35, 35) * (50 / 35));
	}

	function attachGyro() {
		window.addEventListener('deviceorientation', handleOrientation, true);
		gyroEnabled = true;
		removeGyroListener = () =>
			window.removeEventListener('deviceorientation', handleOrientation, true);
	}

	// iOS 13+ needs an explicit permission request triggered by a user gesture.
	async function enableGyro() {
		const evt = typeof DeviceOrientationEvent !== 'undefined' ? DeviceOrientationEvent : null;
		if (!evt) return;
		try {
			if (typeof evt.requestPermission === 'function') {
				const state = await evt.requestPermission();
				if (state !== 'granted') return;
			}
			attachGyro();
		} catch (error) {
			console.warn('Passport tilt permission denied:', error);
		}
	}

	onMount(() => {
		storedPassportCode = readStoredSupporterCode();
		storedVaultUrl = readStoredVaultServerUrl();

		// Seed the per-frame pointer vars at centre so the foil starts calm.
		writePointerVars(50, 50);

		// Respect reduced-motion: skip the parallax tilt and never offer gyro.
		reducedMotion =
			typeof window !== 'undefined' &&
			window.matchMedia &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reducedMotion) return cleanup;

		// Coarse pointer (touch) + a motion sensor present → offer tilt.
		const hasMotion = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
		const isTouch =
			typeof window !== 'undefined' &&
			window.matchMedia &&
			window.matchMedia('(pointer: coarse)').matches;
		gyroSupported = hasMotion && isTouch;

		// Android exposes orientation without a permission gate — wire it up now.
		const needsPermission =
			gyroSupported && typeof DeviceOrientationEvent.requestPermission === 'function';
		if (gyroSupported && !needsPermission) attachGyro();

		return cleanup;
	});

	function cleanup() {
		if (rafId !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId);
		if (removeGyroListener) removeGyroListener();
	}
</script>

<div
	bind:this={cardEl}
	class="passport-card relative flex aspect-[1.586/1] w-full max-w-[342px] flex-col justify-between overflow-hidden p-5"
	class:is-placeholder={!hasVaultHash}
	class:reduced-motion={reducedMotion}
	style={cardStyle}
	role="group"
	aria-label={hasVaultHash
		? `TalkType supporter passport for ${identity.name}`
		: 'TalkType supporter passport placeholder'}
	on:pointermove={handlePointerMove}
	on:pointerenter={() => (isHovered = true)}
	on:pointerleave={settleToCenter}
>
	<div class="passport-substrate pointer-events-none absolute inset-0"></div>
	<div class="passport-glow pointer-events-none absolute inset-0"></div>
	<div class="holofoil pointer-events-none absolute inset-0"></div>
	<div class="passport-glare pointer-events-none absolute inset-0"></div>
	<div class="passport-texture pointer-events-none absolute inset-0"></div>
	<div class="passport-laminate pointer-events-none absolute inset-0"></div>
	<div class="passport-pattern pointer-events-none absolute right-0 top-0 h-full w-28"></div>
	<div class="passport-edge pointer-events-none absolute inset-0"></div>

	{#if gyroSupported && !gyroEnabled}
		<button
			type="button"
			class="tilt-toggle absolute bottom-2 left-1/2 z-20 -translate-x-1/2"
			on:click|stopPropagation={enableGyro}
		>
			✦ tap for tilt
		</button>
	{/if}

	<div class="relative z-10 flex items-start justify-between gap-3">
		<div class="min-w-0">
			<h3 class="passport-kicker text-[11px] font-black uppercase">
				TalkType Passport
			</h3>
			<p class="passport-name mt-1 max-w-[190px] font-black">
				{identity.name}
			</p>
		</div>

		<!-- Avatar chip: DiceBear SVG with initials fallback -->
		<div
			class="avatar-chip grid h-14 w-14 shrink-0 place-items-center rounded-2xl font-black overflow-hidden"
			aria-hidden="true"
		>
			{#if avatarUri}
				<img
					src={avatarUri}
					alt=""
					class="avatar-img h-full w-full object-cover"
					draggable="false"
				/>
			{:else}
				<span class="avatar-initials">{identity.initials}</span>
			{/if}
		</div>
	</div>

	<div class="relative z-10 flex items-end justify-between gap-4">
		<div class="min-w-0">
			<p class="passport-label text-[10px] font-bold uppercase">Supporter ID</p>
			<p class="mt-1 font-mono text-sm font-black tracking-normal passport-member-id">{identity.memberId}</p>
			{#if hasVaultHash && identity.phrase}
				<p class="passport-phrase mt-1 italic">{identity.phrase}</p>
			{/if}
		</div>

		{#if passportQrImageUrl}
			<a
				class="passport-qr-stamp"
				class:is-loading={!qrHasLoaded && !qrHasFailed}
				class:is-fallback={qrHasFailed}
				href={passportSyncUrl}
				aria-label={`Open TalkType on another device with ${identity.memberId}`}
			>
				{#if !qrHasFailed}
					<img
						src={passportQrImageUrl}
						alt=""
						loading="lazy"
						decoding="async"
						referrerpolicy="no-referrer"
						on:load={() => (qrHasLoaded = true)}
						on:error={() => {
							qrHasFailed = true;
							qrHasLoaded = false;
						}}
					/>
				{/if}
				{#if qrHasFailed}
					<span class="passport-link-fallback" aria-hidden="true">
						<span class="fallback-ghost"></span>
						<span class="fallback-word">PASS</span>
					</span>
				{/if}
				<!-- Tap affordance: only shows on touch devices (no hover to hint it). -->
				<span class="qr-tap-hint" aria-hidden="true">tap to sync</span>
			</a>
		{:else}
			<div
				class="ghost-seal grid h-12 w-12 shrink-0 place-items-center rounded-full"
				aria-hidden="true"
			>
				<svg class="ghost-mark" viewBox="0 0 32 36" focusable="false" aria-hidden="true">
					<path
						d="M16 3c-7.1 0-12 5.4-12 13.1V32l3.5-2.2L11 32l3.5-2.2L18 32l3.5-2.2L25 32l3-1.9v-14C28 8.4 23.1 3 16 3Z"
					/>
					<circle cx="11.5" cy="16" r="2.4" />
					<circle cx="20.5" cy="16" r="2.4" />
				</svg>
			</div>
		{/if}
	</div>
</div>

<style>
	/* =====================================================================
	   CARD BASE — Saturated multi-stop diagonal gradient using palette vars.
	   A soft top-left white bloom keeps a premium lit-from-within feel.
	   ===================================================================== */
	.passport-card {
		/* Pointer-var defaults so first paint (pre-mount/SSR) is valid + centred. */
		--mx: 50%;
		--my: 50%;
		--pointer-x: 50%;
		--pointer-y: 50%;
		--bg-x: 50%;
		--bg-y: 50%;
		--from-center: 0;
		--hovered: 0;
		/* FRAME axis drives border/radius/shadow; defaults match the soft skin. */
		border-radius: var(--f-radius, 1.55rem);
		background:
			radial-gradient(circle at 12% 14%, rgba(255, 255, 255, 0.32), transparent 38%),
			linear-gradient(
				135deg,
				var(--p-bg-1) 0%,
				var(--p-bg-2) 48%,
				var(--p-bg-3) 100%
			);
		border: var(--f-border, 2px solid rgba(255, 255, 255, 0.38));
		box-shadow: var(
			--f-shadow,
			0 24px 48px var(--f-glow-38), 0 8px 18px var(--f-glow-20)
		);
		/* FRAME drop-shadow (e.g. chunky's hard offset) — composites with the 3D
		   tilt transform so the toy shadow moves with the card, not flat behind it. */
		filter: var(--f-filter, none);
		/* TYPE axis sets the card font. */
		font-family: var(--t-font, inherit);
		color: var(--p-ink);
		transform-origin: center;
		isolation: isolate;
	}

	.passport-card.is-placeholder {
		border-style: dashed;
		box-shadow: 0 14px 32px rgba(79, 70, 68, 0.08);
	}

	/* SUBSTRATE — FRAME-axis tint over the palette gradient. Transparent for
	   light frames; a dark wash for terminal so "hacker" reads dark on any
	   palette while the holo still picks up the palette's accent colours. */
	.passport-substrate {
		background: var(--f-substrate, transparent);
		border-radius: inherit;
	}

	/* =====================================================================
	   GLOW — tinted bloom using palette glow colour instead of fixed cream.
	   ===================================================================== */
	.passport-glow {
		background:
			radial-gradient(circle at 18% 22%, rgba(255, 255, 255, 0.44), transparent 32%),
			linear-gradient(
				115deg,
				transparent 0%,
				var(--p-glow-22) 46%,
				transparent 72%
			);
		mix-blend-mode: overlay;
		opacity: 0.52;
	}

	/*
	  HOLOFOIL — pointer-tracked iridescent sheen, fully driven by the HOLO axis.
	  Technique adapted from simeydotme/pokemon-cards-css (MIT).
	  Spectral stops (--holo-c1..6), sweep angle/size, blend mode, filter and
	  opacity envelope all come from the active skin. A radial "reveal" mask
	  centred on the pointer makes the foil BRIGHTEST where you point — so the
	  light intensifies the holo instead of painting a white dot over it.
	*/
	.holofoil {
		background:
			/* Drifting spectral rainbow — parallaxes against pointer via --bg-x/--bg-y. */
			repeating-linear-gradient(
				var(--holo-angle, 110deg),
				var(--holo-c1) 0%,
				var(--holo-c2) 14%,
				var(--holo-c3) 28%,
				var(--holo-c4) 42%,
				var(--holo-c5) 56%,
				var(--holo-c6) 70%,
				var(--holo-c1) 84%
			);
		background-size: var(--holo-size, 400% 400%);
		background-position: var(--bg-x) var(--bg-y);
		mix-blend-mode: var(--holo-blend, color-dodge);
		filter: var(--holo-filter, brightness(0.9) contrast(1.4) saturate(1.6));
		/* Reveal mask: foil is fully present near the pointer and fades toward
		   the far edges, so movement sweeps a lit band across the card. */
		-webkit-mask-image: radial-gradient(
			farthest-corner circle at var(--pointer-x) var(--pointer-y),
			rgba(0, 0, 0, 1) 0%,
			rgba(0, 0, 0, 0.85) 30%,
			rgba(0, 0, 0, 0.5) 65%,
			rgba(0, 0, 0, 0.28) 100%
		);
		mask-image: radial-gradient(
			farthest-corner circle at var(--pointer-x) var(--pointer-y),
			rgba(0, 0, 0, 1) 0%,
			rgba(0, 0, 0, 0.85) 30%,
			rgba(0, 0, 0, 0.5) 65%,
			rgba(0, 0, 0, 0.28) 100%
		);
		/* Calm at rest, blooms with pointer distance + hover. Floor/gain per skin.
		   The pointer mask already concentrates the foil, so the envelope can sit
		   high without the old "white dot" problem. */
		opacity: calc(
			var(--holo-rest, 0.26) + (var(--from-center) * var(--holo-bloom, 0.5)) +
				(var(--hovered) * 0.34)
		);
		transition: opacity 280ms ease;
		border-radius: inherit;
	}

	/*
	  GLARE — a SOFT, wide sheen, not a hard hotspot. It widens the lit area and
	  adds gentle dimensional gloss that follows the pointer, but uses a low
	  white ceiling + soft-light blend so it lifts the foil's colour rather than
	  bleaching a point of light over it.
	*/
	.passport-glare {
		background: radial-gradient(
			farthest-corner ellipse at var(--pointer-x) var(--pointer-y),
			rgba(255, 255, 255, 0.34) 0%,
			rgba(255, 255, 255, 0.12) 32%,
			transparent 68%
		);
		mix-blend-mode: soft-light;
		opacity: calc(0.18 + (var(--from-center) * 0.3) + (var(--hovered) * 0.28));
		transition: opacity 220ms ease;
		border-radius: inherit;
	}

	/* TEXTURE axis — surface grain/scanlines/halftone/sparkle overlay. */
	.passport-texture {
		background-image: var(--tx-image, none);
		background-size: var(--tx-size, auto);
		mix-blend-mode: var(--tx-blend, normal);
		opacity: var(--tx-opacity, 0);
		border-radius: inherit;
	}

	/* Mobile-only affordance to opt into gyroscope tilt (iOS permission gate).
	   Sized to a >=44px tap target — it unlocks the whole gyro experience. */
	.tilt-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		padding: 0 1rem;
		border-radius: 999px;
		border: 2px solid rgba(255, 255, 255, 0.72);
		background: rgba(255, 255, 255, 0.22);
		color: var(--p-ink);
		font-size: 0.7rem;
		font-weight: 900;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		backdrop-filter: blur(6px);
		box-shadow: 0 6px 14px var(--p-glow-28);
		cursor: pointer;
		transition:
			transform 140ms ease,
			background 140ms ease;
	}

	.tilt-toggle:active {
		transform: translate(-50%, 0) scale(0.96);
		background: rgba(255, 255, 255, 0.38);
	}

	.passport-laminate {
		background:
			linear-gradient(118deg, transparent 5%, rgba(255, 255, 255, 0.34) 21%, transparent 38%),
			linear-gradient(28deg, transparent 20%, rgba(255, 255, 255, 0.18) 48%, transparent 70%),
			repeating-linear-gradient(
				118deg,
				rgba(255, 255, 255, 0) 0 18px,
				rgba(255, 255, 255, 0.18) 19px 20px,
				rgba(255, 255, 255, 0) 21px 38px
			);
		opacity: 0.54;
		mix-blend-mode: soft-light;
	}

	.passport-edge {
		border-radius: inherit;
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.62),
			inset 0 -1px 0 rgba(0, 0, 0, 0.1),
			inset 0 1px 0 rgba(255, 255, 255, 0.86);
	}

	/* =====================================================================
	   TEXT — palette ink vars replace hardcoded grays.
	   ===================================================================== */
	.passport-kicker,
	.passport-label {
		letter-spacing: 0;
		color: var(--p-ink-soft);
	}

	.passport-phrase {
		font-size: 0.64rem;
		line-height: 1.3;
		color: var(--p-ink-soft);
		max-width: 160px;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.passport-name {
		/* TYPE axis drives size/weight/casing/tracking. */
		font-size: var(--t-name-size, 1.56rem);
		font-weight: var(--t-name-weight, 900);
		text-transform: var(--t-transform, none);
		letter-spacing: var(--t-tracking, 0);
		line-height: 1.08;
		overflow-wrap: break-word;
		color: var(--p-ink);
		text-shadow:
			0 1px 0 rgba(255, 255, 255, 0.28),
			0 8px 20px var(--p-glow-16);
		text-wrap: balance;
	}

	.passport-member-id {
		color: var(--p-ink);
	}

	/* =====================================================================
	   PATTERN — diagonal stripe band using palette accent colour.
	   ===================================================================== */
	.passport-pattern {
		background: repeating-linear-gradient(
			135deg,
			var(--p-accent-w86) 0 5px,
			rgba(255, 255, 255, 0.18) 5px 10px,
			rgba(255, 255, 255, 0.06) 10px 15px
		);
		clip-path: polygon(24% 0, 100% 0, 100% 100%, 0 100%);
		opacity: 0.72;
		filter: saturate(1.12);
	}

	.passport-card.is-placeholder .passport-pattern {
		opacity: 0.24;
	}

	/* =====================================================================
	   AVATAR CHIP — DiceBear avatar replaces plain initials text.
	   Chunky border, hard-ish shadow, pastel-punk energy.
	   ===================================================================== */
	.avatar-chip {
		background: rgba(255, 255, 255, 0.22);
		border: 2.5px solid rgba(255, 255, 255, 0.72);
		box-shadow:
			0 8px 20px var(--p-glow-32),
			0 2px 0 rgba(255, 255, 255, 0.52) inset;
	}

	.avatar-img {
		border-radius: inherit;
	}

	.avatar-initials {
		font-size: 1.1rem;
		font-weight: 900;
		color: var(--p-ink);
		text-shadow: 0 1px 0 rgba(255, 255, 255, 0.3);
	}

	/* =====================================================================
	   GHOST SEAL — uses palette accent + glow instead of fixed cream.
	   ===================================================================== */
	.ghost-seal {
		background: rgba(255, 255, 255, 0.22);
		border: 2px solid rgba(255, 255, 255, 0.52);
		box-shadow: 0 6px 14px var(--p-glow-24);
	}

	/* =====================================================================
	   QR STAMP — palette-tinted background, preserved interaction physics.
	   ===================================================================== */
	.passport-qr-stamp {
		display: grid;
		width: 4.1rem;
		height: 4.1rem;
		flex-shrink: 0;
		place-items: center;
		overflow: hidden;
		position: relative;
		/* Small safe margin so the -2deg rotation + hover lift never clip against
		   the card's overflow-hidden rounded edge in the bottom-right corner. */
		margin: 0.15rem 0.15rem 0 0;
		rotate: -2deg;
		border-radius: 1.02rem;
		border: 2px solid rgba(255, 255, 255, 0.72);
		background:
			linear-gradient(
				135deg,
				rgba(255, 255, 255, 0.88),
				rgba(255, 255, 255, 0.72)
			);
		padding: 0.2rem;
		box-shadow:
			0 13px 26px var(--p-glow-28),
			0 2px 0 rgba(255, 255, 255, 0.72) inset,
			inset 0 -1px 0 rgba(0, 0, 0, 0.06);
		transition:
			transform 150ms ease,
			box-shadow 150ms ease;
	}

	.passport-qr-stamp::before {
		content: '';
		position: absolute;
		inset: 0.28rem;
		border-radius: 0.74rem;
		background:
			linear-gradient(90deg, var(--p-accent-18), transparent 42%),
			repeating-linear-gradient(
				135deg,
				var(--p-accent-18) 0 3px,
				rgba(255, 255, 255, 0) 3px 7px
			);
		opacity: 0;
		transition: opacity 160ms ease;
		pointer-events: none;
	}

	.passport-qr-stamp.is-loading::before,
	.passport-qr-stamp.is-fallback::before {
		opacity: 1;
	}

	.passport-qr-stamp:hover,
	.passport-qr-stamp:focus-visible {
		transform: translateY(-1px) scale(1.02) rotate(1deg);
		box-shadow:
			0 16px 30px var(--p-glow-32),
			inset 0 1px 0 rgba(255, 255, 255, 0.9);
		outline: none;
	}

	.passport-qr-stamp:focus-visible {
		box-shadow:
			0 0 0 3px var(--p-accent-40),
			0 10px 22px var(--p-glow-24);
	}

	.passport-qr-stamp img {
		position: relative;
		z-index: 1;
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 0.78rem;
		object-fit: cover;
	}

	/* "tap to sync" hint — hidden by default; shown only on touch devices, where
	   there is no hover to suggest the QR stamp is interactive. */
	.qr-tap-hint {
		position: absolute;
		inset-inline: 0;
		bottom: 0;
		z-index: 2;
		display: none;
		padding: 0.12rem 0;
		background: rgba(0, 0, 0, 0.46);
		color: #fff;
		font-size: 0.46rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		text-align: center;
		pointer-events: none;
	}

	@media (hover: none) and (pointer: coarse) {
		.qr-tap-hint {
			display: block;
		}
	}

	.passport-link-fallback {
		position: relative;
		z-index: 1;
		display: grid;
		height: 100%;
		width: 100%;
		place-items: center;
		border-radius: 0.78rem;
		background:
			radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.86), transparent 45%),
			linear-gradient(135deg, rgba(255, 255, 255, 0.9), var(--p-accent-w22));
		color: var(--p-ink);
	}

	.fallback-ghost {
		position: relative;
		display: block;
		width: 1.55rem;
		height: 1.75rem;
		border-radius: 999px 999px 0.72rem 0.72rem;
		background: var(--p-accent);
		filter: drop-shadow(0 3px 0 var(--p-accent-w45));
	}

	.fallback-ghost::before,
	.fallback-ghost::after {
		content: '';
		position: absolute;
		top: 0.66rem;
		width: 0.24rem;
		height: 0.32rem;
		border-radius: 999px;
		background: #2f3442;
	}

	.fallback-ghost::before {
		left: 0.42rem;
	}

	.fallback-ghost::after {
		right: 0.42rem;
	}

	.fallback-word {
		margin-top: -0.18rem;
		font-size: 0.54rem;
		font-weight: 900;
		letter-spacing: 0;
		color: var(--p-ink);
	}

	.ghost-mark {
		width: 32px;
		height: 36px;
		fill: rgba(255, 255, 255, 0.92);
		filter: drop-shadow(0 3px 0 var(--p-accent-w42));
	}

	.ghost-mark circle {
		fill: var(--p-ink);
	}

	@media (max-width: 360px) {
		.passport-card {
			padding: 1rem;
		}

		.passport-name {
			font-size: 1.3rem;
			line-height: 1.12;
		}

		.passport-qr-stamp {
			width: 3.55rem;
			height: 3.55rem;
			border-radius: 0.8rem;
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		.passport-card {
			animation: passportReveal 420ms cubic-bezier(0.2, 0.9, 0.2, 1.12) both;
		}

		/* Idle drift only while at rest — once the pointer takes over it sets
		   background-position directly, so the animation would fight it. */
		.passport-card:not([style*='--hovered: 1']) .holofoil {
			animation: foilDrift 7s ease-in-out infinite alternate;
		}
	}

	.passport-card:not(.is-placeholder) {
		/* GPU hint: this element re-composites every pointer frame. */
		will-change: transform;
		transition:
			transform 160ms ease,
			box-shadow 120ms ease;
		transform: perspective(620px) rotateX(calc((var(--my) - 50) * -0.12deg))
			rotateY(calc((var(--mx) - 50) * 0.12deg));
	}

	/* Reduced-motion: keep depth but drop the pointer-following parallax tilt. */
	.passport-card.reduced-motion:not(.is-placeholder) {
		will-change: auto;
		transform: perspective(620px);
	}

	/* Keep perspective() in both keyframes so handing off to the resting tilt
	   transform (also perspective-based) doesn't pop. */
	@keyframes passportReveal {
		from {
			opacity: 0;
			transform: perspective(620px) translateY(10px) scale(0.94) rotate(-1deg);
		}
		to {
			opacity: 1;
			transform: perspective(620px) translateY(0) scale(1) rotate(0);
		}
	}

	/* Idle shimmer: gently drift the spectral rainbow on a slight diagonal so the
	   card breathes at rest. Position-only — the per-skin filter is untouched. */
	@keyframes foilDrift {
		0% {
			background-position: 0% 35%;
		}
		100% {
			background-position: 100% 65%;
		}
	}
</style>
