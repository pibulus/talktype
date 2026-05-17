<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { theme, autoRecord, applyTheme, promptStyle, liveMode, privacyMode } from '$lib';
	import { geminiService } from '$lib/services/geminiService';
	import { userPreferences } from '$lib/services/infrastructure/stores';
	import { whisperStatus } from '$lib/services/transcription/whisper/whisperService';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { ModalCloseButton } from './modals/index.js';
	import ThemeSelector from './settings/ThemeSelector.svelte';
	import TranscriptionStyleSelector from './settings/TranscriptionStyleSelector.svelte';
	import { SERVICE_EVENTS } from '$lib/constants';
	import { PRICING } from '$lib/config/pricing.js';

	export let closeModal = () => {};

	// State management
	let selectedVibe;
	let autoRecordValue = false;
	let selectedPromptStyle = 'standard';
	let privacyModeValue = false;
	let liveModeValue = false;
	let isSupporterValue = false;

	// Store unsubscribe functions
	let unsubscribeTheme;
	let unsubscribeAutoRecord;
	let unsubscribePromptStyle;
	let unsubscribeLiveMode;
	let unsubscribePrivacyMode;
	let unsubscribeUserPreferences;

	const transcriptionModes = [
		{
			id: 'live',
			label: 'Live Text',
			description: 'Words appear while you speak'
		},
		{
			id: 'standard',
			label: 'After Stop',
			description: 'Best for style presets'
		},
		{
			id: 'offline',
			label: 'Offline',
			description: 'Private on this device'
		}
	];

	$: transcriptionMode = privacyModeValue ? 'offline' : liveModeValue ? 'live' : 'standard';

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

		unsubscribePrivacyMode = privacyMode.subscribe((value) => {
			privacyModeValue = value === 'true';
		});

		unsubscribeUserPreferences = userPreferences.subscribe((value) => {
			isSupporterValue = value.isSupporter;
		});
	});

	onDestroy(() => {
		// Clean up subscriptions
		if (unsubscribeTheme) unsubscribeTheme();
		if (unsubscribeAutoRecord) unsubscribeAutoRecord();
		if (unsubscribePromptStyle) unsubscribePromptStyle();
		if (unsubscribeLiveMode) unsubscribeLiveMode();
		if (unsubscribePrivacyMode) unsubscribePrivacyMode();
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

	function dispatchSettingChanged(setting, value) {
		if (!browser) return;

		window.dispatchEvent(
			new CustomEvent(SERVICE_EVENTS.SETTINGS.CHANGED, {
				detail: { setting, value }
			})
		);
	}

	function setTranscriptionMode(mode) {
		const nextLiveMode = mode === 'live';
		const nextPrivacyMode = mode === 'offline';

		liveModeValue = nextLiveMode;
		privacyModeValue = nextPrivacyMode;

		liveMode.set(liveModeValue.toString());
		privacyMode.set(privacyModeValue.toString());

		if (selectedPromptStyle !== 'standard' && mode !== 'standard') {
			changePromptStyle('standard');
		}

		dispatchSettingChanged('liveMode', liveModeValue);
		dispatchSettingChanged('privacyMode', privacyModeValue);
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
				label="Close options"
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
					Options
				</h3>
			</div>

			<!-- Options Section -->
			<div class="mb-2 space-y-2">
				<!-- Auto-Record Toggle -->
				<div
					class="mb-2 flex items-center justify-between rounded-xl border border-pink-100 bg-[#fffdf5] p-3 shadow-sm transition-all duration-200 hover:border-pink-200"
				>
					<div>
						<span class="text-base font-medium text-gray-700">Start Recording on Open</span>
						<p class="mt-0.5 text-sm text-gray-500">
							Start recording immediately when you open TalkType
						</p>
					</div>
					<label class="flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
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

				<!-- Transcription Mode Picker -->
				<div
					class="mb-2 rounded-xl border border-pink-100 bg-[#fffdf5] p-3 shadow-sm transition-all duration-200 hover:border-pink-200"
				>
					<span class="text-base font-medium text-gray-700">Transcription Mode</span>
					<div class="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Transcription mode">
						{#each transcriptionModes as mode}
							<button
								type="button"
								class={`flex min-h-[76px] flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition-all duration-200 ${
									transcriptionMode === mode.id
										? 'border-pink-300 bg-pink-50 text-gray-900 shadow-sm ring-2 ring-pink-100'
										: 'border-pink-100 bg-white/70 text-gray-600 hover:border-pink-200 hover:bg-pink-50/60'
								}`}
								aria-pressed={transcriptionMode === mode.id}
								on:click={() => setTranscriptionMode(mode.id)}
							>
								<span class="text-sm font-bold leading-tight">{mode.label}</span>
								<span class="mt-1 text-[11px] font-medium leading-tight text-gray-500">
									{mode.description}
								</span>
							</button>
						{/each}
					</div>
				</div>

				<!-- Download Progress (if loading) -->
				{#if $whisperStatus.isLoading && privacyModeValue}
					<div class="rounded-lg border border-pink-200 bg-pink-50/80 p-2">
						<p class="text-xs font-medium text-pink-700">Getting offline mode ready...</p>
						<div class="mt-1 h-1 overflow-hidden rounded-full bg-pink-100">
							<div
								class="indeterminate-progress h-full w-1/3 bg-gradient-to-r from-pink-300 to-amber-300"
							></div>
						</div>
					</div>
				{/if}

				<!-- Model Loaded Success -->
				{#if $whisperStatus.isLoaded && privacyModeValue}
					<div class="rounded-lg border border-emerald-200 bg-emerald-50/80 p-2">
						<p class="text-xs font-medium text-emerald-700">
							Offline mode is ready on this device.
						</p>
					</div>
				{/if}
			</div>

			<!-- Prompt Style Selection Section -->
			<div class="space-y-2">
				<div>
					<h4 class="text-sm font-bold text-gray-700">Output Style</h4>
					<p class="text-xs text-gray-500">Plain transcription is the default.</p>
				</div>
				<TranscriptionStyleSelector
					{selectedPromptStyle}
					{changePromptStyle}
					{privacyModeValue}
					{liveModeValue}
					isSupporter={isSupporterValue}
					{openSupporterModal}
				/>
			</div>

			<div
				class="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 shadow-sm"
			>
				<div class="flex items-start justify-between gap-4">
					<div class="space-y-1">
						<p class="text-sm font-semibold text-gray-800">Supporter mode</p>
						<p class="text-sm text-gray-600">
							Unlock transcript history, downloads, style presets, and longer sessions.
						</p>
						<p class="text-xs uppercase tracking-[0.18em] text-amber-600">
							{isSupporterValue ? 'Unlocked' : `One-time ${PRICING.displayPrice}`}
						</p>
					</div>
					<button
						class={`btn btn-sm !h-[44px] !min-h-[44px] shrink-0 px-4 ${
							isSupporterValue
								? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
								: 'border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-200'
						}`}
						style="height: 44px; min-height: 44px;"
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
