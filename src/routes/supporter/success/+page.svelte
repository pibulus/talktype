<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { setSupporterStatus } from '$lib/services';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { Seo } from '$lib/components/layout';

	let status = 'checking';
	let message = 'Checking your supporter unlock...';
	let supporterCode = '';
	let checkoutId = '';
	let pollTimer;

	function claimStorageKey(id) {
		return `talktype_checkout_claim_${id}`;
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
			const response = await fetch(
				`/api/supporter/checkout/${encodeURIComponent(checkoutId)}?claim_token=${encodeURIComponent(
					claimToken
				)}`
			);
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

			status = 'paid';
			message = 'Supporter mode is unlocked on this device.';
			supporterCode = payload.code || '';
			setSupporterStatus(true, payload.token || null);
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

<main class="min-h-screen bg-[#fffaef] px-5 py-10 text-gray-800">
	<section class="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
		<div class="h-24 w-24">
			<DisplayGhost theme="peach" size="100%" />
		</div>

		<div class="space-y-2">
			<p class="text-xs font-bold uppercase tracking-[0.24em] text-pink-500">Supporter Mode</p>
			<h1 class="text-3xl font-black tracking-tight">
				{status === 'paid' ? 'You are unlocked' : 'Almost there'}
			</h1>
			<p class="text-sm text-gray-600">{message}</p>
		</div>

		{#if status === 'pending' || status === 'checking'}
			<div class="h-2 w-full overflow-hidden rounded-full bg-pink-100">
				<div class="h-full w-1/3 animate-pulse rounded-full bg-pink-400"></div>
			</div>
		{/if}

		{#if supporterCode}
			<div class="w-full rounded-2xl border border-pink-100 bg-white/80 p-4 shadow-sm">
				<p class="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
					Your supporter code
				</p>
				<p class="font-mono text-lg font-bold tracking-wide text-gray-900">{supporterCode}</p>
				<p class="mt-2 text-xs text-gray-500">
					Keep this code for unlocking TalkType on another device.
				</p>
			</div>
		{/if}

		<a
			href="/"
			class="btn min-h-12 w-full rounded-full border-pink-200 bg-pink-500 text-white hover:border-pink-300 hover:bg-pink-600"
		>
			Return to TalkType
		</a>
	</section>
</main>
