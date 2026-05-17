<script>
	import { createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import { ModalCloseButton } from './index.js';
	import { setSupporterStatus } from '$lib/services';
	import { PRICING } from '$lib/config/pricing.js';

	export let closeModal = () => {};

	const dispatch = createEventDispatcher();

	let code = '';
	let errorMessage = '';
	let isSubmitting = false;
	let isStartingCheckout = false;

	function setCheckoutClaim(checkoutId, claimToken) {
		if (!browser || !checkoutId || !claimToken) return;
		sessionStorage.setItem(`talktype_checkout_claim_${checkoutId}`, claimToken);
	}

	async function handleCheckout() {
		if (!browser || isStartingCheckout) return;

		isStartingCheckout = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/supporter/checkout', {
				method: 'POST'
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok || !payload.checkoutUrl) {
				errorMessage =
					payload.error || 'Checkout is not ready here yet. A supporter code still works.';
				return;
			}

			setCheckoutClaim(payload.checkoutId, payload.claimToken);
			window.location.assign(payload.checkoutUrl);
		} catch (error) {
			console.error('Failed to start supporter checkout:', error);
			errorMessage = "Checkout didn't open. Try again in a moment.";
		} finally {
			isStartingCheckout = false;
		}
	}

	async function handleUnlock() {
		if (!browser || isSubmitting) return;

		isSubmitting = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/supporter/redeem', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ code })
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok || !payload.valid) {
				errorMessage = payload.error || "That code didn't match. Check it and try once more.";
				return;
			}

			setSupporterStatus(true, payload.token || null);

			window.dispatchEvent(
				new CustomEvent('talktype:toast', {
					detail: {
						message: 'Supporter mode unlocked. History, downloads, and style presets are live.',
						type: 'success'
					}
				})
			);

			dispatch('unlocked');
			closeModal();
		} catch (error) {
			console.error('Failed to validate supporter code:', error);
			errorMessage = "Couldn't check the code just now. Try again in a moment.";
		} finally {
			isSubmitting = false;
		}
	}

	function handleClose() {
		closeModal();
	}
</script>

<dialog
	id="supporter_modal"
	class="modal fixed z-[999] overflow-hidden"
	aria-labelledby="supporter_modal_title"
	aria-modal="true"
>
	<div
		class="animate-modal-enter modal-box relative max-h-[88vh] w-[94%] max-w-md overflow-y-auto rounded-[1.75rem] border border-pink-200 bg-gradient-to-br from-[#fffaef] to-[#fff6e6] px-5 py-6 shadow-xl sm:w-[92%]"
	>
		<form method="dialog">
			<ModalCloseButton
				closeModal={handleClose}
				label="Close supporter modal"
				position="right-2 top-2"
				modalId="supporter_modal"
			/>
		</form>

		<div class="space-y-4">
			<div class="space-y-2 pr-8">
				<p class="text-xs font-bold uppercase tracking-[0.24em] text-pink-500">Supporter Mode</p>
				<h3 id="supporter_modal_title" class="text-2xl font-black tracking-tight text-gray-800">
					Support TalkType for a one-time {PRICING.displayPrice}
				</h3>
				<p class="text-sm text-gray-600">
					Supporters unlock the good stuff without turning TalkType into subscription sludge.
				</p>
			</div>

			<div class="rounded-2xl border border-pink-100 bg-white/80 p-4 shadow-sm">
				<p class="mb-3 text-sm font-semibold text-gray-700">What unlocks</p>
				<ul class="space-y-2 text-sm text-gray-600">
					<li>Transcript history with local save, edit, and playback</li>
					<li>Download and export tools for saved transcripts</li>
					<li>Three playful output style presets</li>
					<li>Longer recording sessions beyond the free 5-minute cap</li>
				</ul>
			</div>

			<button
				type="button"
				class="btn min-h-12 w-full border-pink-200 bg-pink-500 text-white hover:border-pink-300 hover:bg-pink-600"
				on:click={handleCheckout}
				disabled={isStartingCheckout}
			>
				{isStartingCheckout ? 'Opening Square...' : `Buy with Square - ${PRICING.displayPrice}`}
			</button>

			<div class="space-y-2">
				<label for="supporter-code" class="text-sm font-semibold text-gray-700">
					Already have a supporter code?
				</label>
				<input
					id="supporter-code"
					bind:value={code}
					type="text"
					placeholder="Enter code"
					class="w-full rounded-xl border border-pink-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
					autocomplete="off"
					autocapitalize="none"
					spellcheck="false"
				/>
				{#if errorMessage}
					<p
						class="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-900"
						aria-live="polite"
					>
						{errorMessage}
					</p>
				{/if}
			</div>

			<div class="flex flex-col gap-2 sm:flex-row">
				<button
					type="button"
					class="btn min-h-12 flex-1 border-pink-200 bg-pink-500 text-white hover:border-pink-300 hover:bg-pink-600"
					on:click={handleUnlock}
					disabled={isSubmitting || !code.trim()}
				>
					{isSubmitting ? 'Checking code...' : 'Unlock supporter mode'}
				</button>
				<button
					type="button"
					class="btn btn-ghost min-h-12 flex-1 border border-pink-100 bg-white/70 text-gray-700 hover:bg-pink-50"
					on:click={handleClose}
				>
					Maybe later
				</button>
			</div>

			<p class="text-xs text-gray-500">
				Supporter codes also work for gifts, another device, or manual recovery.
			</p>
		</div>
	</div>
</dialog>

<style>
	.animate-modal-enter {
		animation: modalSlideUp 0.3s ease-out;
	}

	@keyframes modalSlideUp {
		from {
			transform: translateY(20px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
</style>
