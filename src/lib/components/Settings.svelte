<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { theme, autoRecord, applyTheme, promptStyle, liveMode, privacyMode } from '$lib';
	import { geminiService } from '$lib/services/geminiService';
	import { userPreferences } from '$lib/services/infrastructure/stores';
	import { offlineModelController } from '$lib/services/transcription/offlineModelController.js';
	import { whisperStatus } from '$lib/services/transcription/whisper/whisperService';
	import { analytics } from '$lib/services/analytics.js';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { ModalCloseButton } from './modals/index.js';
	import ThemeSelector from './settings/ThemeSelector.svelte';
	import TranscriptionStyleSelector from './settings/TranscriptionStyleSelector.svelte';
	import { ANIMATION, DEFAULT_THEME, SERVICE_EVENTS } from '$lib/constants';
	import { soundService } from '$lib/services/infrastructure/soundService.js';

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
			id: 'standard',
			label: 'After Stop',
			visual: 'standard'
		},
		{
			id: 'live',
			label: 'Live',
			visual: 'live'
		},
		{
			id: 'offline',
			label: 'Offline',
			visual: 'offline'
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
	$: offlineActionLabel = $whisperStatus.error
		? 'Retry'
		: $whisperStatus.isCached
			? 'Load'
			: 'Download';

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
		soundService.select();
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
		const previousMode = transcriptionMode;
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
		if (previousMode !== mode) {
			analytics.modeChanged(mode);
		}
	}

	function getOfflineStatusLabel() {
		if ($whisperStatus.error) return 'Retry';
		if ($whisperStatus.isLoaded) return 'Ready';
		if ($whisperStatus.isLoading) return 'Loading';
		if ($whisperStatus.isCached) return 'Saved';
		if (!$whisperStatus.cacheChecked) return 'Checking';
		return 'Local';
	}

	function prepareOfflineModel() {
		soundService.select();
		if (!privacyModeValue) {
			setTranscriptionMode('offline');
		}
		offlineModelController.startModelLoading();
	}

	function handleTranscriptionOption(option) {
		soundService.select();
		setTranscriptionMode(option.id);
		if (option.id === 'offline') {
			offlineModelController.startModelLoading();
		}
	}

	function handleModalClose() {
		closeModal();
	}

	function openSupporterModal(source = 'settings') {
		if (!browser) return;

		handleModalClose();
		setTimeout(() => {
			window.dispatchEvent(
				new CustomEvent('talktype:open-supporter-modal', {
					detail: { source }
				})
			);
		}, ANIMATION.MODAL.CLOSE_DURATION + 30);
	}
</script>

<dialog
	id="settings_modal"
	class="modal"
	aria-labelledby="settings_modal_title"
	aria-describedby="settings_modal_description"
	aria-modal="true"
>
	<div class="tt-modal-md modal-box relative">
		<form method="dialog">
			<ModalCloseButton
				closeModal={handleModalClose}
				label="Close options"
				position="right-2 top-2"
				modalId="settings_modal"
			/>
		</form>

		<div class="space-y-5">
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
				<p id="settings_modal_description" class="sr-only">
					Adjust vibe, text timing, output style, and recording startup.
				</p>
			</div>

			<ThemeSelector
				currentTheme={selectedVibe}
				onThemeChange={changeVibe}
				isSupporter={isSupporterValue}
				{openSupporterModal}
			/>

			<!-- Transcription Mode Picker -->
			<div class="space-y-2" role="group" aria-label="When text appears">
				<div class="grid grid-cols-3 gap-2">
					{#each transcriptionModes as mode}
						<button
							type="button"
							class={`mode-option flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-center transition-all duration-200 ${
								transcriptionMode === mode.id
									? 'border-pink-300 bg-pink-50 text-gray-900 shadow-sm ring-2 ring-pink-100'
									: 'border-pink-100 bg-white/70 text-gray-600 hover:border-pink-200'
							}`}
							aria-pressed={transcriptionMode === mode.id}
							aria-label={`Set text timing to ${mode.label}`}
							on:click={() => handleTranscriptionOption(mode)}
						>
							<span class="mode-mark mode-mark-{mode.visual}" aria-hidden="true">
								<span></span>
							</span>
							<span class="text-xs font-black leading-tight">{mode.label}</span>
						</button>
					{/each}
				</div>

				{#if showOfflineStatus}
					<div
						class="offline-status offline-status-{offlineStatusTone} flex min-h-12 items-center gap-3 rounded-xl border border-pink-100 bg-white/75 px-3 py-2"
						aria-live="polite"
					>
						<span class="offline-orb" aria-hidden="true"></span>
						<div class="min-w-0 flex-1">
							<span class="block text-xs font-black leading-tight text-gray-700">
								{offlineStatusLabel}
							</span>
							<div
								class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-pink-50 shadow-inner"
								role="progressbar"
								aria-label={$whisperStatus.statusText || 'Downloading offline model'}
								aria-valuemin="0"
								aria-valuemax="100"
								aria-valuenow={offlineModelProgress}
							>
								<div
									class="h-full rounded-full bg-gradient-to-r from-sky-300 via-teal-300 to-violet-300 transition-all duration-300"
									style={`width: ${$whisperStatus.isLoading ? offlineModelProgress : $whisperStatus.isLoaded || $whisperStatus.isCached ? 100 : 14}%;`}
								></div>
							</div>
						</div>
						{#if !$whisperStatus.isLoaded && !$whisperStatus.isLoading}
							<button
								type="button"
								class="min-h-10 shrink-0 rounded-full border border-pink-200 bg-white px-3 py-2 text-xs font-black text-gray-800 shadow-sm transition-colors hover:border-pink-300 hover:bg-pink-50"
								on:click={prepareOfflineModel}
							>
								{offlineActionLabel}
							</button>
						{/if}
					</div>
				{/if}
			</div>

			<TranscriptionStyleSelector
				{selectedPromptStyle}
				{changePromptStyle}
				{privacyModeValue}
				{liveModeValue}
				isSupporter={isSupporterValue}
				{openSupporterModal}
			/>

			<button
				type="button"
				class={`setting-row flex min-h-12 w-full items-center gap-4 rounded-xl border px-4 py-3 text-left shadow-sm transition-all duration-200 ${
					autoRecordValue
						? 'border-pink-300 bg-pink-50 text-gray-900 ring-2 ring-pink-100'
						: 'border-pink-100 bg-white/75 text-gray-700 hover:border-pink-200 hover:bg-pink-50/70'
				}`}
				aria-pressed={autoRecordValue}
				aria-label={`${autoRecordValue ? 'Disable' : 'Enable'} start recording on open`}
				on:click={toggleAutoRecord}
			>
				<span class="flex items-center gap-3">
					<span class="auto-start-glyph {autoRecordValue ? 'is-on' : ''}" aria-hidden="true">
						<span></span>
					</span>
					<span class="block text-sm font-black">Auto Start</span>
				</span>
				<span class="sr-only">{autoRecordValue ? 'On' : 'Off'}</span>
			</button>

			<button
				type="button"
				class="setting-row group flex w-full items-center justify-between gap-4 rounded-xl border border-amber-200 bg-white/75 px-4 py-3 text-left shadow-sm transition-all duration-200 hover:border-amber-300 hover:bg-amber-50/80"
				on:click={() => openSupporterModal('settings')}
			>
				<span class="flex items-center gap-3">
					<span class="supporter-glyph" aria-hidden="true"></span>
					<span class="block text-sm font-black text-gray-800">Supporter</span>
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
		type="button"
		class="modal-backdrop"
		on:click|self|preventDefault|stopPropagation={handleModalClose}
		on:keydown={(e) => e.key === 'Enter' && handleModalClose()}
		aria-label="Close modal"
	></button>
</dialog>

<style>
	.mode-mark,
	.auto-start-glyph,
	.supporter-glyph,
	.offline-orb {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.mode-mark {
		width: 2rem;
		height: 2rem;
		border-radius: 9999px;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 241, 248, 0.9));
		box-shadow:
			inset 0 0 0 1px rgba(244, 114, 182, 0.18),
			0 4px 10px rgba(244, 114, 182, 0.12);
	}

	.mode-mark span {
		display: block;
	}

	.mode-mark-standard span {
		width: 0.85rem;
		height: 0.85rem;
		border-radius: 9999px;
		background: #f59e0b;
		box-shadow: 0 0 0 0.28rem rgba(245, 158, 11, 0.18);
	}

	.mode-mark-live {
		gap: 0.12rem;
	}

	.mode-mark-live::before,
	.mode-mark-live span,
	.mode-mark-live::after {
		content: '';
		width: 0.22rem;
		border-radius: 9999px;
		background: #22c5cf;
	}

	.mode-mark-live::before {
		height: 0.65rem;
		opacity: 0.7;
	}

	.mode-mark-live span {
		height: 1.15rem;
	}

	.mode-mark-live::after {
		height: 0.85rem;
		opacity: 0.8;
	}

	.mode-mark-offline span {
		width: 1rem;
		height: 1rem;
		border-radius: 0.25rem;
		background:
			linear-gradient(45deg, transparent 49%, #8b5cf6 50% 56%, transparent 57%) 0 0 / 100% 100%,
			linear-gradient(135deg, transparent 49%, #8b5cf6 50% 56%, transparent 57%) 0 0 / 100% 100%;
		box-shadow: inset 0 -0.28rem 0 #8b5cf6;
	}

	.offline-orb {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 9999px;
		background: #94a3b8;
		box-shadow: 0 0 0 0.25rem rgba(148, 163, 184, 0.13);
	}

	.offline-status-ready .offline-orb {
		background: #10b981;
		box-shadow: 0 0 0 0.25rem rgba(16, 185, 129, 0.14);
	}

	.offline-status-loading .offline-orb {
		background: #38bdf8;
		animation: offline-breathe 1.8s ease-in-out infinite;
	}

	.offline-status-cached .offline-orb {
		background: #8b5cf6;
		box-shadow: 0 0 0 0.25rem rgba(139, 92, 246, 0.14);
	}

	.offline-status-error .offline-orb {
		background: #ef4444;
		box-shadow: 0 0 0 0.25rem rgba(239, 68, 68, 0.14);
	}

	.auto-start-glyph {
		width: 2rem;
		height: 1.15rem;
		justify-content: flex-start;
		border-radius: 9999px;
		background: #e5e7eb;
		padding: 0.16rem;
		transition:
			background 0.2s ease,
			box-shadow 0.2s ease;
	}

	.auto-start-glyph span {
		width: 0.82rem;
		height: 0.82rem;
		border-radius: 9999px;
		background: white;
		box-shadow: 0 1px 3px rgba(15, 23, 42, 0.18);
		transition: transform 0.2s ease;
	}

	.auto-start-glyph.is-on {
		background: #f9a8d4;
		box-shadow: 0 0 0 0.22rem rgba(249, 168, 212, 0.18);
	}

	.auto-start-glyph.is-on span {
		transform: translateX(0.82rem);
	}

	.supporter-glyph {
		width: 1.65rem;
		height: 1.65rem;
		border-radius: 9999px;
		background:
			radial-gradient(circle at 50% 36%, #fff7c2 0 18%, transparent 20%),
			conic-gradient(from 45deg, #fbbf24, #f472b6, #a78bfa, #fbbf24);
		box-shadow:
			inset 0 0 0 0.18rem rgba(255, 255, 255, 0.78),
			0 4px 10px rgba(245, 158, 11, 0.18);
	}

	.setting-row {
		contain: content;
	}

	@keyframes offline-breathe {
		0%,
		100% {
			box-shadow: 0 0 0 0.22rem rgba(56, 189, 248, 0.14);
			transform: scale(1);
		}
		50% {
			box-shadow: 0 0 0 0.34rem rgba(56, 189, 248, 0.2);
			transform: scale(1.04);
		}
	}
</style>
