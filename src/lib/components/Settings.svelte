<script>
	import { onMount } from 'svelte';
	import { theme, autoRecord, applyTheme, promptStyle } from '$lib';
	import { geminiService } from '$lib/services/geminiService';
	import { installPromptEvent } from '$lib/stores/pwa';
	import { whisperStatus } from '$lib/services/transcription/whisper/whisperService';
	import { isPremium, unlockPremiumFeatures, getUnlockCode } from '$lib/services/premium/premiumService';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { ModalCloseButton } from './modals/index.js';
	import ThemeSelector from './settings/ThemeSelector.svelte';
	import TranscriptionStyleSelector from './settings/TranscriptionStyleSelector.svelte';
	import { STORAGE_KEYS, SERVICE_EVENTS } from '$lib/constants';
	import { PRICING } from '$lib/config/pricing';

	export let closeModal = () => {};

	// State management
	let selectedVibe;
	let autoRecordValue = false;
	let selectedPromptStyle = 'standard';
	let privacyModeValue = false;

	// Unlock code state
	let showCodeEntry = false;
	let unlockCode = '';
	let codeError = '';
	let codeValidating = false;
	let showMyCode = false;
	let myUnlockCode = '';

	// Store subscriptions
	const unsubscribeTheme = theme.subscribe((value) => {
		selectedVibe = value;
	});

	const unsubscribeAutoRecord = autoRecord.subscribe((value) => {
		autoRecordValue = value === 'true';
	});

	const unsubscribePromptStyle = promptStyle.subscribe((value) => {
		selectedPromptStyle = value;
	});

	onMount(() => {
		// Get currently selected prompt style from the service
		selectedPromptStyle = geminiService.getPromptStyle();

		// Get privacy mode value from localStorage
		privacyModeValue = localStorage.getItem(STORAGE_KEYS.PRIVACY_MODE) === 'true';

		// Clean up subscriptions on component destroy
		return () => {
			unsubscribeTheme();
			unsubscribeAutoRecord();
			unsubscribePromptStyle();
		};
	});

	// Handlers
	function changeVibe(vibeId) {
		selectedVibe = vibeId;
		applyTheme(vibeId);
		window.dispatchEvent(
			new CustomEvent('talktype-setting-changed', {
				detail: { setting: 'theme', value: vibeId }
			})
		);
	}

	function changePromptStyle(style) {
		selectedPromptStyle = style;
		geminiService.setPromptStyle(style);
		promptStyle.set(style);
		window.dispatchEvent(
			new CustomEvent('talktype-setting-changed', {
				detail: { setting: 'promptStyle', value: style }
			})
		);
	}

	function toggleAutoRecord() {
		autoRecordValue = !autoRecordValue;
		autoRecord.set(autoRecordValue.toString());
		window.dispatchEvent(
			new CustomEvent('talktype-setting-changed', {
				detail: { setting: 'autoRecord', value: autoRecordValue }
			})
		);
	}

	function togglePrivacyMode() {
		privacyModeValue = !privacyModeValue;
		localStorage.setItem(STORAGE_KEYS.PRIVACY_MODE, privacyModeValue.toString());
		window.dispatchEvent(
			new CustomEvent(SERVICE_EVENTS.SETTINGS.CHANGED, {
				detail: { setting: 'privacyMode', value: privacyModeValue }
			})
		);
	}

	async function handleInstallClick() {
		if ($installPromptEvent) {
			try {
				$installPromptEvent.prompt();
				const { outcome } = await $installPromptEvent.userChoice;
				if (outcome === 'accepted') {
					$installPromptEvent = null;
				}
			} catch (err) {
				console.error('Install failed:', err);
			}
		}
	}

	function handleModalClose() {
		closeModal();
	}

	function toggleCodeEntry() {
		showCodeEntry = !showCodeEntry;
		unlockCode = '';
		codeError = '';
	}

	async function validateUnlockCode() {
		if (!unlockCode.trim()) {
			codeError = 'Please enter an unlock code';
			return;
		}

		codeValidating = true;
		codeError = '';

		try {
			const response = await fetch('/api/validate-code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code: unlockCode.trim() })
			});

			const data = await response.json();

			if (data.valid) {
				// Code is valid - unlock premium and save the code!
				unlockPremiumFeatures(data.unlockDate, unlockCode.trim());

				// Show success message
				window.dispatchEvent(
					new CustomEvent('talktype:toast', {
						detail: {
							message: '🎉 Premium unlocked successfully!',
							type: 'success'
						}
					})
				);

				// Reset form
				showCodeEntry = false;
				unlockCode = '';
			} else {
				codeError = data.error || 'Invalid unlock code';
			}
		} catch (error) {
			console.error('Code validation error:', error);
			codeError = 'Failed to validate code. Please try again.';
		} finally {
			codeValidating = false;
		}
	}

	function toggleMyCode() {
		showMyCode = !showMyCode;
		if (showMyCode) {
			myUnlockCode = getUnlockCode() || 'No code saved';
		}
	}

	function copyMyCode() {
		const code = getUnlockCode();
		if (code) {
			navigator.clipboard.writeText(code);
			window.dispatchEvent(
				new CustomEvent('talktype:toast', {
					detail: {
						message: '📋 Code copied to clipboard!',
						type: 'success'
					}
				})
			);
		}
	}
</script>

<dialog
	id="settings_modal"
	class="modal fixed z-50"
	style="overflow: hidden !important; z-index: 999;"
	aria-labelledby="settings_modal_title"
	aria-modal="true"
>
	<div
		class="animate-modal-enter modal-box relative max-h-[80vh] w-[95%] max-w-md overflow-y-auto rounded-2xl border border-pink-200 bg-gradient-to-br from-[#fffaef] to-[#fff6e6] shadow-xl md:max-w-lg"
	>
		<form method="dialog">
			<ModalCloseButton
				closeModal={handleModalClose}
				label="Close settings"
				position="right-2 top-2"
				modalId="settings_modal"
			/>
		</form>

		<div class="animate-fadeUp space-y-4">
			<!-- Header -->
			<div class="mb-1 flex items-center gap-2">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-full border border-pink-200/60 bg-gradient-to-br from-white to-pink-50 shadow-sm"
				>
					<DisplayGhost width="24px" height="24px" theme={selectedVibe} seed={54321} />
				</div>
				<h3 id="settings_modal_title" class="text-xl font-black tracking-tight text-gray-800">
					Settings
				</h3>
			</div>

			<!-- Settings Section -->
			<div class="mb-2 space-y-2">
				<h4 class="text-sm font-bold text-gray-700">Settings</h4>

				<!-- Auto-Record Toggle -->
				<div
					class="mb-2 flex items-center justify-between rounded-xl border border-pink-100 bg-[#fffdf5] p-2 shadow-sm transition-all duration-200 hover:border-pink-200"
				>
					<div>
						<span class="text-sm font-medium text-gray-700">Auto-Record on Start</span>
						<p class="mt-0.5 text-xs text-gray-500">
							Start recording immediately when you open TalkType
						</p>
					</div>
					<label class="flex cursor-pointer items-center">
						<span class="sr-only"
							>Auto-Record Toggle {autoRecordValue ? 'Enabled' : 'Disabled'}</span
						>
						<div class="relative">
							<input
								type="checkbox"
								class="sr-only"
								checked={autoRecordValue}
								on:change={toggleAutoRecord}
							/>
							<div
								class={`h-5 w-10 rounded-full ${autoRecordValue ? 'bg-pink-400' : 'bg-gray-200'} transition-all duration-200`}
							></div>
							<div
								class={`absolute left-0.5 top-0.5 h-4 w-4 transform rounded-full bg-white transition-all duration-200 ${autoRecordValue ? 'translate-x-5' : ''}`}
							></div>
						</div>
					</label>
				</div>

				<!-- Privacy Mode Toggle -->
				<div
					class="mb-2 flex items-center justify-between rounded-xl border border-pink-100 bg-[#fffdf5] p-2 shadow-sm transition-all duration-200 hover:border-pink-200"
				>
					<div>
						<span class="text-sm font-medium text-gray-700">🔒 Offline Mode</span>
						<p class="mt-0.5 text-xs text-gray-500">
							Download Whisper model for completely private transcription
						</p>
					</div>
					<label class="flex cursor-pointer items-center">
						<span class="sr-only"
							>Privacy Mode Toggle {privacyModeValue ? 'Enabled' : 'Disabled'}</span
						>
						<div class="relative">
							<input
								type="checkbox"
								class="sr-only"
								checked={privacyModeValue}
								on:change={togglePrivacyMode}
							/>
							<div
								class={`h-5 w-10 rounded-full ${privacyModeValue ? 'bg-purple-400' : 'bg-gray-200'} transition-all duration-200`}
							></div>
							<div
								class={`absolute left-0.5 top-0.5 h-4 w-4 transform rounded-full bg-white transition-all duration-200 ${privacyModeValue ? 'translate-x-5' : ''}`}
							></div>
						</div>
					</label>
				</div>

				<!-- Download Progress (if loading) -->
				{#if $whisperStatus.isLoading && privacyModeValue}
					<div class="rounded-lg border border-blue-200 bg-blue-50/80 p-2">
						<p class="text-xs font-medium text-blue-700">📥 Downloading model...</p>
						<div class="mt-1 h-1 overflow-hidden rounded-full bg-blue-200">
							<div
								class="indeterminate-progress h-full w-1/3 bg-gradient-to-r from-blue-400 to-blue-600"
							></div>
						</div>
					</div>
				{/if}

				<!-- Model Loaded Success -->
				{#if $whisperStatus.isLoaded && privacyModeValue}
					<div class="rounded-lg border border-green-200 bg-green-50/80 p-2">
						<p class="text-xs font-medium text-green-700">
							✅ Offline model ready! Completely private.
						</p>
					</div>
				{/if}
			</div>

			<!-- Vibe Selector Section -->
			<div class="space-y-2">
				<h4 class="text-sm font-bold text-gray-700">Choose Your Vibe</h4>
				<ThemeSelector currentTheme={selectedVibe} onThemeChange={changeVibe} />
			</div>

			<!-- Prompt Style Selection Section -->
			<TranscriptionStyleSelector {selectedPromptStyle} {changePromptStyle} />

			<!-- Premium Features Section (if premium) OR Upsell (if free) -->
			{#if $isPremium}
				<!-- Premium User - Show Active Features -->
				<div
					class="space-y-2 rounded-lg border border-green-200 bg-gradient-to-r from-green-50/50 to-emerald-50/50 p-3 shadow-sm"
				>
					<div class="flex items-center justify-between">
						<h4 class="text-sm font-bold text-gray-700">Premium Features</h4>
						<span class="badge badge-sm gap-1 border-green-300 bg-green-100 font-medium text-green-700">
							<span class="text-[10px]">✓</span> Active
						</span>
					</div>

					<div class="space-y-1.5 pt-1 text-xs text-gray-600">
						<div class="flex items-center gap-1.5">
							<span class="text-green-600">✓</span>
							<span>10-minute recordings (vs 60s free)</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="text-green-600">✓</span>
							<span>Premium themes (Mint, Bubblegum, Rainbow)</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="text-green-600">✓</span>
							<span>Custom transcription prompts</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="text-green-600">✓</span>
							<span>Save transcripts + audio to history</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="text-green-600">✓</span>
							<span>Batch download & export</span>
						</div>
					</div>

					<!-- View My Code Button -->
					<div class="pt-2">
						<button
							class="text-xs text-gray-600 hover:text-gray-800 underline"
							on:click={toggleMyCode}
						>
							{showMyCode ? '← Hide Code' : '🔑 View My Unlock Code'}
						</button>

						{#if showMyCode}
							<div class="mt-2 space-y-2 rounded-lg border border-green-300 bg-green-50 p-3">
								<p class="text-xs font-medium text-gray-700">Your Unlock Code:</p>
								<div class="rounded bg-white p-2 text-center">
									<code class="text-sm font-bold tracking-wider text-gray-800">{myUnlockCode}</code>
								</div>
								{#if myUnlockCode !== 'No code saved'}
									<button
										class="btn btn-xs w-full border-green-400 bg-green-100 hover:bg-green-200"
										on:click={copyMyCode}
									>
										📋 Copy Code
									</button>
									<p class="text-xs text-gray-500 text-center">
										Use this code to unlock on other devices
									</p>
								{/if}
							</div>
						{/if}
					</div>

					<div class="pt-1 text-center">
						<span class="text-xs italic text-gray-500">Thank you for supporting TalkType! 💜</span>
					</div>
				</div>
			{:else}
				<!-- Free User - Show Upgrade Option -->
				<div
					class="space-y-2 rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50/50 to-orange-50/50 p-3 shadow-sm"
				>
					<div class="flex items-center justify-between">
						<h4 class="text-sm font-bold text-gray-700">Unlock Premium</h4>
						<span class="badge badge-sm gap-1 border-amber-300 bg-amber-100 font-medium text-amber-700">
							{#if PRICING.hasDiscount}
								<span class="text-[10px]">🎉</span> ${PRICING.currentPrice}
								<span class="text-[9px] line-through opacity-60">${PRICING.basePrice}</span>
							{:else}
								<span class="text-[10px]">⭐</span> ${PRICING.currentPrice} Once
							{/if}
						</span>
					</div>

					<div class="space-y-1.5 pt-1 text-xs text-gray-600">
						<div class="flex items-center gap-1.5">
							<span class="text-amber-600">⭐</span>
							<span>10-minute recordings (10x longer!)</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="text-amber-600">⭐</span>
							<span>Premium ghost themes</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="text-amber-600">⭐</span>
							<span>Custom transcription styles</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="text-amber-600">⭐</span>
							<span>Save & edit transcript history</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="text-amber-600">⭐</span>
							<span>Batch download everything</span>
						</div>
					</div>

					<button
						class="btn btn-sm mt-2 w-full border-none bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600"
						on:click={() => {
							handleModalClose();
							setTimeout(() => {
								document.getElementById('premium_modal')?.showModal();
							}, 100);
						}}
					>
						{#if PRICING.hasDiscount}
							🎉 Get Launch Special - ${PRICING.currentPrice}!
						{:else}
							⭐ Unlock for ${PRICING.currentPrice} (One-Time)
						{/if}
					</button>

					<!-- Already Premium? Enter Code -->
					<div class="pt-2">
						<button
							class="text-xs text-gray-600 hover:text-gray-800 underline"
							on:click={toggleCodeEntry}
						>
							{showCodeEntry ? '← Back' : '🔑 Already Premium? Enter Code'}
						</button>

						{#if showCodeEntry}
							<div class="mt-2 space-y-2 rounded-lg border border-gray-300 bg-white p-3">
								<label for="unlock-code" class="block text-xs font-medium text-gray-700">
									Enter your unlock code
								</label>
								<input
									id="unlock-code"
									type="text"
									bind:value={unlockCode}
									placeholder="TALK-XXXX-XXXX"
									class="w-full rounded border border-gray-300 px-2 py-1 text-sm uppercase focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-200"
									on:keydown={(e) => e.key === 'Enter' && validateUnlockCode()}
								/>

								{#if codeError}
									<p class="text-xs text-red-600">❌ {codeError}</p>
								{/if}

								<button
									class="btn btn-sm w-full border-amber-400 bg-amber-50 hover:bg-amber-100"
									on:click={validateUnlockCode}
									disabled={codeValidating}
								>
									{#if codeValidating}
										<span class="flex items-center justify-center gap-1">
											<span class="loading loading-spinner loading-xs"></span>
											Validating...
										</span>
									{:else}
										✓ Validate Code
									{/if}
								</button>

								<p class="text-xs text-gray-500 text-center">
									Code works on all your devices
								</p>
							</div>
						{/if}
					</div>

					{#if !showCodeEntry}
						<div class="text-center">
							<span class="text-xs italic text-gray-500">vs $10+/month subscriptions elsewhere</span>
						</div>
					{/if}
				</div>
			{/if}

			<!-- PWA Install (if available) -->
			{#if $installPromptEvent}
				<div class="space-y-2">
					<h4 class="text-sm font-bold text-gray-700">Install App</h4>
					<button
						class="btn btn-sm w-full border border-pink-200 bg-pink-50 hover:bg-pink-100"
						on:click={handleInstallClick}
					>
						📦 Install TalkType
					</button>
				</div>
			{/if}

			<!-- Footer -->
			<div class="border-t border-pink-100 pt-2 text-center">
				<p class="text-xs text-gray-500">TalkType • Made with 💜 by Dennis & Pablo</p>
			</div>
		</div>
	</div>

	<button
		class="modal-backdrop bg-black/40"
		on:click|self|preventDefault|stopPropagation={() => {
			const modal = document.getElementById('settings_modal');
			if (modal) {
				modal.close();
				setTimeout(handleModalClose, 50);
			}
		}}
		on:keydown={(e) => e.key === 'Enter' && handleModalClose()}
		aria-label="Close modal"
	></button>
</dialog>

<style>
	.animate-fadeUp {
		animation: fadeUp 0.5s cubic-bezier(0.19, 1, 0.22, 1) forwards;
	}

	.animate-modal-enter {
		animation: modalSlideUp 0.3s ease-out;
	}

	@keyframes fadeUp {
		0% {
			opacity: 0;
			transform: translateY(8px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
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

	/* Indeterminate progress bar animation */
	.indeterminate-progress {
		animation: indeterminate 1.5s ease-in-out infinite;
	}

	@keyframes indeterminate {
		0% {
			transform: translateX(-100%);
		}
		50% {
			transform: translateX(0%);
		}
		100% {
			transform: translateX(100%);
		}
	}
</style>
