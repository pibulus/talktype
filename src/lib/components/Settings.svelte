<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { theme, autoRecord, applyTheme, promptStyle, liveMode, privacyMode } from '$lib';
	import { geminiService } from '$lib/services/geminiService';
	import { userPreferences } from '$lib/services/infrastructure/stores';
	import { offlineModelController } from '$lib/services/transcription/offlineModelController.js';
	import { whisperStatus } from '$lib/services/transcription/whisper/whisperService';
	import { formatStorageBytes } from '$lib/services/transcription/whisper/statusUtils.js';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { ModalCloseButton } from './modals/index.js';
	import ThemeSelector from './settings/ThemeSelector.svelte';
	import TranscriptionStyleSelector from './settings/TranscriptionStyleSelector.svelte';
	import { DEFAULT_THEME, SERVICE_EVENTS } from '$lib/constants';

	export let closeModal = () => {};

	// State management
	let selectedVibe;
	let autoRecordValue = false;
	let selectedPromptStyle = 'standard';
	let privacyModeValue = false;
	let liveModeValue = false;
	let isSupporterValue = false;
	let userPreferencesLoaded = false;

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
			label: 'Live',
			type: 'mode'
		},
		{
			id: 'standard',
			label: 'After Stop',
			type: 'mode'
		},
		{
			id: 'offline',
			label: 'Offline',
			type: 'mode'
		},
		{
			id: 'autoRecord',
			label: 'On Open',
			type: 'toggle'
		}
	];

	function isEnabled(value) {
		return value === true || value === 'true';
	}

	$: transcriptionMode = privacyModeValue ? 'offline' : liveModeValue ? 'live' : 'standard';
	$: offlineModelProgress = Math.max(
		0,
		Math.min(100, Math.round(Number($whisperStatus.progress) || 0))
	);
	$: showOfflineStatus =
		privacyModeValue ||
		$whisperStatus.isLoaded ||
		$whisperStatus.isLoading ||
		$whisperStatus.isCached ||
		$whisperStatus.error;
	$: offlineStatusTone = $whisperStatus.error
		? 'error'
		: $whisperStatus.isLoaded
			? 'ready'
			: $whisperStatus.isLoading
				? 'loading'
				: $whisperStatus.isCached
					? 'cached'
					: 'idle';
	$: offlineStatusLabel = getOfflineStatusLabel();
	$: offlineStatusDetail = getOfflineStatusDetail();
	$: offlineActionLabel = $whisperStatus.error
		? 'Retry'
		: $whisperStatus.isCached
			? 'Load now'
			: 'Download now';
	$: storageUsageLabel = formatStorageBytes($whisperStatus.storageEstimate?.usage);

	$: if (userPreferencesLoaded && !isSupporterValue && selectedVibe === 'rainbow') {
		changeVibe(DEFAULT_THEME);
	}

	onMount(() => {
		// Subscribe to stores only in browser
		unsubscribeTheme = theme.subscribe((value) => {
			selectedVibe = value;
		});

		unsubscribeAutoRecord = autoRecord.subscribe((value) => {
			autoRecordValue = isEnabled(value);
		});

		unsubscribePromptStyle = promptStyle.subscribe((value) => {
			selectedPromptStyle = value;
		});

		unsubscribeLiveMode = liveMode.subscribe((value) => {
			liveModeValue = isEnabled(value);
		});

		unsubscribePrivacyMode = privacyMode.subscribe((value) => {
			privacyModeValue = isEnabled(value);
		});

		unsubscribeUserPreferences = userPreferences.subscribe((value) => {
			isSupporterValue = value.isSupporter;
			userPreferencesLoaded = true;
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

	function getOfflineStatusLabel() {
		if ($whisperStatus.error) return 'Needs retry';
		if ($whisperStatus.isLoaded) return 'Ready';
		if ($whisperStatus.isLoading) return `${offlineModelProgress}%`;
		if ($whisperStatus.isCached) return 'Downloaded';
		if (!$whisperStatus.cacheChecked) return 'Checking';
		return 'Not downloaded';
	}

	function getOfflineStatusDetail() {
		if ($whisperStatus.error) return $whisperStatus.error;
		if ($whisperStatus.isLoaded) return 'Enabled on this device.';
		if ($whisperStatus.isLoading) return $whisperStatus.statusText || 'Downloading offline model';
		if ($whisperStatus.isCached) return 'Saved here, ready to load when Offline is on.';
		if (privacyModeValue) return 'Will download once, then stay here while browser storage keeps it.';
		return 'Download once for local transcription.';
	}

	function getStorageLabel() {
		if ($whisperStatus.storagePersisted === true) return 'Storage saved';
		if ($whisperStatus.storagePersisted === false) return 'Best effort';
		return 'Storage checking';
	}

	function prepareOfflineModel() {
		if (!privacyModeValue) {
			setTranscriptionMode('offline');
		}
		offlineModelController.startModelLoading();
	}

	function isTranscriptionOptionActive(option) {
		if (option.type === 'toggle') return autoRecordValue;

		return transcriptionMode === option.id;
	}

	function handleTranscriptionOption(option) {
		if (option.type === 'toggle') {
			toggleAutoRecord();
			return;
		}

		setTranscriptionMode(option.id);
		if (option.id === 'offline') {
			offlineModelController.startModelLoading();
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
	aria-describedby="settings_modal_description"
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

		<div class="animate-fadeUp space-y-5">
			<!-- Header -->
			<div class="mb-2 flex items-center gap-2">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-full border border-pink-200/60 bg-gradient-to-br from-white to-pink-50 shadow-sm"
				>
					<DisplayGhost width="24px" height="24px" theme={selectedVibe} seed={54321} />
				</div>
				<h3 id="settings_modal_title" class="text-xl font-black tracking-tight text-gray-800">
					Settings
				</h3>
				<p id="settings_modal_description" class="sr-only">
					Adjust vibe, text timing, output style, and recording startup.
				</p>
			</div>

			<!-- Vibe Selector Section -->
			<div class="space-y-2">
				<h4 class="text-sm font-bold text-gray-700">Vibe</h4>
				<ThemeSelector
					currentTheme={selectedVibe}
					onThemeChange={changeVibe}
					isSupporter={isSupporterValue}
					{openSupporterModal}
				/>
			</div>

			<!-- Transcription Mode Picker -->
			<div
				class="rounded-xl border border-pink-100 bg-[#fffdf5] p-3 shadow-sm transition-all duration-200"
			>
				<h4 class="mb-2 text-sm font-bold text-gray-700">When Text Appears</h4>
				<div
					class="grid grid-cols-2 gap-2 sm:grid-cols-4"
					role="group"
					aria-label="Transcription mode"
				>
					{#each transcriptionModes as mode}
						<button
							type="button"
							class={`flex min-h-[56px] items-center justify-center rounded-xl border px-2 py-2 text-center transition-all duration-200 ${
								isTranscriptionOptionActive(mode)
									? 'border-pink-300 bg-pink-50 text-gray-900 shadow-sm ring-2 ring-pink-100'
									: 'border-pink-100 bg-white/70 text-gray-600 hover:border-pink-200'
							}`}
							aria-pressed={isTranscriptionOptionActive(mode)}
							aria-label={mode.id === 'autoRecord'
								? `${autoRecordValue ? 'Disable' : 'Enable'} start listening on open`
								: `Set transcription mode to ${mode.label}`}
							on:click={() => handleTranscriptionOption(mode)}
						>
							<span class="text-sm font-bold leading-tight">{mode.label}</span>
						</button>
					{/each}
				</div>

				{#if showOfflineStatus}
					<div class="mt-3 border-t border-pink-100 pt-3" aria-live="polite">
						<div class="flex items-center justify-between gap-3">
							<div class="min-w-0">
								<div class="text-xs font-black uppercase text-gray-500">Offline Model</div>
								<div class="mt-0.5 text-sm font-bold leading-snug text-gray-800">
									{offlineStatusDetail}
								</div>
							</div>
							<span
								class={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-black ${
									offlineStatusTone === 'ready'
										? 'border-emerald-200 bg-emerald-50 text-emerald-800'
										: offlineStatusTone === 'loading'
											? 'border-sky-200 bg-sky-50 text-sky-800'
											: offlineStatusTone === 'cached'
												? 'border-violet-200 bg-violet-50 text-violet-800'
												: offlineStatusTone === 'error'
													? 'border-red-200 bg-red-50 text-red-800'
													: 'border-gray-200 bg-white text-gray-600'
								}`}
							>
								{offlineStatusLabel}
							</span>
						</div>

						{#if $whisperStatus.isLoading}
							<div
								class="mt-3 h-2 overflow-hidden rounded-full bg-white shadow-inner"
								role="progressbar"
								aria-label={$whisperStatus.statusText || 'Downloading offline model'}
								aria-valuemin="0"
								aria-valuemax="100"
								aria-valuenow={offlineModelProgress}
							>
								<div
									class="h-full rounded-full bg-gradient-to-r from-sky-300 via-teal-300 to-violet-300 transition-all duration-300"
									style={`width: ${offlineModelProgress}%;`}
								></div>
							</div>
						{/if}

						<div class="mt-3 flex flex-wrap items-center gap-2">
							<span
								class="rounded-full border border-pink-100 bg-white/80 px-2.5 py-1 text-xs font-bold text-gray-600"
							>
								{getStorageLabel()}
							</span>
							{#if storageUsageLabel}
								<span
									class="rounded-full border border-pink-100 bg-white/80 px-2.5 py-1 text-xs font-bold text-gray-600"
								>
									{storageUsageLabel} used
								</span>
							{/if}
							{#if !$whisperStatus.isLoaded && !$whisperStatus.isLoading}
								<button
									type="button"
									class="ml-auto min-h-10 rounded-full border border-pink-200 bg-white px-4 py-2 text-xs font-black text-gray-800 shadow-sm transition-colors hover:border-pink-300 hover:bg-pink-50"
									on:click={prepareOfflineModel}
								>
									{offlineActionLabel}
								</button>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<!-- Prompt Style Selection Section -->
			<div class="space-y-2">
				<h4 class="text-sm font-bold text-gray-700">Style</h4>
				<TranscriptionStyleSelector
					{selectedPromptStyle}
					{changePromptStyle}
					{privacyModeValue}
					{liveModeValue}
					isSupporter={isSupporterValue}
					{openSupporterModal}
				/>
			</div>

			<button
				type="button"
				class="group flex w-full items-center justify-between gap-4 rounded-xl border border-amber-200 bg-white/75 px-4 py-3 text-left shadow-sm transition-all duration-200 hover:border-amber-300 hover:bg-amber-50/80"
				on:click={openSupporterModal}
			>
				<span>
					<span class="block text-sm font-bold text-gray-800">
						{isSupporterValue ? 'Supporter Mode' : 'Unlock Supporter Mode'}
					</span>
					<span class="mt-1 block text-xs leading-5 text-gray-600">
						History, longer recordings, custom transcription, sync across devices.
					</span>
				</span>
				<span
					class="shrink-0 rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 transition-colors group-hover:bg-amber-200"
				>
					{isSupporterValue ? 'Open' : 'Unlock'}
				</span>
			</button>
		</div>
	</div>

	<button
		class="modal-backdrop bg-pink-950/40"
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
