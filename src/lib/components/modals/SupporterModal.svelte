<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { ModalCloseButton } from './index.js';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { theme } from '$lib';
	import { setSupporterStatus, userPreferences } from '$lib/services';
	import { PRICING } from '$lib/config/pricing.js';
	import { STORAGE_KEYS } from '$lib/constants';
	import MembershipCard from '$lib/cartridges/MembershipCard.svelte';
	import { getVaultHash } from '$lib/services/syncService.js';

	export let closeModal = () => {};

	const dispatch = createEventDispatcher();

	let code = '';
	let errorMessage = '';
	let isSubmitting = false;
	let isStartingCheckout = false;
	let codePanelOpen = false;
	let vaultHash = '';

	const benefits = [
		{ label: 'Local history', mark: 'H' },
		{ label: 'Downloads', mark: 'D' },
		{ label: 'Style presets', mark: 'S' },
		{ label: 'Longer notes', mark: 'L' }
	];
	const MAX_SUPPORTER_CODE_LENGTH = 64;

	function setCheckoutClaim(checkoutId, claimToken) {
		if (!browser || !checkoutId || !claimToken) return;
		sessionStorage.setItem(`talktype_checkout_claim_${checkoutId}`, claimToken);
	}

	function saveVaultHash(hash) {
		vaultHash = hash;
		if (browser && hash) {
			localStorage.setItem(STORAGE_KEYS.SUPPORTER_VAULT_HASH, hash);
		}
	}

	onMount(() => {
		if (!browser) return;
		vaultHash = localStorage.getItem(STORAGE_KEYS.SUPPORTER_VAULT_HASH) || '';
	});

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
					payload.error || 'Checkout needs server setup first. Supporter codes still work.';
				return;
			}

			setCheckoutClaim(payload.checkoutId, payload.claimToken);
			window.location.assign(payload.checkoutUrl);
		} catch (error) {
			console.error('Failed to start supporter checkout:', error);
			errorMessage = 'Checkout needs one more try in a moment.';
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
				errorMessage = payload.error || 'Check the supporter code and try once more.';
				return;
			}

			const nextVaultHash = await getVaultHash(code);
			setSupporterStatus(true, payload.token || null);
			saveVaultHash(nextVaultHash);

			window.dispatchEvent(
				new CustomEvent('talktype:toast', {
					detail: {
						message: 'Supporter mode unlocked. Your passport is ready.',
						type: 'success'
					}
				})
			);

			dispatch('unlocked');
		} catch (error) {
			console.error('Failed to validate supporter code:', error);
			errorMessage = 'Code check needs one more try in a moment.';
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
	class="modal modal-bottom fixed z-[999] overflow-hidden sm:modal-middle"
	aria-labelledby="supporter_modal_title"
	aria-describedby="supporter_modal_description"
	aria-modal="true"
>
	<div
		class="animate-modal-enter modal-box relative max-h-[85vh] w-[92vw] overflow-y-auto rounded-3xl border border-pink-100 bg-[#fffcf5] p-6 shadow-2xl"
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
			<div class="flex items-start gap-3 pr-10">
				<div
					class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-pink-200/70 bg-white/75 shadow-sm"
					aria-hidden="true"
				>
					<DisplayGhost size="34px" theme={$theme} seed={24680} disableJsAnimation={true} />
				</div>
				<div class="min-w-0 space-y-1">
					<p class="text-xs font-bold uppercase tracking-[0.22em] text-pink-500">
						Support TalkType
					</p>
					<h3
						id="supporter_modal_title"
						class="text-2xl font-black leading-tight tracking-tight text-gray-900"
					>
						One-time supporter unlock
					</h3>
				</div>
			</div>

			{#if $userPreferences.isSupporter && vaultHash}
				<div class="space-y-3 text-center">
					<p class="text-xs font-black uppercase tracking-[0.18em] text-pink-500">
						Your passport is ready
					</p>
					<div class="flex justify-center py-3">
						<MembershipCard {vaultHash} />
					</div>
				</div>
				<p id="supporter_modal_description" class="text-center text-sm leading-6 text-gray-700">
					Supporter mode is unlocked on this device. This passport is generated locally from your
					supporter code.
				</p>
				<button
					type="button"
					class="btn min-h-12 w-full border-pink-200 bg-pink-500 text-white hover:border-pink-300 hover:bg-pink-600"
					on:click={handleClose}
				>
					Nice, let's go
				</button>
			{:else if $userPreferences.isSupporter}
				<div class="space-y-3 text-center">
					<p class="text-xs font-black uppercase tracking-[0.18em] text-pink-500">
						Passport recovery
					</p>
					<div
						class="mx-auto flex aspect-[1.586/1] w-full max-w-[320px] items-center justify-center rounded-2xl border border-dashed border-pink-200 bg-pink-50/70 p-5 text-sm font-bold text-pink-600"
					>
						Passport ready to regenerate
					</div>
				</div>
				<p id="supporter_modal_description" class="text-center text-sm leading-6 text-gray-700">
					Supporter mode is unlocked. Enter your supporter code to regenerate this device's
					passport.
				</p>
				<details open class="rounded-2xl border border-pink-100 bg-white/65 px-4 py-3">
					<summary
						class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
					>
						<span>Regenerate passport</span>
						<span class="text-pink-500" aria-hidden="true">Open</span>
					</summary>

					<div class="mt-3 space-y-3">
						<label for="supporter-code-recovery" class="sr-only">Supporter code</label>
						<input
							id="supporter-code-recovery"
							bind:value={code}
							type="text"
							placeholder="Enter code"
							class="w-full rounded-xl border border-pink-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
							autocomplete="off"
							autocapitalize="none"
							spellcheck="false"
							maxlength={MAX_SUPPORTER_CODE_LENGTH}
						/>
						<button
							type="button"
							class="btn min-h-12 w-full border-pink-200 bg-pink-500 text-white hover:border-pink-300 hover:bg-pink-600 disabled:border-pink-100 disabled:bg-pink-100 disabled:text-pink-400 disabled:opacity-100"
							on:click={handleUnlock}
							disabled={isSubmitting || !code.trim()}
						>
							{isSubmitting ? 'Checking code...' : 'Restore passport'}
						</button>
					</div>
				</details>
			{:else}
				<div class="rounded-2xl border border-pink-100 bg-white/75 p-4 shadow-sm">
					<p id="supporter_modal_description" class="text-sm leading-6 text-gray-700">
						Pay once, keep the extras, and help the little ghost stay free for everyone.
					</p>
					<p class="mt-3 text-xl font-black text-pink-600">{PRICING.displayPrice}</p>
				</div>

				<div>
					<p class="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Includes</p>
					<ul class="grid grid-cols-2 gap-2 text-sm font-semibold text-gray-700">
						{#each benefits as benefit}
							<li
								class="flex min-h-12 items-center gap-2 rounded-xl border border-pink-100 bg-pink-50/70 px-3 py-2"
							>
								<span
									class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/80 text-xs font-black text-pink-500"
									aria-hidden="true"
								>
									{benefit.mark}
								</span>
								<span class="min-w-0 text-left leading-tight">{benefit.label}</span>
							</li>
						{/each}
					</ul>
				</div>

				<button
					type="button"
					class="btn min-h-12 w-full border-pink-200 bg-pink-500 text-white hover:border-pink-300 hover:bg-pink-600 disabled:border-pink-100 disabled:bg-pink-100 disabled:text-pink-400 disabled:opacity-100"
					on:click={handleCheckout}
					disabled={isStartingCheckout}
				>
					{isStartingCheckout ? 'Opening Square...' : `Contribute once - ${PRICING.displayPrice}`}
				</button>

				{#if errorMessage}
					<p
						class="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-900"
						aria-live="polite"
					>
						{errorMessage}
					</p>
				{/if}

				<details
					bind:open={codePanelOpen}
					class="rounded-2xl border border-pink-100 bg-white/65 px-4 py-3"
				>
					<summary
						class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
					>
						<span>Have a supporter code?</span>
						<span class="text-pink-500" aria-hidden="true">{codePanelOpen ? 'Close' : 'Open'}</span>
					</summary>

					<div class="mt-3 space-y-3">
						<label for="supporter-code" class="sr-only">Supporter code</label>
						<input
							id="supporter-code"
							bind:value={code}
							type="text"
							placeholder="Enter code"
							class="w-full rounded-xl border border-pink-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
							autocomplete="off"
							autocapitalize="none"
							spellcheck="false"
							maxlength={MAX_SUPPORTER_CODE_LENGTH}
						/>
						<button
							type="button"
							class="btn min-h-12 w-full border-pink-200 bg-pink-500 text-white hover:border-pink-300 hover:bg-pink-600 disabled:border-pink-100 disabled:bg-pink-100 disabled:text-pink-400 disabled:opacity-100"
							on:click={handleUnlock}
							disabled={isSubmitting || !code.trim()}
						>
							{isSubmitting ? 'Checking code...' : 'Unlock with code'}
						</button>
						<p class="text-xs text-gray-500">Codes work for gifts and other devices.</p>
					</div>
				</details>

				<button
					type="button"
					class="btn btn-ghost min-h-12 w-full border border-pink-100 bg-white/70 text-gray-700 hover:bg-pink-50"
					on:click={handleClose}
				>
					Maybe later
				</button>
			{/if}
		</div>
	</div>
	<button
		type="button"
		class="modal-backdrop bg-pink-950/30"
		on:click={handleClose}
		aria-label="Close supporter modal"
	></button>
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
