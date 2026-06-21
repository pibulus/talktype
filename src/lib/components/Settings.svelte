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
	import OutputModeButton from './settings/OutputModeButton.svelte';
	import ThemeSelector from './settings/ThemeSelector.svelte';
	import TranscriptionStyleSelector from './settings/TranscriptionStyleSelector.svelte';
	import { ANIMATION, DEFAULT_THEME, SERVICE_EVENTS } from '$lib/constants';
	import { hapticService } from '$lib/services/infrastructure/hapticService.js';
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
	$: offlineStatusLabel = getOfflineStatusLabel($whisperStatus);
	$: offlineButtonStatus = {
		progress: offlineModelProgress,
		label: offlineStatusLabel,
		statusText: $whisperStatus.statusText,
		visible: showOfflineStatus,
		loading: $whisperStatus.isLoading,
		loaded: $whisperStatus.isLoaded,
		cached: $whisperStatus.isCached,
		error: Boolean($whisperStatus.error)
	};

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

	function getOfflineStatusLabel(status) {
		if (status.error) return 'Retry';
		if (status.isLoaded) return 'Ready';
		if (status.isLoading) return 'Loading';
		if (status.isCached) return 'Saved';
		if (!status.cacheChecked) return 'Checking';
		return 'Local';
	}

	function handleTranscriptionOption(option) {
		soundService.select();
		if (option.id === 'offline') {
			hapticService.select();
		}
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
					Adjust theme, output mode, output style, and recording startup.
				</p>
			</div>

			<section class="settings-section space-y-2" aria-labelledby="settings_theme_title">
				<h4 id="settings_theme_title" class="settings-section-title">Vibe</h4>
				<ThemeSelector
					currentTheme={selectedVibe}
					onThemeChange={changeVibe}
					isSupporter={isSupporterValue}
					{openSupporterModal}
				/>
			</section>

			<!-- Transcription Mode Picker -->
			<section
				class="settings-section space-y-2"
				role="group"
				aria-labelledby="settings_output_mode_title"
			>
				<h4 id="settings_output_mode_title" class="settings-section-title">Output Mode</h4>
				<div class="grid grid-cols-3 gap-2">
					{#each transcriptionModes as mode}
						<OutputModeButton
							{mode}
							selected={transcriptionMode === mode.id}
							offlineStatus={offlineButtonStatus}
							onSelect={handleTranscriptionOption}
						/>
					{/each}
				</div>
			</section>

			{#if transcriptionMode === 'standard'}
				<section class="settings-section space-y-2" aria-labelledby="settings_output_style_title">
					<h4 id="settings_output_style_title" class="settings-section-title">Output Style</h4>
					<TranscriptionStyleSelector
						{selectedPromptStyle}
						{changePromptStyle}
						isSupporter={isSupporterValue}
						{openSupporterModal}
					/>
				</section>
			{/if}

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
	.auto-start-glyph,
	.supporter-glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
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

	.settings-section-title {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 900;
		line-height: 1;
		color: #be185d;
		text-transform: uppercase;
		letter-spacing: 0;
	}
</style>
