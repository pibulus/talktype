<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { theme, applyTheme, promptStyle, liveMode, privacyMode } from '$lib';
	import { userPreferences } from '$lib/services/infrastructure/stores';
	import { whisperStatus } from '$lib/services/transcription/whisper/whisperService';
	import { formatStorageBytes } from '$lib/services/transcription/whisper/statusUtils.js';
	import { analytics } from '$lib/services/analytics.js';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { ModalCloseButton } from './modals/index.js';
	import ThemeSelector from './settings/ThemeSelector.svelte';
	import TranscriptionStyleSelector from './settings/TranscriptionStyleSelector.svelte';
	import {
		getStoredCustomWords,
		setStoredCustomWords
	} from '$lib/services/transcription/transcriptCleanup.js';
	import { ANIMATION, DEFAULT_THEME, SERVICE_EVENTS } from '$lib/constants';
	import { syncStore } from '$lib/stores/syncStore.js';

	export let closeModal = () => {};

	// State management
	let selectedVibe;
	let selectedPromptStyle = 'standard';
	let privacyModeValue = false;
	let liveModeValue = false;
	let isSupporterValue = false;
	let userPreferencesLoaded = false;

	// Custom vocabulary — names/words the ghost should always get right.
	// Applied as fuzzy post-processing on every transcription path
	// (recordingControlsService → applyCustomWords), so live, batch, styled
	// and offline all benefit. Stored in localStorage; saved on blur.
	let customWordsText = '';

	function saveCustomWords() {
		const words = customWordsText
			.split(/[\n,]/)
			.map((w) => w.trim())
			.filter(Boolean);
		setStoredCustomWords(words);
		customWordsText = words.join('\n');
	}

	// Store unsubscribe functions
	let unsubscribeTheme;
	let unsubscribePromptStyle;
	let unsubscribeLiveMode;
	let unsubscribePrivacyMode;
	let unsubscribeUserPreferences;

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
		customWordsText = getStoredCustomWords().join('\n');

		// Subscribe to stores only in browser
		unsubscribeTheme = theme.subscribe((value) => {
			selectedVibe = value;
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
		if (status.isLoading) {
			return status.progress > 0 ? `Loading ${Math.round(status.progress)}%` : 'Loading';
		}
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

			<section class="settings-section space-y-2" aria-labelledby="settings_vocab_title">
				<h4 id="settings_vocab_title" class="settings-section-title">Your Words</h4>
				<textarea
					bind:value={customWordsText}
					on:blur={saveCustomWords}
					placeholder="Names and tricky words, one per line — spelled the way you want them."
					rows="3"
					class="custom-words-input w-full rounded-lg border border-pink-200 bg-[#fffdf5] p-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
					aria-label="Custom vocabulary — words transcripts should always spell your way"
				></textarea>
				<p class="px-1 text-[11px] leading-snug text-gray-500">
					Anything transcripts keep mangling — they'll come out your way, every time.
				</p>
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
				aria-label={`${transcriptionMode === 'offline' ? 'Disable' : 'Enable'} on-device transcription`}
				on:click={toggleOffline}
			>
				<span class="flex items-center gap-3">
					<span
						class="auto-start-glyph {transcriptionMode === 'offline' ? 'is-on' : ''}"
						aria-hidden="true"><span></span></span
					>
					<span class="block">
						<span class="block text-sm font-black leading-tight">Offline Mode</span>
						<span class="block text-[11px] font-bold leading-tight text-gray-500">
							{#if offlineButtonStatus?.visible && transcriptionMode === 'offline'}
								{offlineStatusLabel}
							{:else}
								Private, no signal needed, works anywhere. A touch rougher.
							{/if}
						</span>
					</span>
				</span>
				<span class="sr-only">{transcriptionMode === 'offline' ? 'On' : 'Off'}</span>
			</button>

			<!-- Sync Mode -->
			<div class="mb-4">
				<div class="mb-2 flex items-center justify-between">
					<h3 class="settings-section-title tracking-widest text-[#f9a8d4]">Device Sync</h3>
					{#if $syncStore.status === 'connected'}
						<span class="text-[10px] font-bold uppercase tracking-widest text-emerald-400"
							>Live</span
						>
					{:else if $syncStore.status === 'connecting'}
						<span class="text-[10px] font-bold uppercase tracking-widest text-amber-400"
							>Connecting</span
						>
					{/if}
				</div>
				<div
					class="setting-row flex flex-col gap-2 rounded-[22px] bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
				>
					<div class="flex flex-col">
						<span class="text-[15px] font-bold text-slate-800">Secret Phrase</span>
						<span class="text-[11px] font-bold leading-tight text-gray-500">
							Type this exact phrase on another device to link them invisibly.
						</span>
					</div>
					<input
						class="w-full rounded-xl bg-gray-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#f9a8d4] sm:w-48"
						type="text"
						value={$syncStore.phrase}
						on:blur={(e) => syncStore.setPhrase(e.target.value)}
						on:keydown={(e) => e.key === 'Enter' && e.target.blur()}
					/>
				</div>
			</div>

			<!-- Wears the intro modal's "Let's go" gradient on purpose: that's the
			     button everybody already tapped, so this reads as the same
			     invitation instead of a new kind of ask. -->
			<button
				type="button"
				class="supporter-row group flex w-full items-center justify-center gap-2.5 rounded-full px-6 py-3"
				title="Rainbow vibe, your own output style, longer notes, history and downloads"
				on:click={() => openSupporterModal('settings')}
			>
				<span class="text-base" aria-hidden="true">✦</span>
				<span class="text-base font-black tracking-tight">
					{isSupporterValue ? 'Supporter mode' : 'Become a Supporter'}
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
	/* Same gradient as the intro modal's "Let's go" — one yummy button language. */
	.supporter-row {
		background: linear-gradient(90deg, #fbbf24, #f472b6 55%, #ec4899);
		color: #fffdf5;
		border: 0;
		box-shadow: 0 10px 22px rgba(249, 168, 212, 0.5);
		transition:
			transform 0.15s ease,
			box-shadow 0.15s ease;
	}
	.supporter-row:hover {
		transform: scale(1.02);
		box-shadow: 0 14px 30px rgba(249, 168, 212, 0.7);
	}
	.supporter-row:active {
		transform: scale(0.97);
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

	.custom-words-input {
		min-height: 4.5rem;
		resize: vertical;
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
