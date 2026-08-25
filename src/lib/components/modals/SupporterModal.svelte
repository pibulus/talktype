<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { ModalCloseButton } from './index.js';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { theme } from '$lib';
	import { setSupporterStatus, userPreferences } from '$lib/services';
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

	const features = [
		{
			title: 'Every transcript',
			detail: 'Save as clean audio, export text, Markdown, or JSON.',
			icon: 'doc',
			squircleClass: 'bg-pink-100/90 border border-pink-300 text-pink-600'
		},
		{
			title: 'Take it with you',
			detail: 'Your words, your files. No cloud lock-in.',
			icon: 'download',
			squircleClass: 'bg-amber-100/90 border border-amber-300 text-amber-700'
		},
		{
			title: 'Pick a voice',
			detail: 'Swap the default output for different vibes.',
			icon: 'sparkles',
			squircleClass: 'bg-purple-100/90 border border-purple-300 text-purple-600'
		},
		{
			title: 'Room to ramble',
			detail: 'No cut-offs, just keep talking.',
			icon: 'mic',
			squircleClass: 'bg-sky-100/90 border border-sky-300 text-sky-600'
		}
	];

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
				position="right-3 top-3"
				modalId="supporter_modal"
			/>
		</form>

		<div class="space-y-4">
			<!-- Ghost and Title Header -->
			<div class="flex items-center gap-3 pr-8">
				<div
					class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-pink-200 bg-white/90 shadow-sm"
					aria-hidden="true"
				>
					<DisplayGhost size="32px" theme={$theme} seed={24680} disableJsAnimation={true} />
				</div>
				<div>
					<h3
						id="supporter_modal_title"
						class="text-xl font-black leading-tight tracking-tight text-gray-900 sm:text-2xl"
					>
						Support TalkType
					</h3>
				</div>
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
					Supporter perks unlocked on this device. Your passport is generated locally from your
					code.
				</p>
				<button
					type="button"
					class="btn min-h-12 w-full rounded-full border-2 border-pink-600 bg-pink-500 text-base font-black text-white shadow-md shadow-pink-200/60 transition-all duration-150 hover:bg-pink-600 active:scale-[0.98]"
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
						class="mx-auto flex aspect-[1.586/1] w-full max-w-[320px] items-center justify-center rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50/70 p-5 text-sm font-bold text-pink-600"
					>
						Passport ready to regenerate
					</div>
				</div>
				<p id="supporter_modal_description" class="text-center text-sm leading-6 text-gray-700">
					Supporter mode is unlocked. Enter your code to regenerate this device's passport.
				</p>
				<details open class="rounded-2xl border-2 border-pink-100 bg-white/70 px-4 py-3">
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
							class="btn min-h-12 w-full rounded-full border-2 border-pink-600 bg-pink-500 text-sm font-black text-white transition-colors duration-150 hover:bg-pink-600 disabled:border-pink-100 disabled:bg-pink-100 disabled:text-pink-400 disabled:opacity-100"
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
				<!-- Intro Copy (No heavy $24 header box) -->
				<p
					id="supporter_modal_description"
					class="text-sm font-medium leading-relaxed text-gray-700"
				>
					TalkType has no ads, no VC money, and no account walls. One pass keeps this running and
					unlocks everything on all your devices:
				</p>

				<!-- Flat Pitch Feature Stack (No accordions, solid icons in tiny squircles) -->
				<div class="space-y-3 py-1">
					{#each features as feature}
						<div class="flex items-start gap-3.5">
							<div
								class="shadow-xs flex h-9 w-9 shrink-0 items-center justify-center rounded-xl {feature.squircleClass}"
								aria-hidden="true"
							>
								{#if feature.icon === 'doc'}
									<svg
										class="h-4 w-4"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2.2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
										<polyline points="14 2 14 8 20 8" />
										<line x1="16" y1="13" x2="8" y2="13" />
										<line x1="16" y1="17" x2="8" y2="17" />
										<line x1="10" y1="9" x2="8" y2="9" />
									</svg>
								{:else if feature.icon === 'download'}
									<svg
										class="h-4 w-4"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2.2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
										<polyline points="7 10 12 15 17 10" />
										<line x1="12" y1="15" x2="12" y2="3" />
									</svg>
								{:else if feature.icon === 'sparkles'}
									<svg
										class="h-4 w-4"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2.2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2Z" />
										<path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />
									</svg>
								{:else}
									<svg
										class="h-4 w-4"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2.2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
										<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
										<line x1="12" y1="19" x2="12" y2="22" />
									</svg>
								{/if}
							</div>
							<div class="min-w-0 pt-0.5">
								<h4 class="text-sm font-black tracking-tight text-gray-900">{feature.title}</h4>
								<p class="text-xs leading-relaxed text-gray-600">{feature.detail}</p>
							</div>
						</div>
					{/each}
				</div>

				<!-- Bright Pink CTA with Anchor Price -->
				<button
					type="button"
					class="btn min-h-12 w-full rounded-full border-2 border-pink-600 bg-pink-500 text-base font-black tracking-tight text-white shadow-md shadow-pink-200/60 transition-all duration-150 hover:scale-[1.01] hover:bg-pink-600 active:scale-[0.98] disabled:border-pink-100 disabled:bg-pink-100 disabled:text-pink-400 disabled:opacity-100"
					on:click={handleCheckout}
					disabled={isStartingCheckout}
				>
					{isStartingCheckout ? 'Opening Square...' : "I'm in — $24 / yr"}
				</button>

				{#if errorMessage}
					<p
						class="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-900"
						aria-live="polite"
					>
						{errorMessage}
					</p>
				{/if}

				<!-- Collapsed Supporter Code Trigger -->
				<details
					bind:open={codePanelOpen}
					class="rounded-xl border border-pink-100 bg-white/60 px-3.5 py-2 text-xs"
				>
					<summary
						class="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 font-bold text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
					>
						<span>Have a supporter code?</span>
						<span class="chevron text-pink-400" aria-hidden="true"></span>
					</summary>

					<div class="mt-2.5 space-y-2.5">
						<label for="supporter-code" class="sr-only">Supporter code</label>
						<input
							id="supporter-code"
							bind:value={code}
							type="text"
							placeholder="Enter code (e.g. TALKTYPE-CREW)"
							class="shadow-xs w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
							autocomplete="off"
							autocapitalize="none"
							spellcheck="false"
							maxlength={MAX_SUPPORTER_CODE_LENGTH}
						/>
						<button
							type="button"
							class="btn min-h-9 w-full rounded-lg border border-pink-200 bg-pink-500 text-xs font-bold text-white transition-colors duration-150 hover:border-pink-300 hover:bg-pink-600 disabled:border-pink-100 disabled:bg-pink-100 disabled:text-pink-400 disabled:opacity-100"
							on:click={handleUnlock}
							disabled={isSubmitting || !code.trim()}
						>
							{isSubmitting ? 'Checking code...' : 'Unlock with code'}
						</button>
						<p class="text-[11px] text-gray-500">Codes work for gifts and other devices.</p>
					</div>
				</details>

				<!-- Quiet Dismiss -->
				<div
					class="sticky bottom-0 z-10 -mx-4 -mb-4 bg-[#fffcf5]/95 px-4 pb-4 pt-1 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 sm:pb-6"
				>
					<button
						type="button"
						class="btn btn-ghost min-h-10 w-full rounded-full border border-pink-100 bg-white/70 text-xs font-bold text-gray-600 transition-colors duration-150 hover:bg-pink-50 hover:text-gray-800"
						on:click={handleClose}
					>
						Keep cruising
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
		height: 0.55rem;
		width: 0.55rem;
		border-bottom: 2px solid currentColor;
		border-right: 2px solid currentColor;
		transform: rotate(45deg);
		transition: transform 160ms ease;
	}

	details[open] .chevron {
		transform: rotate(225deg);
	}
</style>
