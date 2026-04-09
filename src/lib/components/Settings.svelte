<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { theme, autoRecord, applyTheme, promptStyle, liveMode } from '$lib';
	import { geminiService } from '$lib/services/geminiService';
	import { userPreferences } from '$lib/services/infrastructure/stores';
	import { installPromptEvent, isPwaInstalled } from '$lib/stores/pwa';
	import { whisperStatus } from '$lib/services/transcription/whisper/whisperService';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { ModalCloseButton } from './modals/index.js';
	import PwaInstall from '$lib/components/pwa/PwaInstall.svelte';
	import ThemeSelector from './settings/ThemeSelector.svelte';
	import TranscriptionStyleSelector from './settings/TranscriptionStyleSelector.svelte';
	import { STORAGE_KEYS, SERVICE_EVENTS } from '$lib/constants';
	import { analytics } from '$lib/services/analytics';

	export let closeModal = () => {};

	// State management
	let selectedVibe;
	let autoRecordValue = false;
	let selectedPromptStyle = 'standard';
	let privacyModeValue = false;
	let liveModeValue = false;
	let isSupporterValue = false;

	let pwaInstallComponent;

	// Store unsubscribe functions
	let unsubscribeTheme;
	let unsubscribeAutoRecord;
	let unsubscribePromptStyle;
	let unsubscribeLiveMode;
	let unsubscribeUserPreferences;

	onMount(() => {
		// Subscribe to stores only in browser
		unsubscribeTheme = theme.subscribe((value) => {
			selectedVibe = value;
		});

		unsubscribeAutoRecord = autoRecord.subscribe((value) => {
			autoRecordValue = value === 'true';
		});

		unsubscribePromptStyle = promptStyle.subscribe((value) => {
			selectedPromptStyle = value;
		});

		unsubscribeLiveMode = liveMode.subscribe((value) => {
			liveModeValue = value === 'true';
		});

		unsubscribeUserPreferences = userPreferences.subscribe((value) => {
			isSupporterValue = value.isSupporter;
		});

		// Get privacy mode value from localStorage (browser only)
		if (browser) {
			privacyModeValue = localStorage.getItem(STORAGE_KEYS.PRIVACY_MODE) === 'true';
		}
	});

	onDestroy(() => {
		// Clean up subscriptions
		if (unsubscribeTheme) unsubscribeTheme();
		if (unsubscribeAutoRecord) unsubscribeAutoRecord();
		if (unsubscribePromptStyle) unsubscribePromptStyle();
		if (unsubscribeLiveMode) unsubscribeLiveMode();
		if (unsubscribeUserPreferences) unsubscribeUserPreferences();
	});

	// Handlers
	function changeVibe(vibeId) {
		selectedVibe = vibeId;
		applyTheme(vibeId);
		if (browser) {
			window.dispatchEvent(
				new CustomEvent('talktype-setting-changed', {
					detail: { setting: 'theme', value: vibeId }
				})
			);
		}
	}

	function changePromptStyle(style) {
		selectedPromptStyle = style;
		geminiService.setPromptStyle(style);
		promptStyle.set(style);
		userPreferences.update((prefs) => ({ ...prefs, promptStyle: style }));
		if (browser) {
			window.dispatchEvent(
				new CustomEvent('talktype-setting-changed', {
					detail: { setting: 'promptStyle', value: style }
				})
			);
		}
	}

	function toggleAutoRecord() {
		autoRecordValue = !autoRecordValue;
		autoRecord.set(autoRecordValue.toString());
		if (browser) {
			window.dispatchEvent(
				new CustomEvent('talktype-setting-changed', {
					detail: { setting: 'autoRecord', value: autoRecordValue }
				})
			);
		}
	}

	function togglePrivacyMode() {
		privacyModeValue = !privacyModeValue;
		if (browser) {
			localStorage.setItem(STORAGE_KEYS.PRIVACY_MODE, privacyModeValue.toString());
			window.dispatchEvent(
				new CustomEvent(SERVICE_EVENTS.SETTINGS.CHANGED, {
					detail: { setting: 'privacyMode', value: privacyModeValue }
				})
			);
		}
	}

	function toggleLiveMode() {
		liveModeValue = !liveModeValue;
		liveMode.set(liveModeValue.toString());
		if (browser) {
			window.dispatchEvent(
				new CustomEvent('talktype-setting-changed', {
					detail: { setting: 'liveMode', value: liveModeValue }
				})
			);
		}
	}

	async function handleInstallClick() {
		if ($installPromptEvent) {
			try {
				$installPromptEvent.prompt();
				const { outcome } = await $installPromptEvent.userChoice;
				analytics.installPWA(outcome);
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

	function openSupporterModal() {
		if (!browser) return;

		handleModalClose();
		setTimeout(() => {
			window.dispatchEvent(new CustomEvent('talktype:open-supporter-modal'));
		}, 75);
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
		class="animate-modal-enter modal-box relative max-h-[85vh] w-[92%] max-w-md overflow-y-auto rounded-2xl border border-pink-200 bg-gradient-to-br from-[#fffaef] to-[#fff6e6] shadow-xl md:max-w-lg"
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
				<!-- Auto-Record Toggle -->
				<div
					class="mb-2 flex items-center justify-between rounded-xl border border-pink-100 bg-[#fffdf5] p-3 shadow-sm transition-all duration-200 hover:border-pink-200"
				>
					<div>
						<span class="text-base font-medium text-gray-700">Auto-Record on Start</span>
						<p class="mt-0.5 text-sm text-gray-500">
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
								class={`h-6 w-11 rounded-full ${autoRecordValue ? 'bg-pink-400' : 'bg-gray-200'} transition-all duration-200`}
							></div>
							<div
								class={`absolute left-0.5 top-0.5 h-5 w-5 transform rounded-full bg-white transition-all duration-200 ${autoRecordValue ? 'translate-x-5' : ''}`}
							></div>
						</div>
					</label>
				</div>

				<!-- Privacy Mode Toggle -->
				<div
					class="mb-2 flex items-center justify-between rounded-xl border border-pink-100 bg-[#fffdf5] p-3 shadow-sm transition-all duration-200 hover:border-pink-200"
				>
					<div>
						<span class="text-base font-medium text-gray-700">Offline Mode</span>
						<p class="mt-0.5 text-sm text-gray-500">
							Completely private transcription on your device
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
								class={`h-6 w-11 rounded-full ${privacyModeValue ? 'bg-purple-400' : 'bg-gray-200'} transition-all duration-200`}
							></div>
							<div
								class={`absolute left-0.5 top-0.5 h-5 w-5 transform rounded-full bg-white transition-all duration-200 ${privacyModeValue ? 'translate-x-5' : ''}`}
							></div>
						</div>
					</label>
				</div>

				<!-- Live Mode Toggle -->
				<div
					class="mb-2 flex items-center justify-between rounded-xl border border-pink-100 bg-[#fffdf5] p-3 shadow-sm transition-all duration-200 hover:border-pink-200"
				>
					<div>
						<span class="text-base font-medium text-gray-700">Live Mode</span>
						<p class="mt-0.5 text-sm text-gray-500">See text appear as you speak</p>
					</div>
					<label class="flex cursor-pointer items-center">
						<span class="sr-only">Live Mode Toggle {liveModeValue ? 'Enabled' : 'Disabled'}</span>
						<div class="relative">
							<input
								type="checkbox"
								class="sr-only"
								checked={liveModeValue}
								on:change={toggleLiveMode}
							/>
							<div
								class={`h-6 w-11 rounded-full ${liveModeValue ? 'bg-blue-400' : 'bg-gray-200'} transition-all duration-200`}
							></div>
							<div
								class={`absolute left-0.5 top-0.5 h-5 w-5 transform rounded-full bg-white transition-all duration-200 ${liveModeValue ? 'translate-x-5' : ''}`}
							></div>
						</div>
					</label>
				</div>

				<!-- Install App Button - COMMENTED OUT FOR NOW
				{#if !$isPwaInstalled}
					<div
						class="mb-2 flex items-center justify-between rounded-xl border border-pink-100 bg-[#fffdf5] p-3 shadow-sm transition-all duration-200 hover:border-pink-200"
					>
						<div>
							<span class="text-base font-medium text-gray-700">Keep TalkType Close</span>
							<p class="mt-0.5 text-sm text-gray-500">Save to your Home Screen</p>
						</div>
						<button
							class="btn btn-sm border-pink-200 bg-pink-50 text-pink-600 hover:bg-pink-100"
							on:click={() => {
								if (pwaInstallComponent) {
									analytics.viewInstallModal('pwa-install-component');
									pwaInstallComponent.showDialog();
								}
							}}
						>
							Tap to Save
						</button>
					</div>
				{/if}
				-->

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

			<div
				class="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 shadow-sm"
			>
				<div class="flex items-start justify-between gap-4">
					<div class="space-y-1">
						<p class="text-sm font-semibold text-gray-800">Supporter mode</p>
						<p class="text-sm text-gray-600">
							Unlock transcript history, downloads, custom prompts, and longer sessions.
						</p>
						<p class="text-xs uppercase tracking-[0.18em] text-amber-600">
							{isSupporterValue ? 'Unlocked' : 'One-time $9'}
						</p>
					</div>
					<button
						class={`btn btn-sm shrink-0 ${
							isSupporterValue
								? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
								: 'border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-200'
						}`}
						on:click={openSupporterModal}
					>
						{isSupporterValue ? 'Manage' : 'Unlock'}
					</button>
				</div>
			</div>

			<!-- Vibe Selector Section -->
			<div class="space-y-2">
				<h4 class="text-sm font-bold text-gray-700">Choose Your Vibe</h4>
				<ThemeSelector currentTheme={selectedVibe} onThemeChange={changeVibe} />
			</div>

			<!-- Prompt Style Selection Section -->
			<div class="space-y-2">
				<h4 class="text-sm font-bold text-gray-700">Choose Transcription Style</h4>
				<TranscriptionStyleSelector
					{selectedPromptStyle}
					{changePromptStyle}
					{privacyModeValue}
					{liveModeValue}
					isSupporter={isSupporterValue}
					{openSupporterModal}
				/>
			</div>
		</div>
	</div>

	<button
		class="modal-backdrop bg-black/40"
		on:click|self|preventDefault|stopPropagation={() => {
			if (browser) {
				const modal = document.getElementById('settings_modal');
				if (modal) {
					modal.close();
					setTimeout(handleModalClose, 50);
				}
			}
		}}
		on:keydown={(e) => e.key === 'Enter' && handleModalClose()}
		aria-label="Close modal"
	></button>
</dialog>

<!-- PWA Install Component -->
<PwaInstall bind:this={pwaInstallComponent} />

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
