<script>
	import { onMount } from 'svelte';
	import { theme, autoRecord, autoSave, applyTheme, promptStyle } from '$lib';
	import { geminiService } from '$lib/services/geminiService';
	import { installPromptEvent } from '$lib/stores/pwa';
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

	onMount(() => {
		// Get currently selected prompt style from the service
		selectedPromptStyle = geminiService.getPromptStyle();

		// Set up event listeners for the modal
		const modal = document.getElementById('settings_modal');
		if (modal) {
			modal.addEventListener('open', () => {
				selectedPromptStyle = geminiService.getPromptStyle();
			});
		}

		// Clean up subscriptions on component destroy
		return () => {
			unsubscribeTheme();
			unsubscribeAutoRecord();
			unsubscribeAutoSave();
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

					<!-- Model Settings (placeholder for future) -->
					<section class="space-y-2">
						<h3 class="text-xs font-medium uppercase tracking-widest text-gray-500">
							Transcription Quality
						</h3>
						<div class="rounded-lg bg-white/50 p-3">
							<p class="text-sm text-gray-600">
								Progressive quality system automatically selects the best model for your device.
							</p>
							<ul class="mt-2 space-y-1 text-xs text-gray-500">
								<li>• Instant: Web Speech API (online)</li>
								<li>• Fast: Distil-Tiny (20MB)</li>
								<li>• Better: Distil-Small/Medium (auto-selected)</li>
								<li>• Pro: Distil-Large-v3 (coming soon)</li>
							</ul>
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
