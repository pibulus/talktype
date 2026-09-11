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
	import { ANIMATION, DEFAULT_THEME, SERVICE_EVENTS, STORAGE_KEYS } from '$lib/constants';
	import { syncStore } from '$lib/stores/syncStore.js';
	import { renderQrDataUrl, buildPassportSyncUrl } from '$lib/services/qrHandshakeService.js';
	import {
		readStoredSupporterCode,
		readStoredVaultServerUrl
	} from '$lib/services/vaultHashStorage.js';
	import { autoBackupHistoryToVault } from '$lib/services/storage/vaultAutoBackup.js';
	import { restoreTranscriptsFromVault } from '$lib/services/storage/vaultTranscriptBackup.js';
	import {
		readStorageValue,
		writeStorageValue,
		removeStorageValue
	} from '$lib/services/storage/localStorageMigration.js';

	export let closeModal = () => {};

	let syncQrDataUrl = '';
	let syncBusy = false;
	let syncNote = '';

	async function refreshSyncQr() {
		const code = readStoredSupporterCode();
		const vaultUrl = readStoredVaultServerUrl();
		const syncUrl = buildPassportSyncUrl({ code, vaultUrl });
		syncQrDataUrl = syncUrl ? await renderQrDataUrl(syncUrl, { size: 220 }) : '';
	}

	async function copySyncPhrase() {
		try {
			await navigator.clipboard.writeText($syncStore.phrase);
			syncNote = 'Phrase copied';
		} catch {
			syncNote = 'Copy failed';
		}
		setTimeout(() => (syncNote = ''), 1500);
	}

	async function backupNow() {
		syncBusy = true;
		syncNote = 'Backing up…';
		try {
			const r = await autoBackupHistoryToVault({ allowEmptyHistory: true });
			syncNote =
				r.skipped && r.reason === 'missing-passport-or-vault'
					? 'Add a vault URL first'
					: r.skipped
						? 'Nothing to back up'
						: 'Backed up';
		} catch {
			syncNote = 'Backup failed';
		}
		syncBusy = false;
	}

	async function restoreNow() {
		syncBusy = true;
		syncNote = 'Restoring…';
		try {
			const r = await restoreTranscriptsFromVault({
				code: readStoredSupporterCode(),
				serverUrl: readStoredVaultServerUrl(),
				replaceExisting: false
			});
			syncNote = r.missing
				? 'No backup on the vault yet'
				: `Restored ${r.imported + r.updated} transcript${r.imported + r.updated !== 1 ? 's' : ''}`;
		} catch {
			syncNote = 'Restore failed';
		}
		syncBusy = false;
	}

	// State management
	let selectedVibe;
	let selectedPromptStyle = 'standard';
	let privacyModeValue = false;
	let liveModeValue = false;
	let isSupporterValue = false;
	let userPreferencesLoaded = false;

	let byokDeepgramKey = '';
	let byokGeminiKey = '';

	function loadByokKeys() {
		if (!browser) return;
		byokDeepgramKey = readStorageValue(STORAGE_KEYS.BYOK_DEEPGRAM_KEY, { defaultValue: '' });
		byokGeminiKey = readStorageValue(STORAGE_KEYS.BYOK_GEMINI_KEY, { defaultValue: '' });
	}

	function saveByokKey(provider, value) {
		const clean = (value || '').trim();
		if (provider === 'deepgram') {
			byokDeepgramKey = clean;
			if (clean) writeStorageValue(STORAGE_KEYS.BYOK_DEEPGRAM_KEY, clean);
			else removeStorageValue(STORAGE_KEYS.BYOK_DEEPGRAM_KEY);
		} else if (provider === 'gemini') {
			byokGeminiKey = clean;
			if (clean) writeStorageValue(STORAGE_KEYS.BYOK_GEMINI_KEY, clean);
			else removeStorageValue(STORAGE_KEYS.BYOK_GEMINI_KEY);
		}
	}

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
		loadByokKeys();
		refreshSyncQr();

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
				position="right-3 top-3"
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
					placeholder="Add names, slang, or jargon (separated by commas or new lines), e.g. Pablo, Sourdough, ChargeBee, SubGenius"
					rows="3"
					class="custom-words-input w-full rounded-xl border-2 border-gray-900 bg-[#fffef9] p-3 text-sm font-medium text-gray-800 shadow-inner placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-300"
					aria-label="Custom vocabulary — words transcripts should always spell your way"
				></textarea>
				<p class="px-1 text-[11px] font-bold leading-snug text-gray-500">
					Separate with commas or enters. The ghost will spell them your way, every time.
				</p>
			</section>

			<!-- Offline is the only engine choice a person can actually reason about:
			     it is about privacy and signal, not about which vendor transcribes. -->
			<button
				type="button"
				class={`setting-row flex min-h-12 w-full items-center gap-4 rounded-xl border-2 px-4 py-3 text-left transition-all duration-150 ${
					transcriptionMode === 'offline'
						? '-translate-y-0.5 border-gray-900 bg-teal-50 text-gray-950 shadow-[3px_3px_0px_#2dd4bf]'
						: 'hover:shadow-xs border-2 border-gray-200/90 bg-[#fffdf5] text-gray-700 hover:border-gray-900/60'
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
						<span class="block text-sm font-black leading-tight text-gray-900">Offline Mode</span>
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

			<!-- Device Sync -->
			{#if isSupporterValue}
				<section class="settings-section space-y-2" aria-labelledby="settings_sync_title">
					<div class="flex items-center justify-between">
						<h4 id="settings_sync_title" class="settings-section-title">Device Sync</h4>
						{#if $syncStore.status === 'connected'}
							<span class="text-[10px] font-black uppercase tracking-wider text-emerald-600"
								>Live</span
							>
						{:else if $syncStore.status === 'connecting'}
							<span class="text-[10px] font-black uppercase tracking-wider text-amber-600"
								>Connecting</span
							>
						{/if}
					</div>
					<div class="setting-row rounded-xl border-2 border-gray-900/80 bg-white p-3 shadow-sm">
						<label for="sync-phrase-input" class="mb-1 block text-xs font-bold text-gray-700"
							>Sync Phrase</label
						>
						<input
							id="sync-phrase-input"
							class="w-full rounded-xl border-2 border-gray-900 bg-[#fffef9] px-3 py-2 font-mono text-sm font-bold text-gray-900 shadow-inner outline-none focus:border-gray-900 focus:ring-2 focus:ring-pink-300"
							type="text"
							value={$syncStore.phrase}
							on:blur={(e) => syncStore.setPhrase(e.target.value)}
							on:keydown={(e) => e.key === 'Enter' && e.target.blur()}
						/>
						<p class="mt-1.5 px-0.5 text-[11px] font-bold leading-snug text-gray-500">
							Match this phrase on another device to link them live.
						</p>
						<button
							type="button"
							class="mt-2 rounded-full border-2 border-gray-900 bg-pink-100 px-3 py-1 text-[11px] font-black text-gray-900 transition hover:shadow-[2px_2px_0px_#ff82ca] active:translate-y-0.5"
							on:click={copySyncPhrase}
						>
							Copy phrase
						</button>
					</div>

					{#if syncQrDataUrl}
						<div
							class="setting-row rounded-xl border-2 border-gray-900/80 bg-white p-3 text-center shadow-sm"
						>
							<img
								src={syncQrDataUrl}
								alt="Scan to link another device"
								class="mx-auto h-40 w-40 rounded-lg border border-gray-200"
							/>
							<p class="mt-2 text-[11px] font-bold leading-snug text-gray-500">
								Scan on another device to link your history and audio.
							</p>
						</div>
					{/if}

					<div class="flex items-center gap-2">
						<button
							type="button"
							class="min-h-10 flex-1 rounded-xl border-2 border-gray-900 bg-amber-100 px-3 text-xs font-black text-gray-900 transition hover:shadow-[2px_2px_0px_#fbbf24] active:translate-y-0.5 disabled:opacity-50"
							on:click={backupNow}
							disabled={syncBusy}
						>
							Backup now
						</button>
						<button
							type="button"
							class="min-h-10 flex-1 rounded-xl border-2 border-gray-900 bg-teal-100 px-3 text-xs font-black text-gray-900 transition hover:shadow-[2px_2px_0px_#2dd4bf] active:translate-y-0.5 disabled:opacity-50"
							on:click={restoreNow}
							disabled={syncBusy}
						>
							Restore
						</button>
					</div>
					{#if syncNote}
						<p class="px-0.5 text-[11px] font-bold text-gray-600">{syncNote}</p>
					{/if}
				</section>

				<!-- BYOK (Bring Your Own Key) -->
				<details class="rounded-xl border-2 border-gray-900/80 bg-white px-4 py-3 shadow-sm">
					<summary
						class="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-xs font-black uppercase tracking-wider text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
					>
						<span class="flex items-center gap-2">
							<span class="text-sm" aria-hidden="true">🔑</span>
							<span>Custom API Keys (BYOK)</span>
						</span>
						<span class="chevron text-pink-500" aria-hidden="true"></span>
					</summary>

					<div class="mt-3 space-y-3 pt-1">
						<p class="text-[11px] font-bold leading-relaxed text-gray-500">
							Optional power tool for high-volume users. Paste your own keys to dictate directly at
							cost.
						</p>
						<div>
							<label for="byok-deepgram-input" class="mb-1 block text-xs font-bold text-gray-700">
								Deepgram API Key
							</label>
							<input
								id="byok-deepgram-input"
								class="w-full rounded-xl border-2 border-gray-900 bg-[#fffef9] px-3 py-2 font-mono text-xs font-bold text-gray-900 shadow-inner outline-none focus:border-gray-900 focus:ring-2 focus:ring-pink-300"
								type="password"
								placeholder="Optional custom Deepgram key"
								value={byokDeepgramKey}
								on:blur={(e) => saveByokKey('deepgram', e.target.value)}
							/>
						</div>
						<div>
							<label for="byok-gemini-input" class="mb-1 block text-xs font-bold text-gray-700">
								Gemini API Key
							</label>
							<input
								id="byok-gemini-input"
								class="w-full rounded-xl border-2 border-gray-900 bg-[#fffef9] px-3 py-2 font-mono text-xs font-bold text-gray-900 shadow-inner outline-none focus:border-gray-900 focus:ring-2 focus:ring-pink-300"
								type="password"
								placeholder="Optional custom Gemini key"
								value={byokGeminiKey}
								on:blur={(e) => saveByokKey('gemini', e.target.value)}
							/>
						</div>
					</div>
				</details>
			{:else}
				<button
					type="button"
					class="setting-row shadow-xs hover:shadow-xs flex min-h-12 w-full items-center justify-between gap-4 rounded-xl border-2 border-gray-200/90 bg-[#fffdf5] px-4 py-3 text-left transition-all duration-150 hover:border-gray-900/60"
					on:click={() => openSupporterModal('settings')}
				>
					<div class="flex items-center gap-3">
						<span class="text-base" aria-hidden="true">🔄</span>
						<div>
							<span class="block text-sm font-black leading-tight text-gray-800">Device Sync</span>
							<span class="block text-[11px] font-bold leading-tight text-gray-500">
								Link your phone and laptop live.
							</span>
						</div>
					</div>
					<div
						class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-gray-900 bg-amber-400 text-xs font-black text-gray-900 shadow-[1px_1px_0px_#1e1714]"
						title="Supporter"
						aria-hidden="true"
					>
						★
					</div>
				</button>
			{/if}

			<!-- Wears the intro modal's "Let's go" gradient on purpose: that's the
			     button everybody already tapped, so this reads as the same
			     invitation instead of a new kind of ask. -->
			<button
				type="button"
				class="supporter-row group flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-gray-900 px-6 py-3.5 shadow-[3px_3px_0px_#1e1714] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#1e1714] active:translate-y-0.5 active:shadow-none"
				title="Rainbow vibe, your own output style, longer notes, history and downloads"
				on:click={() => openSupporterModal('settings')}
			>
				<span class="text-base font-black" aria-hidden="true">✦</span>
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
	}

	.auto-start-glyph,
	.supporter-glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.auto-start-glyph {
		width: 2.2rem;
		height: 1.25rem;
		justify-content: flex-start;
		border-radius: 9999px;
		background: #e5e7eb;
		border: 2px solid #1e1714;
		padding: 0.1rem;
		transition:
			background 0.2s ease,
			box-shadow 0.2s ease;
	}

	.auto-start-glyph span {
		width: 0.85rem;
		height: 0.85rem;
		border-radius: 9999px;
		background: #1e1714;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
		transition:
			transform 0.2s ease,
			background 0.2s ease;
	}

	.auto-start-glyph.is-on {
		background: #2dd4bf;
		box-shadow: 2px 2px 0px #0f766e;
	}

	.auto-start-glyph.is-on span {
		transform: translateX(0.95rem);
		background: #ffffff;
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
		color: #ec4899;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
</style>
