<script>
	import { onMount } from 'svelte';
	import { theme, autoRecord, autoSave, applyTheme, promptStyle } from '$lib';
import { geminiService } from '$lib/services/geminiService';
import { installPromptEvent } from '$lib/stores/pwa';
import { whisperService, whisperStatus } from '$lib/services/transcription/whisper/whisperService';
import { userPreferences } from '$lib/services/infrastructure/stores';
import {
	getAvailableModels,
	selectModel,
	autoSelectModel
} from '$lib/services/transcription/whisper/modelRegistry';
	import DisplayGhost from '$lib/components/ghost/DisplayGhost.svelte';
	import { ModalCloseButton } from './modals/index.js';
	import { Toggle, Button } from './shared';
	import ThemeSelector from './settings/ThemeSelector.svelte';
	import TranscriptionStyleSelector from './settings/TranscriptionStyleSelector.svelte';
	import KeyboardShortcutsInfo from './settings/KeyboardShortcutsInfo.svelte';
	import SupportSection from './settings/SupportSection.svelte';

	export let closeModal = () => {};

	// Tab management
	let activeTab = 'general';
	const tabs = [
		{ id: 'general', label: 'General', icon: '⚙️' },
		{ id: 'transcription', label: 'Transcription', icon: '🎙️' },
		{ id: 'shortcuts', label: 'Shortcuts', icon: '⌨️' },
		{ id: 'about', label: 'About', icon: 'ℹ️' }
	];

	// State management
	let selectedVibe;
	let autoRecordValue = false;
	let autoSaveValue = false;
	let selectedPromptStyle = 'standard';
let privacyModeValue = false;
let selectedModelOption = 'auto';
const availableWhisperModels = getAvailableModels();
const whisperModelMap = Object.fromEntries(availableWhisperModels.map((model) => [model.id, model]));
const OFFLINE_DOWNLOAD_SIZE = '~95MB';
let clearingOfflineCache = false;
let offlineCacheMessage = '';
let lastRequestedModel = 'auto';

function formatBytes(bytes) {
	if (!bytes || typeof bytes !== 'number') return '—';
	const units = ['B', 'KB', 'MB', 'GB'];
	let index = 0;
	let value = bytes;
	while (value >= 1024 && index < units.length - 1) {
		value /= 1024;
		index++;
	}
	return `${value.toFixed(0)}${units[index]}`;
}

const whisperModelChoices = [
	{
		id: 'auto',
		title: 'Auto (recommended)',
		description: 'TalkType picks tiny vs. small based on your hardware.',
		meta: 'Balanced speed + accuracy'
	},
	{
		id: 'tiny',
		title: 'Tiny (fastest)',
		description: 'Quickest offline transcription with lower accuracy.',
		meta: `${formatBytes(whisperModelMap.tiny?.size)} download`
	},
	{
		id: 'small',
		title: 'Small (higher accuracy)',
		description: 'Better accuracy for desktop-class CPUs.',
		meta: `${formatBytes(whisperModelMap.small?.size)} download`
	}
];

	// Store subscriptions
	const unsubscribeTheme = theme.subscribe((value) => {
		selectedVibe = value;
	});

	const unsubscribeAutoRecord = autoRecord.subscribe((value) => {
		autoRecordValue = value === 'true';
	});

	const unsubscribeAutoSave = autoSave.subscribe((value) => {
		autoSaveValue = value === 'true';
	});

const unsubscribePromptStyle = promptStyle.subscribe((value) => {
	selectedPromptStyle = value;
});
const unsubscribeUserPreferences = userPreferences.subscribe((prefs) => {
	if (prefs?.modelManuallySelected && prefs?.whisperModel) {
		selectedModelOption = prefs.whisperModel;
		lastRequestedModel = prefs.whisperModel;
	} else {
		selectedModelOption = 'auto';
		lastRequestedModel = 'auto';
	}
});

	onMount(() => {
		// Get currently selected prompt style from the service
		selectedPromptStyle = geminiService.getPromptStyle();

		// Get privacy mode value from localStorage
		privacyModeValue = localStorage.getItem('talktype_privacy_mode') === 'true';

		// Set up event listeners for the modal
		const modal = document.getElementById('settings_modal');
		if (modal) {
			modal.addEventListener('open', () => {
				selectedPromptStyle = geminiService.getPromptStyle();
				privacyModeValue = localStorage.getItem('talktype_privacy_mode') === 'true';
			});
		}

		// Clean up subscriptions on component destroy
		return () => {
			unsubscribeTheme();
			unsubscribeAutoRecord();
			unsubscribeAutoSave();
			unsubscribePromptStyle();
			unsubscribeUserPreferences();
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

	function handleAutoRecordChange(e) {
		// e.detail contains the boolean value from Toggle component
		autoRecordValue = e.detail;
		autoRecord.set(autoRecordValue.toString());
		window.dispatchEvent(
			new CustomEvent('talktype-setting-changed', {
				detail: { setting: 'autoRecord', value: autoRecordValue }
			})
		);
	}

	function handleAutoSaveChange(e) {
		// e.detail contains the boolean value from Toggle component
		autoSaveValue = e.detail;
		autoSave.set(autoSaveValue.toString());
		window.dispatchEvent(
			new CustomEvent('talktype-setting-changed', {
				detail: { setting: 'autoSave', value: autoSaveValue }
			})
		);
	}

	function handlePrivacyModeChange(e) {
		// Toggles can emit either native or custom events; support both shapes
		const nextValue =
			typeof e?.detail === 'boolean'
				? e.detail
				: e?.currentTarget?.checked ?? e?.target?.checked ?? privacyModeValue;

		privacyModeValue = Boolean(nextValue);
		localStorage.setItem('talktype_privacy_mode', String(privacyModeValue));
		window.dispatchEvent(
			new CustomEvent('talktype-setting-changed', {
				detail: { setting: 'privacyMode', value: privacyModeValue }
			})
		);

		if (privacyModeValue && typeof window !== 'undefined') {
			reloadWhisperModel();
		} else {
			whisperService.unloadModel();
		}
	}

	function handleModelOptionChange(option) {
		if (option === selectedModelOption && option === lastRequestedModel) {
			return;
		}
		selectedModelOption = option;
		lastRequestedModel = option;
		if (option === 'auto') {
			autoSelectModel();
		} else {
			selectModel(option);
		}

		reloadWhisperModel();
	}

	function reloadWhisperModel() {
		try {
			whisperService.unloadModel();
		} catch (error) {
			console.warn('[Settings] Whisper unload failed:', error?.message || error);
		}

		if (!privacyModeValue) {
			return;
		}

		whisperService.preloadModel().catch((error) => {
			console.warn('[Settings] Whisper preload failed:', error?.message || error);
		});
	}

	async function handleClearOfflineCache() {
		if (clearingOfflineCache) return;
		clearingOfflineCache = true;
		offlineCacheMessage = '';
		try {
			await whisperService.clearModelCache();
			offlineCacheMessage = 'Offline cache cleared. The model will download again next time.';
			if (privacyModeValue) {
				reloadWhisperModel();
			}
		} catch (error) {
			console.error('Failed to clear offline cache:', error);
			offlineCacheMessage = 'Could not clear cache. Close other tabs and try again.';
		} finally {
			clearingOfflineCache = false;
		}
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
</script>

<dialog
	id="settings_modal"
	class="modal fixed z-[999] overflow-hidden"
	aria-labelledby="settings_modal_title"
	aria-modal="true"
>
	<div
		class="animate-modal-enter modal-box relative max-h-[85vh] w-[95%] max-w-2xl overflow-hidden rounded-2xl border border-pink-200 bg-gradient-to-br from-[#fffaef] to-[#fff6e6] shadow-xl"
	>
		<form method="dialog">
			<ModalCloseButton
				closeModal={handleModalClose}
				label="Close settings"
				position="right-2 top-2"
				modalId="settings_modal"
			/>
		</form>

		<!-- Header -->
		<div class="mb-4 flex items-center gap-2 border-b border-pink-100 pb-3">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-full border border-pink-200/60 bg-gradient-to-br from-white to-pink-50 shadow-sm"
			>
				<DisplayGhost width="24px" height="24px" theme={$theme} seed={54321} />
			</div>
			<h3 id="settings_modal_title" class="text-xl font-black tracking-tight text-gray-800">
				Settings
			</h3>
		</div>

		<!-- Tabs -->
		<div class="tabs-boxed tabs mb-4 bg-pink-50/50">
			{#each tabs as tab}
				<button
					class="tab {activeTab === tab.id ? 'tab-active' : ''}"
					on:click={() => (activeTab = tab.id)}
				>
					<span class="mr-1">{tab.icon}</span>
					{tab.label}
				</button>
			{/each}
		</div>

		<!-- Tab Content -->
		<div class="animate-fadeUp max-h-[calc(85vh-180px)] overflow-y-auto">
			{#if activeTab === 'general'}
				<div class="space-y-4">
					<!-- Vibes Section -->
					<section class="space-y-2">
						<h3 class="text-xs font-medium uppercase tracking-widest text-gray-500">Vibes</h3>
						<ThemeSelector currentTheme={selectedVibe} onThemeChange={changeVibe} />
					</section>

					<div class="divider my-2 opacity-10"></div>

					<!-- Automagic Section -->
					<section class="space-y-3">
						<h3 class="text-xs font-medium uppercase tracking-widest text-gray-500">Automagic</h3>
						<Toggle
							label="Auto-Record on Start"
							description="Start recording immediately when you open TalkType"
							bind:checked={autoRecordValue}
							on:change={handleAutoRecordChange}
						/>
						<Toggle
							label="Auto-Save Transcripts"
							description="Automatically save all your transcriptions"
							bind:checked={autoSaveValue}
							on:change={handleAutoSaveChange}
						/>
					</section>

					<!-- PWA Install -->
					{#if $installPromptEvent}
						<div class="divider my-2 opacity-10"></div>
						<section class="space-y-2">
							<h3 class="text-xs font-medium uppercase tracking-widest text-gray-500">
								Install App
							</h3>
							<Button variant="primary" fullWidth on:click={handleInstallClick}>
								📦 Install TalkType
							</Button>
						</section>
					{/if}
				</div>
			{:else if activeTab === 'transcription'}
				<div class="space-y-4">
					<!-- Personality Section -->
					<section class="space-y-2">
						<h3 class="text-xs font-medium uppercase tracking-widest text-gray-500">
							Ghost Personality
						</h3>
						<TranscriptionStyleSelector {selectedPromptStyle} {changePromptStyle} />
					</section>

					<div class="divider my-2 opacity-10"></div>

					<!-- Privacy Mode -->
					<section class="space-y-2">
						<h3 class="text-xs font-medium uppercase tracking-widest text-gray-500">
							Privacy Settings
						</h3>
						<Toggle
							id="privacy_mode"
							label="🔒 Offline Mode (Desktop Only)"
							description="Download and use offline Whisper model (downloads ~95MB, works without internet)"
							bind:checked={privacyModeValue}
							on:change={handlePrivacyModeChange}
						/>

							<!-- Download Progress / Status Indicator -->
							{#if privacyModeValue}
								{#if !$whisperStatus.isLoaded}
									<div class="rounded-lg border-2 border-blue-300 bg-blue-50/80 p-3">
										<div class="mb-2 flex items-center justify-between">
											<p class="text-sm font-semibold text-blue-700">
												📥 { $whisperStatus.isLoading ? 'Downloading Whisper model...' : 'Preparing Whisper download...' }
											</p>
											{#if $whisperStatus.isLoading}
												<span class="text-xs font-bold text-blue-600">
													{$whisperStatus.progress}%
												</span>
											{/if}
										</div>
										{#if $whisperStatus.isLoading}
											<div class="h-2 overflow-hidden rounded-full bg-blue-200">
												<div
													class="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300"
													style="width: {$whisperStatus.progress}%"
												></div>
											</div>
											<p class="mt-2 text-xs text-blue-600">
												{#if $whisperStatus.progress < 30}
													Starting download... (~95MB)
												{:else if $whisperStatus.progress < 90}
													Downloading model files...
												{:else}
													Almost ready! Loading into memory...
												{/if}
											</p>
										{:else}
											<p class="text-xs text-blue-600">Connecting and preparing download (~95MB)...</p>
										{/if}
									</div>
								{:else}
									<div class="rounded-lg border-2 border-green-300 bg-green-50/80 p-3">
										<p class="text-sm font-semibold text-green-700">
											✅ Offline model ready! Your transcriptions are completely private.
										</p>
									</div>
								{/if}

								<div class="mt-3 flex flex-col gap-2">
									<button
										class="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-60"
										on:click={handleClearOfflineCache}
										disabled={clearingOfflineCache}
									>
										{clearingOfflineCache ? 'Clearing offline cache…' : '🧹 Clear offline Whisper cache'}
									</button>
									{#if offlineCacheMessage}
										<p class="text-xs text-gray-600">{offlineCacheMessage}</p>
									{/if}
								</div>
							{/if}

						<div class="rounded-lg bg-blue-50/50 p-3">
							<p class="text-xs text-gray-600">
								{#if privacyModeValue}
									<strong>🖥️ Desktop offline mode:</strong> All transcriptions stay on your device. Uses
									Distil-Whisper for fast, private transcription.
								{:else}
									<strong>☁️ Online mode:</strong> Fast Gemini API transcription. Works on all devices.
								{/if}
							</p>
							<p class="mt-2 text-xs text-gray-500">
								<strong>Note:</strong> Offline mode only works on desktop browsers. Mobile devices use
								online API due to memory constraints.
							</p>
						</div>
						</section>

						<div class="divider my-2 opacity-10"></div>

						<!-- Model Settings -->
						<section class="space-y-4">
							<h3 class="text-xs font-medium uppercase tracking-widest text-gray-500">
								Offline Model Preference
							</h3>
							<div class="space-y-3">
								{#each whisperModelChoices as choice}
									<label
										class="flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-3 transition-all {selectedModelOption === choice.id
											? 'border-amber-300 bg-white'
											: 'border-transparent bg-white/70 hover:border-amber-200'}"
									>
										<input
											type="radio"
											name="whisper_model_choice"
											class="mt-1"
											value={choice.id}
											checked={selectedModelOption === choice.id}
											on:change={() => handleModelOptionChange(choice.id)}
										/>
										<div class="flex-1">
											<div class="text-sm font-semibold text-gray-900">{choice.title}</div>
											<p class="text-xs text-gray-600">{choice.description}</p>
											<p class="text-xs font-semibold text-amber-700">{choice.meta}</p>
										</div>
									</label>
								{/each}
							</div>
						</section>
					</div>
				{:else if activeTab === 'shortcuts'}
					<div class="space-y-4">
						<KeyboardShortcutsInfo />
					</div>
			{:else if activeTab === 'about'}
				<div class="space-y-4">
					<SupportSection />

					<div class="divider my-2 opacity-10"></div>

					<!-- Version Info -->
					<section class="space-y-2">
						<h3 class="text-xs font-medium uppercase tracking-widest text-gray-500">Version</h3>
						<div class="rounded-lg bg-white/50 p-3">
							<p class="text-sm font-medium text-gray-700">TalkType v2.0</p>
							<p class="mt-1 text-xs text-gray-500">Progressive Transcription Edition</p>
							<p class="mt-2 text-xs text-gray-400">Made with 💗 by Pablo</p>
						</div>
					</section>
				</div>
			{/if}
		</div>
	</div>
</dialog>

<style>
	.tab {
		@apply flex-1 transition-all duration-200;
	}
	.tab-active {
		@apply bg-white text-pink-600 shadow-sm;
	}
	.animate-modal-enter {
		animation: modalSlideUp 0.3s ease-out;
	}
	.animate-fadeUp {
		animation: fadeUp 0.2s ease-out;
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

	@keyframes fadeUp {
		from {
			transform: translateY(10px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
</style>
