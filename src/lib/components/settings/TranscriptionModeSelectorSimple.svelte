<script>
	import { onMount } from 'svelte';
	import {
		whisperStatus,
		whisperService
	} from '../../services/transcription/whisper/whisperService';
	import {
		selectModel as setSelectedModel,
		getCurrentModel
	} from '../../services/transcription/whisper/modelRegistry';

	// Simplified 2-choice model system
	const modelOptions = [
		{
			id: 'api',
			name: 'Fast Cloud',
			emoji: '☁️',
			description: 'Instant',
			tooltip: 'Google Speech API - Instant results, needs internet',
			size: 0,
			privacy: false,
			recommended: true
		},
		{
			id: 'tiny',
			name: 'Private Local',
			emoji: '🔒',
			description: '39MB',
			tooltip: 'Whisper AI - 100% private, works offline',
			size: 39000000,
			privacy: true,
			recommended: false
		}
	];

	let selectedModel = 'api';
	let isLoading = false;
	let loadProgress = 0;
	let currentModel = null;

	onMount(() => {
		// Check current mode
		const privacyMode = localStorage.getItem('talktype_privacy_mode') === 'true';
		currentModel = getCurrentModel();
		const storedModel = localStorage.getItem('talktype_whisper_model') || 'tiny';

		if (privacyMode && currentModel) {
			selectedModel = currentModel.id;
		} else if (privacyMode) {
			selectedModel = storedModel;
		} else {
			selectedModel = 'api';
		}

		// Subscribe to whisper status for loading state
		const unsubscribe = whisperStatus.subscribe((status) => {
			isLoading = status.isLoading;
			loadProgress = status.progress || 0;
		});

		return unsubscribe;
	});

	async function selectModel(modelId) {
		if (selectedModel === modelId || isLoading) return;

		const oldModel = selectedModel;
		selectedModel = modelId;

		// Save selection
		if (modelId === 'api') {
			// Switch to API mode (disable privacy mode)
			localStorage.setItem('talktype_privacy_mode', 'false');
			localStorage.removeItem('talktype_whisper_accepted');
			// No reload needed for API mode
		} else {
			// Switch to offline mode with selected model
			localStorage.setItem('talktype_privacy_mode', 'true');
			localStorage.setItem('talktype_whisper_model', modelId);
			localStorage.setItem('talktype_whisper_accepted', 'true');

			// Update the model selection
			setSelectedModel(modelId);

			// Unload current model if switching between offline models
			if (oldModel !== 'api' && oldModel !== modelId) {
				whisperService.unloadModel();
			}

			// Preload the new model
			try {
				await whisperService.preloadModel();
			} catch (error) {
				console.error('Failed to load model:', error);
				// Revert selection on error
				selectedModel = oldModel;
				return;
			}
		}

		// Dispatch event for other components
		window.dispatchEvent(
			new CustomEvent('talktype-model-changed', {
				detail: { model: modelId }
			})
		);
	}
</script>

<div class="model-selector">
	<h3 class="mb-3 text-sm font-bold text-gray-700">How to Transcribe</h3>

	<div class="grid grid-cols-2 gap-3">
		{#each modelOptions as model}
			<button
				on:click={() => selectModel(model.id)}
				disabled={isLoading}
				class="model-option group relative flex flex-col items-center justify-center rounded-2xl border-2 p-4 transition-all {selectedModel ===
				model.id
					? 'border-pink-400 bg-gradient-to-br from-pink-50 to-purple-50 shadow-lg'
					: 'border-gray-200 bg-white hover:border-pink-200 hover:shadow-md'} {isLoading
					? 'cursor-not-allowed opacity-50'
					: 'cursor-pointer'}"
				aria-label="Select {model.name} model"
				title={model.tooltip}
			>
				<!-- Recommended badge -->
				{#if model.recommended}
					<div class="absolute -top-2 left-1/2 -translate-x-1/2 transform">
						<span class="rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white">
							RECOMMENDED
						</span>
					</div>
				{/if}

				<!-- Loading overlay for this specific model -->
				{#if isLoading && selectedModel === model.id}
					<div class="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/90">
						<div class="text-center">
							<div class="animate-pulse text-3xl">{model.emoji}</div>
							<div class="mt-1 text-xs font-bold text-pink-500">Loading {loadProgress}%</div>
						</div>
					</div>
				{/if}

				<!-- Model icon -->
				<div class="mb-2 text-4xl transition-transform group-hover:scale-110">
					{model.emoji}
				</div>

				<!-- Model name -->
				<div class="text-sm font-bold text-gray-700">
					{model.name}
				</div>

				<!-- Model description -->
				<div class="mt-1 text-xs text-gray-500">
					{model.description}
				</div>

				<!-- Privacy indicator for offline model -->
				{#if model.privacy}
					<div class="mt-2 text-[10px] text-gray-400">100% Private • Works Offline</div>
				{:else}
					<div class="mt-2 text-[10px] text-gray-400">Fast • Needs Internet</div>
				{/if}

				<!-- Selection indicator -->
				{#if selectedModel === model.id}
					<div class="absolute -bottom-1 left-1/2 -translate-x-1/2 transform">
						<div class="h-3 w-3 animate-pulse rounded-full bg-pink-400"></div>
					</div>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Info text -->
	<p class="mt-3 text-center text-[10px] text-gray-400">
		{#if selectedModel === 'api'}
			Using Google's cloud service for instant transcription
		{:else}
			AI model downloading to your device for offline use
		{/if}
	</p>
</div>

<style>
	.model-option {
		min-height: 120px;
	}
</style>
