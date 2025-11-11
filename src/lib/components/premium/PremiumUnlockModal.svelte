<script>
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';
	import { unlockPremiumFeatures, getPremiumFeatures } from '$lib/services/premium/premiumService';
	import { ModalCloseButton } from '$lib/components/modals/index.js';
	import { Button } from '$lib/components/shared';

	export let closeModal = () => {};
	export let feature = null; // Which feature triggered the modal

	const features = getPremiumFeatures();
	const price = 9.00;
	const currency = 'AUD';

	// State management
	let isProcessing = false;
	let paymentSuccess = false;
	let unlockCode = '';
	let errorMessage = '';
	let email = '';

	// Square Web Payments SDK
	let payments = null;
	let card = null;
	let squareLoaded = false;

	/**
	 * Load Square Web Payments SDK
	 */
	async function loadSquareSDK() {
		if (typeof window === 'undefined') return;

		// Check if already loaded
		if (window.Square) {
			squareLoaded = true;
			return;
		}

		// Load Square SDK script
		return new Promise((resolve, reject) => {
			const script = document.createElement('script');
			script.src = 'https://sandbox.web.squarecdn.com/v1/square.js'; // Use sandbox for dev
			script.async = true;
			script.onload = () => {
				squareLoaded = true;
				resolve();
			};
			script.onerror = reject;
			document.head.appendChild(script);
		});
	}

	/**
	 * Initialize Square Payment Form
	 */
	async function initializeSquarePayment() {
		if (!squareLoaded || !window.Square) {
			console.error('Square SDK not loaded');
			return;
		}

		try {
			// Get Square App ID from environment
			const appId = import.meta.env.VITE_SQUARE_APP_ID;

			if (!appId && !dev) {
				throw new Error('Square App ID not configured');
			}

			// In development, use test app ID or skip card initialization
			if (dev && !appId) {
				console.log('🧪 Development mode: Square payment form disabled');
				return;
			}

			payments = window.Square.payments(appId);
			card = await payments.card();
			await card.attach('#card-container');

		} catch (error) {
			console.error('Failed to initialize Square payment:', error);
			errorMessage = 'Failed to load payment form';
		}
	}

	/**
	 * Process payment
	 */
	async function handlePayment() {
		if (isProcessing) return;

		isProcessing = true;
		errorMessage = '';

		try {
			let sourceId;

			// In development without Square setup, use test token
			if (dev && !window.Square) {
				console.log('🧪 Development mode: Using test payment');
				sourceId = 'test-payment-token';
			} else {
				// Tokenize card
				const result = await card.tokenize();

				if (result.status === 'OK') {
					sourceId = result.token;
				} else {
					throw new Error(result.errors?.[0]?.message || 'Payment failed');
				}
			}

			// Send payment to backend
			const response = await fetch('/api/purchase-premium', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sourceId,
					amount: price,
					currency,
					email: email || null
				})
			});

			const data = await response.json();

			if (data.success) {
				// Payment successful!
				unlockCode = data.unlockCode;
				paymentSuccess = true;

				// Unlock premium features locally
				unlockPremiumFeatures();

				// Show success toast
				window.dispatchEvent(
					new CustomEvent('talktype:toast', {
						detail: {
							message: '🎉 Premium unlocked! Save your code for other devices.',
							type: 'success'
						}
					})
				);
			} else {
				throw new Error(data.error || 'Payment failed');
			}

		} catch (error) {
			console.error('Payment error:', error);
			errorMessage = error.message || 'Payment failed. Please try again.';
		} finally {
			isProcessing = false;
		}
	}

	/**
	 * Copy unlock code to clipboard
	 */
	function copyCode() {
		navigator.clipboard.writeText(unlockCode);
		window.dispatchEvent(
			new CustomEvent('talktype:toast', {
				detail: {
					message: '📋 Code copied to clipboard!',
					type: 'success'
				}
			})
		);
	}

	/**
	 * Close modal
	 */
	function handleModalClose() {
		closeModal();
	}

	onMount(async () => {
		// Log which feature triggered the modal
		if (feature) {
			console.log('Premium modal opened for feature:', feature);
		}

		// Load Square SDK
		try {
			await loadSquareSDK();
			await initializeSquarePayment();
		} catch (error) {
			console.error('Square SDK load error:', error);
			// In development, this is okay - we can use test mode
			if (dev) {
				console.log('🧪 Development mode: Square SDK failed, test mode available');
			}
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

		{#if paymentSuccess}
			<!-- Success View - Show Unlock Code -->
			<div class="space-y-6 p-4">
				<div class="text-center">
					<div class="mb-4 flex justify-center">
						<div
							class="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg"
						>
							<span class="text-4xl">🎉</span>
						</div>
					</div>
					<h3 class="mb-2 text-3xl font-black tracking-tight text-gray-800">
						Premium Unlocked!
					</h3>
					<p class="text-lg text-gray-600">
						All features are now available on this device
					</p>
				</div>

				<!-- Unlock Code Display -->
				<div class="rounded-xl border-2 border-green-200 bg-green-50 p-6">
					<h4 class="mb-2 text-center font-bold text-green-800">Your Unlock Code</h4>
					<div class="mb-3 rounded-lg bg-white p-4 text-center">
						<code class="text-2xl font-bold tracking-wider text-gray-800">{unlockCode}</code>
					</div>
					<button
						on:click={copyCode}
						class="btn btn-sm btn-success w-full"
					>
						📋 Copy Code
					</button>
				</div>

				<!-- Instructions -->
				<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
					<h4 class="mb-2 font-bold text-blue-800">💡 Multi-Device Setup</h4>
					<p class="mb-2 text-sm text-gray-700">
						Save this code! You can use it to unlock premium on all your devices.
					</p>
					<ol class="list-decimal space-y-1 pl-5 text-sm text-gray-600">
						<li>Open TalkType on another device</li>
						<li>Click Settings → "Already Premium?"</li>
						<li>Enter this code</li>
					</ol>
				</div>

				<Button
					variant="primary"
					fullWidth
					on:click={handleModalClose}
					class="text-lg font-bold"
				>
					✨ Start Using Premium
				</Button>
			</div>
		{:else}
			<!-- Payment View -->
			<div class="max-h-[calc(85vh-100px)] overflow-y-auto p-4">
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
						One-time payment • <span class="text-2xl">${price} {currency}</span> • Lifetime access
					</p>
				</div>

				<!-- Features Grid -->
				<div class="mb-6">
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
							We hate subscription fatigue! Pay <strong>${price} {currency} once</strong> and keep all features
							forever. Competitors charge $10+/month for the same features - we think that's BS. 🎯
						</p>
					</div>

					<!-- Privacy Message -->
					<div class="mt-3 rounded-lg bg-blue-50/50 p-3">
						<p class="text-xs text-gray-600">
							🔒 <strong>100% Private:</strong> All your transcripts stay on your device. We never see
							or store your data. Payment is secure via Square.
						</p>
					</div>
				</div>

				<!-- Payment Form -->
				<div class="rounded-lg border-2 border-amber-300 bg-white p-4">
					<h4 class="mb-3 font-bold text-gray-800">Payment Details</h4>

					<!-- Email (Optional) -->
					<div class="mb-4">
						<label for="email" class="mb-1 block text-sm font-medium text-gray-700">
							Email (optional - to receive your unlock code)
						</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							placeholder="your@email.com"
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
						/>
					</div>

					<!-- Square Card Container -->
					<div id="card-container" class="mb-4 min-h-[100px]"></div>

					{#if dev && !squareLoaded}
						<div class="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
							🧪 <strong>Development Mode:</strong> Square SDK not loaded. Click "Pay" to generate a test unlock code.
						</div>
					{/if}

					<!-- Error Message -->
					{#if errorMessage}
						<div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
							❌ {errorMessage}
						</div>
					{/if}

					<!-- Pay Button -->
					<Button
						variant="primary"
						fullWidth
						on:click={handlePayment}
						disabled={isProcessing}
						class="text-lg font-bold shadow-lg"
					>
						{#if isProcessing}
							<span class="flex items-center justify-center gap-2">
								<span class="loading loading-spinner loading-sm"></span>
								Processing...
							</span>
						{:else}
							<span class="flex items-center justify-center gap-2">
								💳 Pay ${price} {currency}
							</span>
						{/if}
					</Button>

					<p class="mt-2 text-center text-xs text-gray-500">
						30-day money-back guarantee • Secure payment via Square
					</p>
				</div>
			</div>
		{/if}
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

	/* Square Card Container Styling */
	:global(#card-container iframe) {
		border: 1px solid #e5e7eb !important;
		border-radius: 0.5rem !important;
	}
</style>
