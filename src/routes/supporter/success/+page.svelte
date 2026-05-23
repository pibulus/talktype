<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { setSupporterStatus } from '$lib/services';
	import { theme } from '$lib';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { Seo } from '$lib/components/layout';
	import Confetti from '$lib/components/ui/effects/Confetti.svelte';
	import MembershipCard from '$lib/cartridges/MembershipCard.svelte';
	import { SUPPORTER_CHECKOUT } from '$lib/constants';
	import { getVaultHash } from '$lib/services/syncService.js';
	import { saveStoredSupporterCode } from '$lib/services/vaultHashStorage.js';

	let status = 'checking';
	let message = 'Checking your supporter unlock...';
	let supporterCode = '';
	let vaultHash = '';
	let checkoutId = '';
	let pollTimer;
	let pollAttempts = 0;
	let copyMessage = '';
	let showSuccessConfetti = false;
	let isCheckingCheckout = false;

	function claimStorageKey(id) {
		return `${SUPPORTER_CHECKOUT.CLAIM_STORAGE_PREFIX}${id}`;
	}

	function stopPolling() {
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
	}

	async function copySupporterCode() {
		if (!browser || !supporterCode) return;

		try {
			await navigator.clipboard.writeText(supporterCode);
			copyMessage = 'Copied';
			setTimeout(() => {
				copyMessage = '';
			}, 1800);
		} catch {
			copyMessage = 'Copy needs one more try';
		}
	}

	async function checkCheckout() {
		if (!browser || !checkoutId || isCheckingCheckout) return;

		isCheckingCheckout = true;

		const claimToken = sessionStorage.getItem(claimStorageKey(checkoutId));
		if (!claimToken) {
			status = 'missing-claim';
			message = 'Open this supporter link in the same browser used for checkout.';
			isCheckingCheckout = false;
			return;
		}

		try {
			const response = await fetch(`/api/supporter/checkout/${encodeURIComponent(checkoutId)}`, {
				headers: {
					[SUPPORTER_CHECKOUT.CLAIM_HEADER]: claimToken
				}
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) {
				status = 'error';
				message = payload.error || 'Checkout status needs one more try in a moment.';
				return;
			}

			if (payload.status !== 'paid') {
				status = 'pending';
				message = 'Payment is being confirmed. This usually takes a few seconds.';
				return;
			}

			const nextSupporterCode = payload.code || '';
			let nextVaultHash = '';
			if (nextSupporterCode) {
				try {
					const passportCode = saveStoredSupporterCode(nextSupporterCode);
					nextVaultHash = await getVaultHash(passportCode);
				} catch (error) {
					console.warn('Failed to prepare supporter passport:', error);
				}
			}

			supporterCode = nextSupporterCode;
			vaultHash = nextVaultHash;
			setSupporterStatus(true, payload.token || null);
			status = 'paid';
			showSuccessConfetti = true;
			message = nextVaultHash
				? 'Supporter mode is unlocked on this device.'
				: 'Supporter mode is unlocked. Your passport can be regenerated from your code later.';
			sessionStorage.removeItem(claimStorageKey(checkoutId));
		} catch {
			status = 'error';
			message = 'Check your connection, then refresh this page.';
		} finally {
			isCheckingCheckout = false;
		}
	}

	onMount(() => {
		if (!browser) return;

		const params = new URLSearchParams(window.location.search);
		checkoutId = params.get('checkout_id') || '';

		if (!checkoutId) {
			status = 'error';
			message = 'Open TalkType and start supporter checkout again.';
			return;
		}

		checkCheckout();
		pollTimer = setInterval(() => {
			if (status === 'paid' || status === 'error' || status === 'missing-claim') {
				stopPolling();
				return;
			}
			if (isCheckingCheckout) return;
			pollAttempts += 1;
			if (pollAttempts >= SUPPORTER_CHECKOUT.MAX_POLLS) {
				status = 'error';
				message =
					'Payment confirmation is taking longer than expected. Refresh this page in a moment.';
				stopPolling();
				return;
			}
			checkCheckout();
		}, SUPPORTER_CHECKOUT.POLL_INTERVAL_MS);

		return () => {
			stopPolling();
		};
	});
</script>

<Seo
	title="Supporter Unlock | TalkType"
	description="Complete your TalkType supporter unlock."
	path="/supporter/success"
	noindex={true}
	includeStructuredData={false}
/>

{#if showSuccessConfetti}
	<Confetti
		targetSelector=".success-ghost"
		particleCount={34}
		duration={1500}
		colors={['#ec4899', '#f9a8d4', '#f5c86b', '#f7b89c', '#fff1a8']}
		on:complete={() => (showSuccessConfetti = false)}
	/>
{/if}

<main class="min-h-screen bg-[#fffaef] px-5 py-8 text-gray-800 sm:py-10">
	<section class="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
		<div
			class={`success-ghost transition-transform duration-300 ${status === 'paid' ? 'ghost-celebrate h-32 w-32' : 'h-24 w-24'}`}
		>
			<DisplayGhost theme={$theme} size="100%" />
		</div>

		{#key status}
			<div class="status-copy space-y-2">
				<p class="text-xs font-bold uppercase tracking-[0.24em] text-pink-500">Supporter Mode</p>
				<h1 class="text-3xl font-black tracking-tight">
					{status === 'paid' ? 'Your passport is ready' : 'Almost there'}
				</h1>
				<p class="text-sm text-gray-600">{message}</p>
			</div>
		{/key}

		{#if status === 'pending' || status === 'checking'}
			<div class="h-2 w-full overflow-hidden rounded-full bg-pink-100">
				<div class="supporter-progress-bar h-full rounded-full"></div>
			</div>
		{/if}

		{#if supporterCode}
			{#if vaultHash}
				<div class="success-passport space-y-3">
					<p class="text-xs font-black uppercase tracking-[0.18em] text-pink-500">
						Your TalkType Passport
					</p>
					<MembershipCard {vaultHash} />
				</div>
			{/if}

			<div
				class="success-code-card w-full rounded-2xl border border-pink-100 bg-white/80 p-4 shadow-sm"
			>
				<div class="mb-2 flex items-center justify-between gap-3">
					<p class="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
						Your supporter code
					</p>
					<button
						type="button"
						class="btn min-h-11 min-w-20 border-pink-200 bg-pink-500 px-4 text-white transition-colors duration-150 hover:border-pink-300 hover:bg-pink-600"
						on:click={copySupporterCode}
					>
						Copy
					</button>
				</div>
				<p
					class="min-w-0 break-all rounded-xl bg-[#fffdf5] px-3 py-2 text-left font-mono text-base font-bold tracking-wide text-gray-900"
				>
					{supporterCode}
				</p>
				{#if copyMessage}
					<p class="mt-2 text-xs font-bold text-pink-600" aria-live="polite">{copyMessage}</p>
				{/if}
				<p class="mt-2 text-xs text-gray-500">
					TalkType remembered this Passport on this device. Keep the code for other devices.
				</p>
			</div>
		{/if}

		<a
			href="/"
			class={`btn min-h-12 w-full rounded-2xl border-pink-200 bg-pink-500 text-white transition-colors duration-150 hover:border-pink-300 hover:bg-pink-600 ${status === 'paid' ? 'success-return' : ''}`}
		>
			Return to TalkType
		</a>
	</section>
</main>

<style>
	@media (prefers-reduced-motion: no-preference) {
		.status-copy {
			animation: statusReveal 260ms ease-out both;
		}

		.ghost-celebrate {
			animation: ghostCelebrate 1100ms cubic-bezier(0.16, 0.95, 0.18, 1.2) both;
		}

		.success-passport,
		.success-code-card,
		.success-return {
			animation: successReveal 420ms cubic-bezier(0.2, 0.9, 0.2, 1) both;
		}

		.success-passport {
			animation-delay: 500ms;
		}

		.success-code-card {
			animation-delay: 680ms;
		}

		.success-return {
			animation-delay: 820ms;
		}
	}

	.supporter-progress-bar {
		width: 42%;
		background: linear-gradient(90deg, #f9a8d4 0%, #ec4899 45%, #f5c86b 100%);
		animation: progressScan 1300ms ease-in-out infinite;
		box-shadow: 0 0 18px rgba(236, 72, 153, 0.22);
	}

	@keyframes statusReveal {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes ghostCelebrate {
		0% {
			transform: translateY(14px) rotate(-4deg) scale(0.82);
		}
		35% {
			transform: translateY(-10px) rotate(3deg) scale(1.1);
		}
		58% {
			transform: translateY(3px) rotate(-2deg) scale(0.98);
		}
		78% {
			transform: translateY(-3px) rotate(1deg) scale(1.03);
		}
		100% {
			transform: translateY(0) rotate(0) scale(1);
		}
	}

	@keyframes successReveal {
		from {
			opacity: 0;
			transform: translateY(14px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes progressScan {
		0% {
			transform: translateX(-110%);
		}
		100% {
			transform: translateX(260%);
		}
	}
</style>
