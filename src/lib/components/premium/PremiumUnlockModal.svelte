<script>
	import { onMount } from 'svelte';
	import { unlockPremiumFeatures, getPremiumFeatures } from '$lib/services/premium/premiumService';
	import { ModalCloseButton } from '$lib/components/modals/index.js';
	import { Button } from '$lib/components/shared';

	export let closeModal = () => {};
	export let feature = null; // Which feature triggered the modal

	const features = getPremiumFeatures();
	const price = '$9';

	// For demo purposes - in production, integrate with payment provider
	let isUnlocking = false;

	function handleUnlock() {
		// In production, this would call your payment API
		// For now, just unlock immediately (for testing)
		isUnlocking = true;

		setTimeout(() => {
			unlockPremiumFeatures();
			isUnlocking = false;

			// Show success message
			window.dispatchEvent(
				new CustomEvent('talktype:toast', {
					detail: {
						message: '🎉 Premium unlocked! All features are now available.',
						type: 'success'
					}
				})
			);

			closeModal();
		}, 1500);
	}

	function handleModalClose() {
		closeModal();
	}

	onMount(() => {
		// Log which feature triggered the modal
		if (feature) {
			console.log('Premium modal opened for feature:', feature);
		}
	});
</script>

<dialog
	id="premium_modal"
	class="modal fixed z-[999] overflow-hidden"
	aria-labelledby="premium_modal_title"
	aria-modal="true"
>
	<div
		class="animate-modal-enter modal-box relative max-h-[85vh] w-[95%] max-w-2xl overflow-hidden rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-2xl"
	>
		<form method="dialog">
			<ModalCloseButton
				closeModal={handleModalClose}
				label="Close premium info"
				position="right-2 top-2"
				modalId="premium_modal"
			/>
		</form>

		<!-- Header -->
		<div class="mb-6 text-center">
			<div class="mb-3 flex justify-center">
				<div
					class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg"
				>
					<span class="text-3xl">⭐</span>
				</div>
			</div>
			<h3 id="premium_modal_title" class="mb-2 text-3xl font-black tracking-tight text-gray-800">
				Unlock Premium
			</h3>
			<p class="text-lg font-semibold text-amber-600">
				One-time payment • <span class="text-2xl">{price}</span> • Lifetime access
			</p>
		</div>

		<!-- Features Grid -->
		<div class="mb-6 max-h-[calc(85vh-300px)] overflow-y-auto">
			<div class="grid gap-3 sm:grid-cols-2">
				{#each features as feat}
					<div
						class="rounded-lg border border-amber-200 bg-white/80 p-3 shadow-sm transition-all hover:shadow-md"
					>
						<div class="mb-1 flex items-start gap-2">
							<span class="text-2xl">{feat.icon}</span>
							<div class="flex-1">
								<h4 class="font-bold text-gray-800">{feat.name}</h4>
								<p class="text-xs text-gray-600">{feat.description}</p>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Value Proposition -->
			<div class="mt-6 rounded-lg border-2 border-pink-200 bg-pink-50/50 p-4">
				<h4 class="mb-2 font-bold text-pink-700">💰 Why One-Time?</h4>
				<p class="text-sm text-gray-700">
					We hate subscription fatigue! Pay <strong>{price} once</strong> and keep all features
					forever. Competitors charge $10+/month for the same features - we think that's BS. 🎯
				</p>
			</div>

			<!-- Privacy Message -->
			<div class="mt-3 rounded-lg bg-blue-50/50 p-3">
				<p class="text-xs text-gray-600">
					🔒 <strong>100% Private:</strong> All your transcripts stay on your device. We never see
					or store your data. Payment is secure via [Payment Provider].
				</p>
			</div>
		</div>

		<!-- Unlock Button -->
		<div class="sticky bottom-0 border-t border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 pt-4">
			<Button
				variant="primary"
				fullWidth
				on:click={handleUnlock}
				disabled={isUnlocking}
				class="text-lg font-bold shadow-lg"
			>
				{#if isUnlocking}
					<span class="flex items-center justify-center gap-2">
						<span class="loading loading-spinner loading-sm"></span>
						Unlocking...
					</span>
				{:else}
					<span class="flex items-center justify-center gap-2">
						⭐ Unlock Premium for {price}
					</span>
				{/if}
			</Button>

			<p class="mt-2 text-center text-xs text-gray-500">
				30-day money-back guarantee • Secure payment
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
