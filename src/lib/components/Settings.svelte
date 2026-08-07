<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import {
		theme,
		autoRecord,
		applyTheme,
		promptStyle,
		liveMode,
		privacyMode,
		soundEnabled
	} from '$lib';
	import { userPreferences } from '$lib/services/infrastructure/stores';
	import { whisperStatus } from '$lib/services/transcription/whisper/whisperService';
	import { formatStorageBytes } from '$lib/services/transcription/whisper/statusUtils.js';
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

	// Custom vocabulary — names/words the ghost should always get right.
	// Applied as fuzzy post-processing on every transcription path.

	// Store unsubscribe functions
	let unsubscribeTheme;
	let unsubscribeAutoRecord;
	let unsubscribePromptStyle;
	let unsubscribeLiveMode;
	let unsubscribePrivacyMode;
	let unsubscribeUserPreferences;

	// Auto Start cannot work in a mobile browser tab — the mic needs a user
	// gesture, so the toggle would promise something it can never deliver.
	// Desktop and installed PWAs can honour it.
	let canAutoStart = false;
	onMount(() => {
		const standalone =
			window.matchMedia?.('(display-mode: standalone)').matches === true ||
			navigator.standalone === true;
		const desktop = window.matchMedia?.('(pointer: fine)').matches === true;
		canAutoStart = standalone || desktop;
	});

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

	// Offline on/off. Off returns to the standard cloud path — the app decides
	// which engine that is; the user is not asked to pick a vendor.
	function toggleOffline() {
		setTranscriptionMode(transcriptionMode === 'offline' ? 'standard' : 'offline');
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
		// Not downloaded yet. Tapping this pulls ~96 MB, possibly over mobile
		// data — say what it costs instead of a shrug labelled "Local".
		return formatStorageBytes(status.selectedModelSize) || 'Local';
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

			<section class="settings-section space-y-2" aria-labelledby="settings_output_style_title">
				<h4 id="settings_output_style_title" class="settings-section-title">Output Style</h4>
				<TranscriptionStyleSelector
					{selectedPromptStyle}
					{changePromptStyle}
					isSupporter={isSupporterValue}
					{openSupporterModal}
				/>
			</section>

			<!-- Offline is the only engine choice a person can actually reason about:
			     it is about privacy and signal, not about which vendor transcribes. -->
			<button
				type="button"
				class={`setting-row flex min-h-12 w-full items-center gap-4 rounded-xl border px-4 py-3 text-left shadow-sm transition-all duration-200 ${
					transcriptionMode === 'offline'
						? 'border-pink-300 bg-pink-50 text-gray-900 ring-2 ring-pink-100'
						: 'border-pink-100 bg-white/75 text-gray-700 hover:border-pink-200 hover:bg-pink-50/70'
				}`}
				aria-pressed={transcriptionMode === 'offline'}
				aria-label={`${transcriptionMode === 'offline' ? 'Disable' : 'Enable'} offline mode`}
				on:click={toggleOffline}
			>
				<span class="flex items-center gap-3">
					<span
						class="auto-start-glyph {transcriptionMode === 'offline' ? 'is-on' : ''}"
						aria-hidden="true"><span></span></span
					>
					<span class="block text-sm font-black">Offline</span>
					{#if offlineButtonStatus?.visible && transcriptionMode === 'offline'}
						<span class="text-[11px] font-bold text-pink-600">{offlineStatusLabel}</span>
					{/if}
				</span>
				<span class="sr-only">{transcriptionMode === 'offline' ? 'On' : 'Off'}</span>
			</button>

			{#if canAutoStart}{/if}

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

			<!-- The one button in here that should feel like a treat: full brand pink,
			     squishy, and it names what you actually get instead of just "Unlock". -->
			<button
				type="button"
				class="supporter-row group flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left"
				title="Supporter unlocks the rainbow vibe, longer notes, local history and downloads"
				on:click={() => openSupporterModal('settings')}
			>
				<span class="flex items-center gap-3">
					<span class="supporter-glyph" aria-hidden="true"></span>
					<span class="block">
						<span class="block text-sm font-black leading-tight">Supporter</span>
						<span class="block text-[11px] font-bold leading-tight opacity-90">
							Rainbow vibe · longer notes · history
						</span>
					</span>
				</span>
				<span class="supporter-pill shrink-0 rounded-full px-3 py-1 text-xs font-black">
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
	/* Brand pink, the one the mascot wears. Squish matches the family X-button
	   curve so it feels like the same hand made it. */
	.supporter-row {
		background: linear-gradient(135deg, #ff7bab, #ff5c9f);
		border: 1px solid rgba(255, 92, 159, 0.55);
		color: #fffdf5;
		box-shadow: 0 10px 22px rgba(255, 92, 159, 0.22);
		transition:
			transform 0.22s linear(0, 0.5 15%, 1.15 40%, 0.97 65%, 1),
			box-shadow 0.2s ease;
	}
	.supporter-row:hover {
		transform: scale(1.02);
		box-shadow: 0 14px 28px rgba(255, 92, 159, 0.3);
	}
	.supporter-row:active {
		transform: scale(0.96);
	}
	.supporter-pill {
		background: rgba(255, 253, 245, 0.95);
		color: #c2185b;
	}

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
		background: #fffef7;
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
