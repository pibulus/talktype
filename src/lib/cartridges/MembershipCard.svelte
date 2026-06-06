<script>
	import { onMount } from 'svelte';
	import { generateMemberIdentity } from './identityUtils.js';
	import { buildPassportSyncUrl, getVaultHandshakeQR } from '$lib/services/qrHandshakeService.js';
	import {
		readStoredSupporterCode,
		readStoredVaultServerUrl
	} from '$lib/services/vaultHashStorage.js';

	export let vaultHash = '';
	export let passportCode = '';

	let storedPassportCode = '';
	let storedVaultUrl = '';
	let cardEl;
	let mouseX = 50;
	let mouseY = 50;
	let isHovered = false;
	let qrHasLoaded = false;
	let qrHasFailed = false;
	let previousQrImageUrl = '';

	$: identity = generateMemberIdentity(vaultHash);
	$: hasVaultHash = !identity.isFallback;
	$: cardStyle = [
		`--passport-bg: #${identity.bg}`,
		`--passport-shape: #${identity.shape}`,
		`--mx: ${mouseX}%`,
		`--my: ${mouseY}%`,
		`--hovered: ${isHovered ? 1 : 0}`
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

	function handleMouseMove(e) {
		const rect = cardEl.getBoundingClientRect();
		mouseX = ((e.clientX - rect.left) / rect.width) * 100;
		mouseY = ((e.clientY - rect.top) / rect.height) * 100;
	}

	onMount(() => {
		storedPassportCode = readStoredSupporterCode();
		storedVaultUrl = readStoredVaultServerUrl();
	});
</script>

<div
	bind:this={cardEl}
	class="passport-card relative flex aspect-[1.586/1] w-full max-w-[342px] flex-col justify-between overflow-hidden rounded-[1.55rem] border border-[#fffdf0]/80 p-5 text-gray-900"
	class:is-placeholder={!hasVaultHash}
	style={cardStyle}
	role="group"
	aria-label={hasVaultHash
		? `TalkType supporter passport for ${identity.name}`
		: 'TalkType supporter passport placeholder'}
	on:mousemove={handleMouseMove}
	on:mouseenter={() => (isHovered = true)}
	on:mouseleave={() => (isHovered = false)}
>
	<div class="passport-glow pointer-events-none absolute inset-0"></div>
	<div class="holofoil pointer-events-none absolute inset-0"></div>
	<div class="passport-laminate pointer-events-none absolute inset-0"></div>
	<div class="passport-pattern pointer-events-none absolute right-0 top-0 h-full w-28"></div>
	<div class="passport-edge pointer-events-none absolute inset-0"></div>

	<div class="relative z-10 flex items-start justify-between gap-3">
		<div class="min-w-0">
			<h3 class="passport-kicker text-[11px] font-black uppercase text-gray-600">
				TalkType Passport
			</h3>
			<p class="passport-name mt-1 max-w-[190px] font-black">
				{identity.name}
			</p>
		</div>

		<div
			class="initials-chip grid h-14 w-14 shrink-0 place-items-center rounded-2xl font-black text-gray-800"
			aria-hidden="true"
		>
			{identity.initials}
		</div>
	</div>

	<div class="relative z-10 flex items-end justify-between gap-4">
		<div class="min-w-0">
			<p class="passport-label text-[10px] font-bold uppercase text-gray-600">Supporter ID</p>
			<p class="mt-1 font-mono text-sm font-black tracking-normal">{identity.memberId}</p>
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
	.passport-card {
		background:
			radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.58), transparent 34%),
			linear-gradient(135deg, rgba(255, 253, 240, 0.88), rgba(255, 253, 240, 0.18) 48%),
			linear-gradient(135deg, var(--passport-bg) 0%, #fff6df 74%, #f9d8b6 100%);
		box-shadow:
			0 24px 46px rgba(136, 82, 88, 0.22),
			0 8px 18px rgba(236, 72, 153, 0.1),
			0 3px 0 rgba(255, 253, 240, 0.9) inset,
			0 0 0 1px rgba(136, 82, 88, 0.08);
		transform-origin: center;
		isolation: isolate;
	}

	.passport-card.is-placeholder {
		border-style: dashed;
		box-shadow: 0 14px 32px rgba(79, 70, 68, 0.08);
	}

	.passport-glow {
		background:
			radial-gradient(circle at 18% 22%, rgba(255, 253, 240, 0.62), transparent 32%),
			linear-gradient(115deg, transparent 0%, rgba(255, 253, 240, 0.54) 46%, transparent 72%);
		mix-blend-mode: overlay;
		opacity: 0.46;
	}

	.holofoil {
		background:
			linear-gradient(
				112deg,
				transparent 0%,
				transparent 22%,
				rgba(111, 211, 255, 0.16) 34%,
				rgba(255, 129, 214, 0.18) 47%,
				rgba(255, 224, 130, 0.16) 60%,
				transparent 76%
			),
			radial-gradient(
				ellipse at 76% 28%,
				rgba(116, 215, 255, 0.24) 0%,
				rgba(255, 134, 210, 0.16) 35%,
				transparent 66%
			),
			linear-gradient(28deg, transparent 8%, rgba(255, 255, 255, 0.16) 34%, transparent 54%);
		mix-blend-mode: normal;
		opacity: calc(0.28 + (var(--hovered) * 0.24));
		transition: opacity 260ms ease;
		border-radius: inherit;
		clip-path: polygon(62% 0, 100% 0, 100% 100%, 55% 100%);
		filter: saturate(1.02);
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
			inset 0 0 0 1px rgba(255, 253, 240, 0.88),
			inset 0 -1px 0 rgba(136, 82, 88, 0.12),
			inset 0 1px 0 rgba(255, 255, 255, 0.86);
	}

	.passport-kicker,
	.passport-label {
		letter-spacing: 0;
	}

	.passport-phrase {
		font-size: 0.64rem;
		line-height: 1.3;
		color: rgba(55, 65, 81, 0.62);
		max-width: 160px;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.passport-pattern {
		background: repeating-linear-gradient(
			135deg,
			color-mix(in srgb, var(--passport-shape) 86%, #f5c86b 14%) 0 5px,
			rgba(255, 253, 240, 0.7) 5px 10px,
			rgba(255, 253, 240, 0.2) 10px 15px
		);
		clip-path: polygon(24% 0, 100% 0, 100% 100%, 0 100%);
		opacity: 0.86;
		filter: saturate(1.08);
	}

	.passport-card.is-placeholder .passport-pattern {
		opacity: 0.24;
	}

	.passport-name {
		font-size: 1.56rem;
		line-height: 1.08;
		overflow-wrap: break-word;
		color: #151827;
		text-shadow:
			0 1px 0 rgba(255, 253, 240, 0.72),
			0 8px 20px rgba(136, 82, 88, 0.08);
		text-wrap: balance;
	}

	.initials-chip {
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.68), rgba(255, 253, 240, 0.16)),
			color-mix(in srgb, var(--passport-shape) 26%, #fffdf0 74%);
		border: 1px solid rgba(255, 253, 240, 0.94);
		box-shadow:
			0 10px 24px rgba(136, 82, 88, 0.16),
			inset 0 1px 0 rgba(255, 253, 240, 0.72);
	}

	.ghost-seal {
		background: rgba(255, 253, 240, 0.62);
		border: 1px solid rgba(255, 253, 240, 0.78);
		box-shadow: 0 6px 14px rgba(79, 70, 68, 0.1);
	}

	.passport-qr-stamp {
		display: grid;
		width: 4.1rem;
		height: 4.1rem;
		flex-shrink: 0;
		place-items: center;
		overflow: hidden;
		position: relative;
		rotate: -2deg;
		border-radius: 1.02rem;
		border: 1px solid rgba(255, 253, 240, 0.94);
		background:
			linear-gradient(135deg, rgba(255, 253, 240, 0.94), rgba(255, 246, 223, 0.88)), #fffdf0;
		padding: 0.2rem;
		box-shadow:
			0 13px 26px rgba(136, 82, 88, 0.18),
			0 2px 0 rgba(255, 253, 240, 0.9) inset,
			inset 0 -1px 0 rgba(136, 82, 88, 0.08);
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
			linear-gradient(90deg, rgba(236, 72, 153, 0.12), transparent 42%),
			repeating-linear-gradient(
				135deg,
				rgba(236, 72, 153, 0.12) 0 3px,
				rgba(255, 253, 240, 0) 3px 7px
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
		transform: translateY(-2px) scale(1.025) rotate(1deg);
		box-shadow:
			0 16px 30px rgba(136, 82, 88, 0.2),
			inset 0 1px 0 rgba(255, 253, 240, 0.9);
		outline: none;
	}

	.passport-qr-stamp:focus-visible {
		box-shadow:
			0 0 0 3px rgba(236, 72, 153, 0.2),
			0 10px 22px rgba(136, 82, 88, 0.18);
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
			linear-gradient(135deg, #fffdf0, color-mix(in srgb, var(--passport-shape) 22%, #fffdf0));
		color: #374151;
	}

	.fallback-ghost {
		position: relative;
		display: block;
		width: 1.55rem;
		height: 1.75rem;
		border-radius: 999px 999px 0.72rem 0.72rem;
		background: rgba(236, 72, 153, 0.82);
		filter: drop-shadow(0 3px 0 rgba(255, 202, 212, 0.55));
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
	}

	.ghost-mark {
		width: 32px;
		height: 36px;
		fill: rgba(255, 253, 240, 0.95);
		filter: drop-shadow(0 3px 0 rgba(255, 202, 212, 0.45));
	}

	.ghost-mark circle {
		fill: #374151;
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

		.holofoil {
			animation: foilDrift 7s ease-in-out infinite alternate;
		}
	}

	.passport-card:not(.is-placeholder) {
		transition:
			transform 120ms ease,
			box-shadow 120ms ease;
		transform: perspective(600px) rotateX(calc((var(--my) - 50) * -0.06deg))
			rotateY(calc((var(--mx) - 50) * 0.06deg));
	}

	@keyframes passportReveal {
		from {
			opacity: 0;
			transform: translateY(10px) scale(0.94) rotate(-1deg);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1) rotate(0);
		}
	}

	@keyframes foilDrift {
		0% {
			filter: hue-rotate(0deg) saturate(1);
			transform: translateX(-2%) translateY(0);
		}
		50% {
			filter: hue-rotate(12deg) saturate(1.08);
		}
		100% {
			filter: hue-rotate(24deg) saturate(1.12);
			transform: translateX(2%) translateY(-1%);
		}
	}
</style>
