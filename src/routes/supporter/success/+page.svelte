<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { setSupporterStatus } from '$lib/services';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { Seo } from '$lib/components/layout';
	import MembershipCard from '$lib/cartridges/MembershipCard.svelte';
	import { STORAGE_KEYS } from '$lib/constants';
	import { getVaultHash } from '$lib/services/syncService.js';

	let status = 'checking';
	let message = 'Checking your supporter unlock...';
	let supporterCode = '';
	let vaultHash = '';
	let checkoutId = '';
	let pollTimer;
	let pollAttempts = 0;
	let copyMessage = '';

	const MAX_CHECKOUT_POLLS = 20;
	const CHECKOUT_CLAIM_HEADER = 'x-talktype-checkout-claim';

	function claimStorageKey(id) {
		return `talktype_checkout_claim_${id}`;
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
		if (!browser || !checkoutId) return;

		const claimToken = sessionStorage.getItem(claimStorageKey(checkoutId));
		if (!claimToken) {
			status = 'missing-claim';
			message = 'Open this supporter link in the same browser used for checkout.';
			return;
		}

		try {
			const response = await fetch(`/api/supporter/checkout/${encodeURIComponent(checkoutId)}`, {
				headers: {
					[CHECKOUT_CLAIM_HEADER]: claimToken
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
					nextVaultHash = await getVaultHash(nextSupporterCode);
					localStorage.setItem(STORAGE_KEYS.SUPPORTER_VAULT_HASH, nextVaultHash);
				} catch (error) {
					console.warn('Failed to prepare supporter passport:', error);
				}
			}

			supporterCode = nextSupporterCode;
			vaultHash = nextVaultHash;
			setSupporterStatus(true, payload.token || null);
			status = 'paid';
			message = nextVaultHash
				? 'Supporter mode is unlocked on this device.'
				: 'Supporter mode is unlocked. Your passport can be regenerated from your code later.';
			sessionStorage.removeItem(claimStorageKey(checkoutId));
		} catch {
			status = 'error';
			message = 'Check your connection, then refresh this page.';
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
				clearInterval(pollTimer);
				return;
			}
			pollAttempts += 1;
			if (pollAttempts >= MAX_CHECKOUT_POLLS) {
				status = 'error';
				message =
					'Payment confirmation is taking longer than expected. Refresh this page in a moment.';
				clearInterval(pollTimer);
				return;
			}
			checkCheckout();
		}, 2500);

		return () => {
			if (pollTimer) clearInterval(pollTimer);
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

<main class="min-h-screen bg-[#fffaef] px-5 py-8 text-gray-800 sm:py-10">
	<section class="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
		<div
			class={`transition-transform duration-300 ${status === 'paid' ? 'ghost-celebrate h-32 w-32' : 'h-24 w-24'}`}
		>
			<DisplayGhost theme="peach" size="100%" />
		</div>

		<div class="space-y-2">
			<p class="text-xs font-bold uppercase tracking-[0.24em] text-pink-500">Supporter Mode</p>
			<h1 class="text-3xl font-black tracking-tight">
				{status === 'paid' ? 'Your passport is ready' : 'Almost there'}
			</h1>
			<p class="text-sm text-gray-600">{message}</p>
		</div>

		{#if status === 'pending' || status === 'checking'}
			<div class="h-2 w-full overflow-hidden rounded-full bg-pink-100">
				<div class="h-full w-1/3 animate-pulse rounded-full bg-pink-400"></div>
			</div>
		{/if}

		{#if supporterCode}
			{#if vaultHash}
				<div class="space-y-3">
					<p class="text-xs font-black uppercase tracking-[0.18em] text-pink-500">
						Your TalkType Passport
					</p>
					<MembershipCard {vaultHash} />
				</div>
			{/if}

			<div class="w-full rounded-2xl border border-pink-100 bg-white/80 p-4 shadow-sm">
				<p class="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
					Your supporter code
				</p>
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
					<p
						class="min-w-0 flex-1 break-all rounded-xl bg-[#fffdf5] px-3 py-2 font-mono text-base font-bold tracking-wide text-gray-900"
					>
						{supporterCode}
					</p>
					<button
						type="button"
						class="btn min-h-11 border-pink-200 bg-pink-500 px-4 text-white hover:border-pink-300 hover:bg-pink-600"
						on:click={copySupporterCode}
					>
						Copy
					</button>
				</div>
				{#if copyMessage}
					<p class="mt-2 text-xs font-bold text-pink-600" aria-live="polite">{copyMessage}</p>
				{/if}
				<p class="mt-2 text-xs text-gray-500">
					Keep this code for unlocking TalkType on another device.
				</p>
			</div>
		{/if}

		<a
			href="/"
			class="btn min-h-12 w-full rounded-2xl border-pink-200 bg-pink-500 text-white hover:border-pink-300 hover:bg-pink-600"
		>
			Return to TalkType
		</a>
	</section>
</main>

<style>
	@media (prefers-reduced-motion: no-preference) {
		.ghost-celebrate {
			animation: ghostCelebrate 850ms cubic-bezier(0.2, 0.9, 0.2, 1.12) both;
		}
	}

	@keyframes ghostCelebrate {
		0% {
			transform: translateY(8px) scale(0.92);
		}
		55% {
			transform: translateY(-4px) scale(1.04);
		}
		100% {
			transform: translateY(0) scale(1);
		}
	}
</style>
