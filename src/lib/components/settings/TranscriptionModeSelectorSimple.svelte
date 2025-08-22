<script>
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { whisperStatus } from '../../services/transcription/whisper/whisperService';
	import {
		getAvailableModels,
		selectModel as setSelectedModel,
		getCurrentModel
	} from '../../services/transcription/whisper/modelRegistry';
	import { formatBytes } from '../../services/transcription/whisper/modelDownloader';

	let models = [];
	let currentModel = null;
	let isLoaded = false;
	let selectedModelId = 'tiny';
	let privacyMode = false;
	let showModelSelector = false;

	onMount(() => {
		// Get available models from registry
		models = getAvailableModels();
		currentModel = getCurrentModel();
		selectedModelId = currentModel?.id || 'tiny';

		// Check if privacy mode is enabled
		privacyMode = localStorage.getItem('talktype_privacy_mode') === 'true';

		// If privacy mode and model not loaded, trigger download
		if (privacyMode && !isLoaded) {
			triggerModelDownload();
		}

		// Subscribe to whisper status
		const unsubscribe = whisperStatus.subscribe((status) => {
			isLoaded = status.isLoaded;
		});

		return unsubscribe;
	});

	function togglePrivacyMode() {
		privacyMode = !privacyMode;
		localStorage.setItem('talktype_privacy_mode', privacyMode.toString());

		if (privacyMode && !isLoaded) {
			// Trigger model download
			triggerModelDownload();
		} else if (!privacyMode) {
			// When turning off privacy mode, just refresh to use API
			window.location.reload();
		}
	}

	function triggerModelDownload() {
		// Clear acceptance to trigger download prompt
		localStorage.removeItem('talktype_whisper_accepted');
		// Set acceptance to auto-download
		localStorage.setItem('talktype_whisper_accepted', 'true');
		// Reload to start download
		window.location.reload();
	}

	async function handleModelChange(modelId) {
		if (modelId === selectedModelId) return;

		// Select the new model
		setSelectedModel(modelId);

		// Trigger download of new model
		triggerModelDownload();
	}
</script>

<div class="space-y-4">
	<!-- Simple Privacy Toggle -->
	<div class="rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-4">
		<label class="flex cursor-pointer items-center justify-between">
			<div class="flex-1">
				<div class="flex items-center gap-2 font-bold text-gray-900">
					🔒 Privacy Mode
					{#if privacyMode && isLoaded}
						<span class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
							Active
						</span>
					{:else if privacyMode && $whisperStatus.isLoading}
						<span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
							Loading {$whisperStatus.progress}%
						</span>
					{/if}
				</div>
				<div class="mt-1 text-sm text-gray-600">
					{#if privacyMode}
						All transcription happens offline on your device
					{:else}
						Using fast online transcription
					{/if}
				</div>
			</div>
			<input
				type="checkbox"
				bind:checked={privacyMode}
				on:change={togglePrivacyMode}
				class="toggle toggle-primary"
				aria-label="Enable Privacy Mode"
			/>
		</label>
	</div>

	<!-- Advanced Options (collapsed by default) -->
	{#if privacyMode}
		<div class="space-y-2">
			<button
				on:click={() => (showModelSelector = !showModelSelector)}
				class="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
			>
				<span class="text-gray-700">
					Model: <strong>{currentModel?.name || 'Tiny'}</strong> ({formatBytes(
						currentModel?.size || 39000000
					)})
				</span>
				<span class="text-gray-400">
					{showModelSelector ? '−' : '+'}
				</span>
			</button>

			{#if showModelSelector}
				<div class="space-y-2 pl-2" transition:fly={{ y: -10, duration: 200 }}>
					{#each models as model}
						<button
							on:click={() => handleModelChange(model.id)}
							class="w-full rounded-lg border p-2 text-left text-sm transition-all hover:shadow {model.id ===
							selectedModelId
								? 'border-amber-400 bg-amber-50'
								: 'border-gray-200 bg-white hover:border-gray-300'}"
						>
							<div class="flex items-center justify-between">
								<span class="font-medium text-gray-700">{model.name}</span>
								<span class="text-xs text-gray-500">{formatBytes(model.size)}</span>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
