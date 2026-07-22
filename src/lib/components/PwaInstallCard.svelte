<script context="module">
	// ═══════════════════════════════════════════════════════════════════
	// 🏠 PwaInstallCard — SoftStack chassis kernel (vendored per app)
	// ═══════════════════════════════════════════════════════════════════
	// A polite install suggestion. NOT a modal — no backdrop, no focus trap,
	// nothing blocked. It borrows the modal DNA's materials and physics
	// (280ms pop-in with the 1.06 overshoot, 180ms pop-out via the same
	// closing-flag choreography) but stays an ambient corner card.
	//
	// FAMILY PROMPT MANNERS (the contract):
	//   · earn it first — arms only after TWO successful uses of the app
	//     (the page calls notePwaMoment() at its "done" moment)
	//   · at most 3 asks, ever · ≥4 days between asks · always dismissable
	//   · never on first paint, never over the footer
	//
	// WIRING (2 lines per app):
	//   +layout.svelte:  <PwaInstallCard appName="drshrink"
	//                      tagline="Drop a file, get a smaller one."
	//                      iconSrc="/icon-192.png" storagePrefix="drshrink" />
	//   at the success moment:  import { notePwaMoment } from '.../PwaInstallCard.svelte';
	//                           notePwaMoment();
	import { writable } from 'svelte/store';

	// Module-level so any component can ping it without prop-drilling.
	const momentTick = writable(0);

	/** Call at the app's "job done" moment (download fired, file saved…). */
	export function notePwaMoment() {
		momentTick.update((n) => n + 1);
	}
</script>

<script>
	import { onMount, onDestroy } from 'svelte';

	export let appName = 'this app';
	export let tagline = '';
	export let iconSrc = '/icon-192.png';
	/** localStorage key prefix, e.g. "drshrink" */
	export let storagePrefix = 'app';

	const K = {
		MOMENTS: `${storagePrefix}-pwa-moments`,
		ASKS: `${storagePrefix}-pwa-asks`,
		LAST_ASK: `${storagePrefix}-pwa-last-ask`,
		INSTALLED: `${storagePrefix}-pwa-installed`
	};

	const MOMENTS_TO_EARN = 2; // two successful uses before we ever ask
	const MAX_ASKS = 3; // then never again
	const COOLDOWN_DAYS = 4;
	const SETTLE_MS = 2500; // let the "done" moment land before appearing

	let visible = false;
	let closing = false;
	let installEvent = null;
	let isIOS = false;
	let showTimer = null;
	let closeTimer = null;
	let unsubMoment = null;

	const num = (k) => {
		try {
			return parseInt(localStorage.getItem(k) || '0', 10);
		} catch {
			return 0;
		}
	};
	const set = (k, v) => {
		try {
			localStorage.setItem(k, String(v));
		} catch {
			/* ignore */
		}
	};

	function isStandalone() {
		return (
			window.matchMedia?.('(display-mode: standalone)').matches === true ||
			navigator.standalone === true ||
			document.referrer?.startsWith('android-app://')
		);
	}

	function canAsk() {
		try {
			if (localStorage.getItem(K.INSTALLED) === 'true') return false;
			if (isStandalone()) return false;
			if (num(K.MOMENTS) < MOMENTS_TO_EARN) return false;
			if (num(K.ASKS) >= MAX_ASKS) return false;
			const last = localStorage.getItem(K.LAST_ASK);
			const days = last ? (Date.now() - new Date(last).getTime()) / 86400000 : 999;
			if (days < COOLDOWN_DAYS) return false;
			// Only appear when we have a real path to offer: the native prompt,
			// or iOS (where Share → Add to Home Screen instructions ARE the path).
			return !!installEvent || isIOS;
		} catch {
			return false;
		}
	}

	function maybeShow() {
		if (visible || closing || !canAsk()) return;
		clearTimeout(showTimer);
		// Let the success moment (confetti, download chime) finish first.
		showTimer = setTimeout(() => {
			if (!canAsk()) return;
			visible = true;
			set(K.ASKS, num(K.ASKS) + 1);
			set(K.LAST_ASK, new Date().toISOString());
		}, SETTLE_MS);
	}

	function dismiss() {
		if (closing || !visible) return;
		closing = true;
		// Matches the 180ms pop-out in this file's <style> (modal DNA timing).
		closeTimer = setTimeout(() => {
			visible = false;
			closing = false;
		}, 180);
	}

	async function handleInstall() {
		if (!installEvent) return;
		try {
			await installEvent.prompt();
			const choice = installEvent.userChoice ? await installEvent.userChoice : null;
			if (choice?.outcome === 'accepted') set(K.INSTALLED, 'true');
		} catch {
			/* the card's iOS-style fallback isn't useful here; just close */
		}
		installEvent = null;
		dismiss();
	}

	function onBeforeInstall(e) {
		e.preventDefault();
		installEvent = e;
		maybeShow();
	}

	onMount(() => {
		const ua = navigator.userAgent.toLowerCase();
		isIOS =
			/iphone|ipad|ipod/.test(ua) ||
			(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

		window.addEventListener('beforeinstallprompt', onBeforeInstall);

		// Each notePwaMoment() bumps the counter; crossing the threshold arms us.
		unsubMoment = momentTick.subscribe((n) => {
			if (n === 0) return; // initial subscription, not a real moment
			set(K.MOMENTS, num(K.MOMENTS) + 1);
			maybeShow();
		});
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('beforeinstallprompt', onBeforeInstall);
		}
		clearTimeout(showTimer);
		clearTimeout(closeTimer);
		unsubMoment?.();
	});
</script>

{#if visible}
	<aside class="pwa-card" class:closing aria-label="Add {appName} to your home screen">
		<button type="button" class="pwa-dismiss" on:click={dismiss} aria-label="Dismiss"> × </button>

		<div class="pwa-head">
			<img class="pwa-icon" src={iconSrc} alt="" width="44" height="44" />
			<div class="pwa-titles">
				<p class="pwa-title">Keep {appName} handy</p>
				{#if tagline}<p class="pwa-tagline">{tagline}</p>{/if}
			</div>
		</div>

		{#if isIOS}
			<ol class="pwa-steps">
				<li><span class="pwa-step-n">1</span> Tap the Share button</li>
				<li>
					<span class="pwa-step-n">2</span> Choose <b>Add to Home Screen</b>
				</li>
			</ol>
			<button type="button" class="pwa-cta ghost" on:click={dismiss}> Got it </button>
		{:else}
			<p class="pwa-line">Opens instantly from your home screen, works offline.</p>
			<button type="button" class="pwa-cta" on:click={handleInstall}> Add to home screen </button>
		{/if}
	</aside>
{/if}

<style>
	/* The card — family surface, floats clear of the fixed footer. */
	.pwa-card {
		position: fixed;
		right: 1rem;
		bottom: 5.5rem;
		z-index: 900; /* under modals (9999), over page content */
		width: min(20rem, calc(100vw - 2rem));
		padding: 1rem 1rem 0.9rem;
		border: 1px solid rgba(var(--ds-primary-color-rgb, 236, 72, 153), 0.28);
		border-radius: 18px;
		background: var(--ds-bg, #fffaef);
		color: var(--ds-ink, #2a2233);
		box-shadow:
			0 16px 44px rgba(0, 0, 0, 0.16),
			0 4px 12px rgba(var(--ds-primary-color-rgb, 236, 72, 153), 0.12);
		/* Modal DNA physics: rise with one small overshoot, no rotation. */
		animation: pwa-pop-in 280ms cubic-bezier(0.16, 0.84, 0.24, 1.06) both;
	}
	.pwa-card.closing {
		animation: pwa-pop-out 180ms cubic-bezier(0.4, 0, 0.24, 1) forwards;
		pointer-events: none;
	}

	.pwa-dismiss {
		position: absolute;
		top: 0.3rem;
		right: 0.3rem;
		width: 26px;
		height: 26px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.05);
		font-size: 0.85rem;
		line-height: 1;
		color: var(--ds-ink, #2a2233);
		opacity: 0.5;
		cursor: pointer;
		transition:
			background 0.15s ease,
			opacity 0.15s ease,
			transform 0.22s linear(0, 0.5 15%, 1.15 40%, 0.97 65%, 1);
	}
	.pwa-dismiss:hover {
		opacity: 1;
		background: rgba(0, 0, 0, 0.12);
		transform: scale(1.12);
	}
	.pwa-dismiss:active {
		transform: scale(0.85);
	}
	@media (pointer: coarse) {
		.pwa-dismiss {
			width: 34px;
			height: 34px;
		}
	}

	.pwa-head {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		margin-bottom: 0.55rem;
		padding-right: 2rem;
	}
	.pwa-icon {
		width: 44px;
		height: 44px;
		border-radius: 11px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
	}
	.pwa-title {
		font-size: 0.95rem;
		font-weight: 800;
		letter-spacing: -0.01em;
	}
	.pwa-tagline {
		font-size: 0.75rem;
		opacity: 0.65;
		margin-top: 0.1rem;
	}

	.pwa-line {
		font-size: 0.8rem;
		line-height: 1.45;
		opacity: 0.8;
		margin-bottom: 0.7rem;
	}

	.pwa-steps {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin: 0 0 0.7rem;
		padding: 0.6rem 0.7rem;
		list-style: none;
		font-size: 0.8rem;
		border-radius: 12px;
		background: rgba(var(--ds-primary-color-rgb, 236, 72, 153), 0.07);
	}
	.pwa-steps li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.pwa-step-n {
		display: inline-flex;
		width: 20px;
		height: 20px;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		border-radius: 999px;
		background: var(--ds-bg, #fff);
		font-size: 0.7rem;
		font-weight: 800;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
	}

	.pwa-cta {
		width: 100%;
		min-height: 42px;
		padding: 0.55rem 0.9rem;
		border-radius: 12px;
		font-size: 0.85rem;
		font-weight: 800;
		color: #fff;
		background: linear-gradient(
			to right,
			var(--ds-primary-color, #ec4899),
			var(--ds-accent-color, #f59e0b)
		);
		box-shadow: 0 3px 10px rgba(var(--ds-primary-color-rgb, 236, 72, 153), 0.3);
		cursor: pointer;
		transition:
			transform 0.15s ease,
			box-shadow 0.15s ease;
	}
	.pwa-cta:hover {
		transform: translateY(-1px);
		box-shadow: 0 5px 14px rgba(var(--ds-primary-color-rgb, 236, 72, 153), 0.4);
	}
	.pwa-cta:active {
		transform: translateY(0) scale(0.98);
	}
	.pwa-cta.ghost {
		color: var(--ds-ink, #2a2233);
		background: rgba(0, 0, 0, 0.06);
		box-shadow: none;
	}

	/* Phones: full-width strip above the footer, safe-area aware. */
	@media (max-width: 480px) {
		.pwa-card {
			right: 0.75rem;
			left: 0.75rem;
			width: auto;
			bottom: calc(4.5rem + env(safe-area-inset-bottom, 0px));
		}
	}

	@keyframes pwa-pop-in {
		from {
			opacity: 0;
			transform: translateY(12px) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	@keyframes pwa-pop-out {
		from {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
		to {
			opacity: 0;
			transform: translateY(8px) scale(0.97);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pwa-card,
		.pwa-card.closing {
			animation: none;
		}
		.pwa-dismiss:hover,
		.pwa-cta:hover,
		.pwa-cta:active {
			transform: none;
		}
	}
</style>
