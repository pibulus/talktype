<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { ModalCloseButton } from './index.js';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { theme } from '$lib';
	import { setSupporterStatus, userPreferences } from '$lib/services';
	import { PRICING } from '$lib/config/pricing.js';
	import { SUPPORTER_CHECKOUT } from '$lib/constants';
	import { analytics } from '$lib/services/analytics.js';
	import MembershipCard from '$lib/cartridges/MembershipCard.svelte';
	import { getVaultHash } from '$lib/services/syncService.js';
	import {
		readStoredSupporterCode,
		saveStoredSupporterCode
	} from '$lib/services/vaultHashStorage.js';

	export let closeModal = () => {};

	const dispatch = createEventDispatcher();

	let code = '';
	let errorMessage = '';
	let isSubmitting = false;
	let isStartingCheckout = false;
	let codePanelOpen = false;
	let vaultHash = '';
	let passportCode = '';

	// Four words told people nothing about what they'd actually get. Tap one and
	// it says what changes — the detail sells, the label just gets you there.
	const benefits = [
		{
			label: 'Every transcript',
			detail:
				'Free keeps your last 15. Supporter keeps the lot — searchable, taggable, still only on your device.'
		},
		{
			label: 'Take it with you',
			detail:
				'Save any recording as clean audio, export the whole history as text, Markdown, or JSON. Your words, your files.'
		},
		{
			label: 'Pick a voice',
			detail:
				'Pirate, Victorian, Sparkle, L33t — or write your own. Same words, wearing whatever you like.'
		},
		{
			label: 'Room to ramble',
			detail:
				'Longer recordings, the Rainbow ghost, and a passport that syncs it all to another device.'
		}
	];
	let openBenefit = null;
	const MAX_SUPPORTER_CODE_LENGTH = 64;

	function setCheckoutClaim(checkoutId, claimToken) {
		if (!browser || !checkoutId || !claimToken) return false;
		try {
			sessionStorage.setItem(`${SUPPORTER_CHECKOUT.CLAIM_STORAGE_PREFIX}${checkoutId}`, claimToken);
			return true;
		} catch (error) {
			console.warn('Failed to store checkout claim token:', error);
			return false;
		}
	}

	function saveVaultHash(hash) {
		vaultHash = hash;
	}

	onMount(() => {
		if (!browser) return;

		const storedCode = readStoredSupporterCode();
		if (storedCode) {
			passportCode = storedCode;
			getVaultHash(storedCode)
				.then(saveVaultHash)
				.catch((error) => console.warn('Failed to restore supporter passport:', error));
		}
	});

	async function handleCheckout() {
		if (!browser || isStartingCheckout) return;

		isStartingCheckout = true;
		errorMessage = '';
		analytics.checkoutStarted();

		try {
			const response = await fetch('/api/supporter/checkout', {
				method: 'POST'
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok || !payload.checkoutUrl) {
				errorMessage =
					payload.error || 'Checkout needs server setup first. Supporter codes still work.';
				analytics.checkoutFailed({ error: errorMessage });
				return;
			}

			// Without the stored claim token the success page cannot deliver the
			// supporter code after payment — stop before money changes hands.
			if (!setCheckoutClaim(payload.checkoutId, payload.claimToken)) {
				errorMessage =
					'This browser is blocking storage (private mode?). Checkout needs it to deliver your code.';
				analytics.checkoutFailed({ error: 'claim-storage-blocked' });
				return;
			}
			window.location.assign(payload.checkoutUrl);
		} catch (error) {
			console.error('Failed to start supporter checkout:', error);
			analytics.checkoutFailed({ error });
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
				analytics.supporterUnlockFailed({ method: 'code', error: errorMessage });
				return;
			}

			const nextPassportCode = saveStoredSupporterCode(code);
			const nextVaultHash = await getVaultHash(nextPassportCode);
			saveVaultHash(nextVaultHash);
			passportCode = nextPassportCode;
			setSupporterStatus(true, payload.token || null);
			code = '';
			codePanelOpen = false;
			analytics.supporterUnlockSucceeded({ method: 'code' });

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
			analytics.supporterUnlockFailed({ method: 'code', error });
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
	class="modal"
	aria-labelledby="supporter_modal_title"
	aria-describedby="supporter_modal_description"
	aria-modal="true"
>
	<div class="tt-modal-md modal-box relative">
		<form method="dialog">
			<ModalCloseButton
				closeModal={handleClose}
				label="Close supporter modal"
				position="right-2 top-2"
				modalId="supporter_modal"
				tone="candy"
			/>
		</form>

		<div class="space-y-4">
			<!-- Ghost and title on one line: the eyebrow above the headline made two
			     stacked rows of chrome before anyone reached the actual offer. -->
			<div class="flex items-center gap-3 pr-8">
				<div
					class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-pink-200/70 bg-white/75 shadow-sm"
					aria-hidden="true"
				>
					<DisplayGhost size="32px" theme={$theme} seed={24680} disableJsAnimation={true} />
				</div>
				<h3
					id="supporter_modal_title"
					class="min-w-0 text-xl font-black leading-tight tracking-tight text-gray-900 sm:text-2xl"
				>
					Become a supporter
				</h3>
			</div>

			{#if $userPreferences.isSupporter && vaultHash}
				<div class="space-y-3 text-center">
					<p class="text-xs font-black uppercase tracking-[0.18em] text-pink-500">
						Your passport is ready
					</p>
					<div class="flex justify-center py-3">
						<MembershipCard {vaultHash} {passportCode} />
					</div>
				</div>
				<p id="supporter_modal_description" class="text-center text-sm leading-6 text-gray-700">
					Supporter mode is unlocked on this device. This passport is generated locally from your
					supporter code.
				</p>
				<button
					type="button"
					class="btn min-h-12 w-full border-pink-200 bg-pink-500 text-white transition-colors duration-150 hover:border-pink-300 hover:bg-pink-600"
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
						<span class="chevron text-pink-500" aria-hidden="true"></span>
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
							class="btn min-h-12 w-full border-pink-200 bg-pink-500 text-white transition-colors duration-150 hover:border-pink-300 hover:bg-pink-600 disabled:border-pink-100 disabled:bg-pink-100 disabled:text-pink-400 disabled:opacity-100"
							on:click={handleUnlock}
							disabled={isSubmitting || !code.trim()}
						>
							{isSubmitting ? 'Checking code...' : 'Restore passport'}
						</button>
					</div>
				</details>
				{#if errorMessage}
					<p
						class="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-900"
						aria-live="polite"
					>
						{errorMessage}
					</p>
				{/if}
			{:else}
				<!-- Price and pitch share one card, with the number as the hero. -->
				<div class="rounded-2xl border border-pink-100 bg-white/75 p-4 shadow-sm">
					<div class="flex items-baseline gap-2">
						<span class="text-4xl font-black leading-none text-pink-600"
							>{PRICING.displayPrice}</span
						>
						<span class="text-sm font-bold text-pink-400">a year</span>
					</div>
					<p id="supporter_modal_description" class="mt-2 text-sm leading-6 text-gray-700">
						Once. Not a subscription, not a login. It keeps the ghost free for everyone else and
						hands you the good stuff.
					</p>
				</div>

				<div>
					<p class="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
						What you get
					</p>
					<ul class="space-y-2 text-sm">
						{#each benefits as benefit, i}
							<li>
								<button
									type="button"
									class="flex w-full items-center gap-2 rounded-xl border border-pink-100 bg-pink-50/70 px-3 py-3 text-left font-bold leading-tight text-gray-700 transition-colors duration-150 hover:bg-pink-100/70 active:scale-[0.99]"
									aria-expanded={openBenefit === i}
									on:click={() => (openBenefit = openBenefit === i ? null : i)}
								>
									<span class="min-w-0 flex-1">{benefit.label}</span>
									<span
										class="shrink-0 text-pink-400 transition-transform duration-200"
										class:rotate-45={openBenefit === i}
										aria-hidden="true">+</span
									>
								</button>
								{#if openBenefit === i}
									<p
										class="px-3 pb-1 pt-2 text-[13px] leading-relaxed text-gray-600"
										transition:slide={{ duration: 180 }}
									>
										{benefit.detail}
									</p>
								{/if}
							</li>
						{/each}
					</ul>
				</div>

				<button
					type="button"
					class="btn min-h-12 w-full border-pink-200 bg-pink-500 text-white transition-colors duration-150 hover:border-pink-300 hover:bg-pink-600 disabled:border-pink-100 disabled:bg-pink-100 disabled:text-pink-400 disabled:opacity-100"
					on:click={handleCheckout}
					disabled={isStartingCheckout}
				>
					{isStartingCheckout ? 'Opening Square...' : `I'm in — ${PRICING.displayPrice}`}
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
						<span class="chevron text-pink-500" aria-hidden="true"></span>
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
							class="btn min-h-12 w-full border-pink-200 bg-pink-500 text-white transition-colors duration-150 hover:border-pink-300 hover:bg-pink-600 disabled:border-pink-100 disabled:bg-pink-100 disabled:text-pink-400 disabled:opacity-100"
							on:click={handleUnlock}
							disabled={isSubmitting || !code.trim()}
						>
							{isSubmitting ? 'Checking code...' : 'Unlock with code'}
						</button>
						<p class="text-xs text-gray-500">Codes work for gifts and other devices.</p>
					</div>
				</details>

				<div
					class="sticky bottom-0 z-10 -mx-4 -mb-4 bg-[#fffcf5]/95 px-4 pb-4 pt-2 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 sm:pb-6"
				>
					<button
						type="button"
						class="btn btn-ghost min-h-12 w-full border border-pink-100 bg-white/70 text-gray-700 transition-colors duration-150 hover:bg-pink-50"
						on:click={handleClose}
					>
						Maybe later
					</button>
				</div>
			{/if}
		</div>
	</div>
	<button
		type="button"
		class="modal-backdrop"
		on:click={handleClose}
		aria-label="Close supporter modal"
	></button>
</dialog>

<style>
	.chevron {
		display: inline-block;
		height: 0.65rem;
		width: 0.65rem;
		border-bottom: 2px solid currentColor;
		border-right: 2px solid currentColor;
		transform: rotate(45deg);
		transition: transform 160ms ease;
	}

	details[open] .chevron {
		transform: rotate(225deg);
	}
</style>
