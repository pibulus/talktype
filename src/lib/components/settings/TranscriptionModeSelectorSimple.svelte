<script>
	import { onMount } from 'svelte';
	import { whisperStatus, whisperService } from '../../services/transcription/whisper/whisperService';
	import { 
		selectModel as setSelectedModel,
		getCurrentModel 
	} from '../../services/transcription/whisper/modelRegistry';
	
	// 4 clear model options matching the vibe UI pattern
	const modelOptions = [
		{
			id: 'api',
			name: 'Cloud',
			emoji: '☁️',
			description: 'Fast & accurate',
			details: 'Uses Google Speech API',
			size: 0,
			privacy: false
		},
		{
			id: 'tiny',
			name: 'Tiny',
			emoji: '🐭',
			description: 'Quick & light',
			details: '39MB model',
			size: 39000000,
			privacy: true
		},
		{
			id: 'base',
			name: 'Base',
			emoji: '🦊',
			description: 'Better accuracy',
			details: '74MB model',
			size: 74000000,
			privacy: true
		},
		{
			id: 'small',
			name: 'Small',
			emoji: '🐻',
			description: 'Best offline',
			details: '244MB model',
			size: 244000000,
			privacy: true
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
	<div class="mb-3">
		<h3 class="text-sm font-bold text-gray-700">Transcription Model</h3>
		<p class="text-xs text-gray-500 mt-1">
			{#if selectedModel === 'api'}
				Using fast cloud transcription
			{:else}
				Everything stays on your device
			{/if}
		</p>
	</div>
	
	<div class="grid grid-cols-4 gap-2">
		{#each modelOptions as model}
			<button
				on:click={() => selectModel(model.id)}
				disabled={isLoading}
				class="model-option group relative flex flex-col items-center rounded-2xl border-2 p-3 transition-all {
					selectedModel === model.id
						? 'border-pink-400 bg-gradient-to-br from-pink-50 to-purple-50 shadow-md'
						: 'border-gray-200 bg-white hover:border-pink-200 hover:shadow-sm'
				} {isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
				aria-label="Select {model.name} model"
				title={model.details}
			>
				<!-- Loading overlay for this specific model -->
				{#if isLoading && selectedModel === model.id}
					<div class="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/80">
						<div class="text-center">
							<div class="text-2xl animate-pulse">{model.emoji}</div>
							<div class="text-xs font-bold text-pink-500 mt-1">{loadProgress}%</div>
						</div>
					</div>
				{/if}
				
				<!-- Model icon -->
				<div class="text-2xl mb-1 transition-transform group-hover:scale-110">
					{model.emoji}
				</div>
				
				<!-- Model name -->
				<div class="text-xs font-bold text-gray-700">
					{model.name}
				</div>
				
				<!-- Model description -->
				<div class="text-[10px] text-gray-500 mt-0.5">
					{model.description}
				</div>
				
				<!-- Privacy indicator -->
				{#if model.privacy}
					<div class="absolute top-1 right-1">
						<span class="text-[10px]" title="Offline mode">🔒</span>
					</div>
				{/if}
				
				<!-- Selection indicator -->
				{#if selectedModel === model.id}
					<div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
						<div class="w-2 h-2 rounded-full bg-pink-400"></div>
					</div>
				{/if}
			</button>
		{/each}
	</div>
	
	<!-- Model details -->
	{#if selectedModel !== 'api'}
		{@const selected = modelOptions.find(m => m.id === selectedModel)}
		<div class="mt-3 p-2 rounded-lg bg-purple-50 border border-purple-200">
			<div class="flex items-center justify-between text-xs">
				<span class="text-purple-700 font-medium">
					{selected?.details}
				</span>
				{#if $whisperStatus.isLoaded && selectedModel !== 'api'}
					<span class="text-green-600 font-bold">✓ Ready</span>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.model-option {
		min-height: 90px;
	}
</style>
