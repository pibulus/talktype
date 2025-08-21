<script>
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import {
		whisperServiceUltimate,
		ultimateWhisperStatus
	} from '../../services/transcription/whisper/whisperServiceUltimate';
	import { transcriptionConfig } from '../../services/transcription/hybridTranscriptionService';
	import { formatBytes } from '../../services/transcription/whisper/modelDownloader';

	let selectedModel = 'medium';
	let translateToEnglish = false;
	let autoDetectedLanguage = null;
	let removeSilence = true;
	let webgpuAvailable = false;

	onMount(async () => {
		// Check WebGPU support
		const support = await whisperServiceUltimate.getCapabilities();
		webgpuAvailable = support.webgpu?.supported || false;

		// Load saved preferences
		const saved = localStorage.getItem('talktype_model_prefs');
		if (saved) {
			const prefs = JSON.parse(saved);
			selectedModel = prefs.model || 'medium';
			translateToEnglish = prefs.translate || false;
			removeSilence = prefs.vad !== false; // Default true
		}

		// Auto-detect browser language
		const browserLang = navigator.language.toLowerCase();
		if (!browserLang.startsWith('en')) {
			// Non-English browser, suggest translation
			autoDetectedLanguage = browserLang.split('-')[0];
		}
	});

	// Simplified 3-model system
	const models = {
		small: {
			name: '⚡ Fast',
			description: 'Quick transcription for notes',
			modelId: 'distil-small',
			size: '83MB',
			speed: '6x faster',
			accuracy: '96%',
			badge: 'Quick',
			color: 'from-cyan-400 to-blue-500'
		},
		medium: {
			name: '⚖️ Balanced',
			description: 'Best for most uses',
			modelId: 'distil-medium',
			size: '166MB',
			speed: '6x faster',
			accuracy: '98%',
			badge: 'Recommended',
			color: 'from-purple-400 to-pink-500'
		},
		pro: {
			name: '🎬 Pro',
			description: 'Maximum quality & languages',
			modelId: 'distil-large-v3',
			size: '750MB',
			speed: '6x faster',
			accuracy: '99%',
			badge: 'Multi-language',
			color: 'from-emerald-400 to-green-500',
			languages: [
				'English',
				'Spanish',
				'French',
				'German',
				'Italian',
				'Portuguese',
				'Russian',
				'Japanese',
				'Chinese'
			]
		}
	};

	async function selectModel(modelKey) {
		selectedModel = modelKey;
		const model = models[modelKey];

		// Save preferences
		savePreferences();

		// Switch to the selected model
		try {
			await whisperServiceUltimate.switchModel(model.modelId);
		} catch (error) {
			console.error('Failed to switch model:', error);
		}
	}

	function toggleTranslation() {
		translateToEnglish = !translateToEnglish;
		savePreferences();

		// Update transcription config
		transcriptionConfig.update((config) => ({
			...config,
			translateToEnglish,
			task: translateToEnglish ? 'translate' : 'transcribe'
		}));
	}

	function toggleSilenceRemoval() {
		removeSilence = !removeSilence;
		savePreferences();

		// Update transcription config
		transcriptionConfig.update((config) => ({
			...config,
			useVAD: removeSilence
		}));
	}

	function savePreferences() {
		localStorage.setItem(
			'talktype_model_prefs',
			JSON.stringify({
				model: selectedModel,
				translate: translateToEnglish,
				vad: removeSilence
			})
		);
	}

	// Language detection helper
	function getLanguageName(code) {
		const languages = {
			es: 'Spanish',
			fr: 'French',
			de: 'German',
			it: 'Italian',
			pt: 'Portuguese',
			ru: 'Russian',
			ja: 'Japanese',
			zh: 'Chinese',
			ar: 'Arabic',
			hi: 'Hindi'
		};
		return languages[code] || code;
	}
</script>

<div class="transcription-options space-y-4">
	<!-- Header with Status -->
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-bold text-gray-800">Transcription Engine</h3>
		<div class="flex gap-2">
			{#if webgpuAvailable}
				<span class="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
					🚀 GPU Boost
				</span>
			{/if}
			{#if $ultimateWhisperStatus.isLoaded}
				<span class="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">
					✅ Ready
				</span>
			{/if}
		</div>
	</div>

	<!-- Simple 3-Model Selection -->
	<div class="grid grid-cols-3 gap-2">
		{#each Object.entries(models) as [key, model]}
			{@const isSelected = selectedModel === key}
			<button
				on:click={() => selectModel(key)}
				class="relative transform rounded-xl border-2 p-3 transition-all hover:scale-105
					{isSelected
					? 'bg-gradient-to-r ' + model.color + ' border-white text-white shadow-lg'
					: 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'}"
			>
				<div class="mb-1 text-lg font-bold">{model.name}</div>
				<div class="text-xs opacity-90">{model.size}</div>
				<div class="text-xs opacity-80">{model.accuracy}</div>

				{#if model.badge && isSelected}
					<span
						class="absolute -right-2 -top-2 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-gray-800 shadow"
					>
						{model.badge}
					</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Translation Toggle with Auto-Detection -->
	<div class="rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-4">
		<label class="flex cursor-pointer items-center justify-between">
			<div class="flex-1">
				<div class="flex items-center gap-2 font-bold text-gray-900">
					🌍 Translate to English
					{#if autoDetectedLanguage && !translateToEnglish}
						<span
							class="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700"
							transition:fade
						>
							Detected: {getLanguageName(autoDetectedLanguage)}
						</span>
					{/if}
				</div>
				<div class="text-sm text-gray-600">
					{#if translateToEnglish}
						Automatically translating speech to English
					{:else}
						Transcribe in original language
					{/if}
				</div>
			</div>
			<input
				type="checkbox"
				bind:checked={translateToEnglish}
				on:change={toggleTranslation}
				class="toggle toggle-primary"
			/>
		</label>

		{#if translateToEnglish}
			<div
				class="mt-3 border-t border-blue-200 pt-3 text-xs text-gray-600"
				transition:fly={{ y: -10 }}
			>
				<div class="mb-1 font-medium">Supported languages:</div>
				<div class="flex flex-wrap gap-1">
					{#each ['Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Russian', 'Arabic', '90+ more'] as lang}
						<span class="rounded bg-white/70 px-2 py-0.5">
							{lang}
						</span>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Advanced Options -->
	<div class="space-y-3">
		<!-- Silence Removal Toggle -->
		<div class="rounded-lg border border-green-200 bg-green-50 p-3">
			<label class="flex cursor-pointer items-center justify-between">
				<div>
					<div class="text-sm font-medium text-gray-900">🎤 Remove Silence</div>
					<div class="text-xs text-gray-600">Speed up by skipping quiet parts</div>
				</div>
				<input
					type="checkbox"
					bind:checked={removeSilence}
					on:change={toggleSilenceRemoval}
					class="toggle toggle-success toggle-sm"
				/>
			</label>
		</div>

		<!-- Storage Info -->
		{#if $ultimateWhisperStatus.modelStats}
			<div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
				<div class="flex items-center justify-between text-sm">
					<span class="text-gray-600">Current Model:</span>
					<span class="font-medium text-gray-900">
						{$ultimateWhisperStatus.modelStats.name}
					</span>
				</div>
				{#if $ultimateWhisperStatus.modelStats.speed_multiplier}
					<div class="mt-1 flex items-center justify-between text-xs">
						<span class="text-gray-500">Performance:</span>
						<span class="font-medium text-green-600">
							{$ultimateWhisperStatus.modelStats.speed_multiplier}x faster
						</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Pro Model Features (shown when Pro is selected) -->
	{#if selectedModel === 'pro'}
		<div
			class="rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-3"
			transition:fly={{ y: -10 }}
		>
			<div class="mb-2 text-sm font-bold text-gray-800">🎬 Pro Features:</div>
			<ul class="space-y-1 text-xs text-gray-600">
				<li>• Studio-quality transcription (99% accuracy)</li>
				<li>• Multi-language support (9+ languages)</li>
				<li>• Best for professional content</li>
				<li>• Requires WebGPU for best performance</li>
			</ul>
		</div>
	{/if}
</div>

<style>
	.transcription-options {
		@apply w-full;
	}

	/* Smooth toggle animations */
	.toggle {
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.toggle:checked {
		animation: toggleBounce 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
	}

	@keyframes toggleBounce {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.2);
		}
		100% {
			transform: scale(1);
		}
	}
</style>
