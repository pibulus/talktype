<script>
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import {
		hybridTranscriptionService,
		hybridStatus,
		transcriptionConfig
	} from '../../services/transcription/hybridTranscriptionService';
	import { formatBytes } from '../../services/transcription/whisper/modelDownloader';

	let showDetails = false;
	let stats = {};

	onMount(() => {
		// Get initial stats
		stats = hybridTranscriptionService.getStats();
	});

	$: currentMode = $transcriptionConfig.preferredMode;
	$: privacyMode = $transcriptionConfig.privacyMode;
	$: recommendation = $hybridStatus.recommendation;

	const modes = [
		{
			id: 'auto',
			name: '🤖 Auto',
			description: 'Let TalkType choose the best option',
			privacy: 'Varies',
			size: 'Varies',
			speed: 'Fastest available',
			badge: 'Recommended'
		},
		{
			id: 'webspeech',
			name: '⚡ Instant',
			description: 'Uses browser speech recognition',
			privacy: 'Sends audio to Google',
			size: '0MB',
			speed: 'Instant',
			availability: 'Chrome/Edge only',
			badge: 'Fastest'
		},
		{
			id: 'whisper',
			name: '🔒 Private',
			description: 'High accuracy offline transcription',
			privacy: '100% offline',
			size: '39MB',
			speed: '2-3 seconds',
			badge: 'Most Accurate'
		},
		{
			id: 'vosk',
			name: '🪶 Lightweight',
			description: 'Smaller offline transcription',
			privacy: '100% offline',
			size: '15MB',
			speed: '1-2 seconds',
			badge: 'Smallest Download'
		}
	];

	const modelSizes = [
		{ id: 'tiny', name: 'Tiny', size: '39MB', quality: 'Good' },
		{ id: 'base', name: 'Base', size: '74MB', quality: 'Better' },
		{ id: 'small', name: 'Small', size: '244MB', quality: 'Best' }
	];

	function selectMode(modeId) {
		hybridTranscriptionService.switchMode(modeId);
	}

	function togglePrivacy() {
		hybridTranscriptionService.togglePrivacyMode(!privacyMode);
	}

	function selectModelSize(size) {
		transcriptionConfig.update((c) => ({ ...c, modelSize: size }));
	}
</script>

<div class="transcription-settings">
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-lg font-bold text-gray-800">Transcription Mode</h3>
		<button
			on:click={() => (showDetails = !showDetails)}
			class="text-sm text-gray-600 transition-colors hover:text-gray-800"
		>
			{showDetails ? 'Hide' : 'Show'} Details
		</button>
	</div>

	<!-- Quick Status -->
	<div
		class="mb-4 rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-rose-50 p-3"
	>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<span class="text-sm font-medium text-gray-700">Current:</span>
				<span class="font-bold text-gray-900">
					{#if currentMode === 'auto'}
						Auto ({recommendation === 'webspeech' ? 'Instant' : 'Offline'})
					{:else if currentMode === 'webspeech'}
						Instant (Browser API)
					{:else}
						Private (Offline)
					{/if}
				</span>
			</div>
			{#if privacyMode}
				<span class="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-800">
					🔒 Privacy Mode
				</span>
			{/if}
		</div>

		{#if showDetails}
			<div
				class="mt-3 space-y-1 border-t border-amber-200 pt-3 text-xs text-gray-600"
				transition:fade
			>
				<div>✅ Web Speech: {$hybridStatus.webSpeechAvailable ? 'Available' : 'Not available'}</div>
				<div>✅ Whisper: Always available (39MB)</div>
				<div>✅ Vosk: Always available (15MB)</div>
				<div>✅ WebGPU: {$hybridStatus.webGPUAvailable ? 'Available' : 'Not available'}</div>
			</div>
		{/if}
	</div>

	<!-- Mode Selection -->
	<div class="mb-4 grid gap-3">
		{#each modes as mode}
			{@const isAvailable =
				mode.id === 'auto' ||
				(mode.id === 'webspeech' && $hybridStatus.webSpeechAvailable) ||
				mode.id === 'whisper' ||
				mode.id === 'vosk'}
			{@const isSelected = currentMode === mode.id}

			<button
				on:click={() => selectMode(mode.id)}
				disabled={!isAvailable}
				class="relative rounded-xl border-2 p-4 text-left transition-all
					{isSelected
					? 'border-amber-400 bg-gradient-to-r from-amber-50 to-rose-50 shadow-md'
					: 'border-gray-200 bg-white hover:border-gray-300'}
					{!isAvailable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}"
			>
				{#if mode.badge}
					<span
						class="absolute right-2 top-2 rounded-full px-2 py-1 text-xs font-bold
						{mode.badge === 'Recommended' ? 'bg-amber-100 text-amber-800' : ''}
						{mode.badge === 'Fastest' ? 'bg-blue-100 text-blue-800' : ''}
						{mode.badge === 'Most Private' ? 'bg-green-100 text-green-800' : ''}"
					>
						{mode.badge}
					</span>
				{/if}

				<div class="mb-1 font-bold text-gray-900">{mode.name}</div>
				<div class="mb-2 text-sm text-gray-600">{mode.description}</div>

				<div class="grid grid-cols-3 gap-2 text-xs">
					<div>
						<span class="text-gray-500">Privacy:</span>
						<div class="font-medium {mode.id === 'whisper' ? 'text-green-600' : 'text-gray-700'}">
							{mode.privacy}
						</div>
					</div>
					<div>
						<span class="text-gray-500">Download:</span>
						<div class="font-medium text-gray-700">{mode.size}</div>
					</div>
					<div>
						<span class="text-gray-500">Speed:</span>
						<div class="font-medium text-gray-700">{mode.speed}</div>
					</div>
				</div>

				{#if mode.availability}
					<div class="mt-2 text-xs text-amber-600">
						⚠️ {mode.availability}
					</div>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Privacy Toggle -->
	<div class="rounded-xl border-2 border-green-200 bg-green-50 p-4">
		<label class="flex cursor-pointer items-center justify-between">
			<div>
				<div class="font-bold text-gray-900">🔒 Privacy Mode</div>
				<div class="text-sm text-gray-600">Always use offline transcription</div>
			</div>
			<input
				type="checkbox"
				checked={privacyMode}
				on:change={togglePrivacy}
				class="toggle toggle-success"
			/>
		</label>

		{#if privacyMode}
			<div class="mt-3 border-t border-green-200 pt-3">
				<div class="mb-2 text-sm font-medium text-gray-700">Offline Engine:</div>
				<div class="grid grid-cols-2 gap-2">
					<button
						on:click={() => transcriptionConfig.update((c) => ({ ...c, offlineEngine: 'whisper' }))}
						class="rounded-lg border-2 p-2 text-sm transition-all
							{$transcriptionConfig.offlineEngine === 'whisper'
							? 'border-green-400 bg-green-100'
							: 'border-gray-200 bg-white hover:border-gray-300'}"
					>
						<div class="font-medium">Whisper</div>
						<div class="text-xs text-gray-600">39MB • Higher accuracy</div>
					</button>
					<button
						on:click={() => transcriptionConfig.update((c) => ({ ...c, offlineEngine: 'vosk' }))}
						class="rounded-lg border-2 p-2 text-sm transition-all
							{$transcriptionConfig.offlineEngine === 'vosk'
							? 'border-green-400 bg-green-100'
							: 'border-gray-200 bg-white hover:border-gray-300'}"
					>
						<div class="font-medium">Vosk</div>
						<div class="text-xs text-gray-600">15MB • Lightweight</div>
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Model Size Selection (only for Whisper mode) -->
	{#if currentMode === 'whisper' || (currentMode === 'auto' && recommendation === 'whisper')}
		<div class="mt-4 rounded-xl border-2 border-gray-200 bg-gray-50 p-4" transition:fly={{ y: 10 }}>
			<h4 class="mb-3 font-bold text-gray-900">Model Size</h4>
			<div class="grid grid-cols-3 gap-2">
				{#each modelSizes as size}
					{@const isSelected = $transcriptionConfig.modelSize === size.id}
					<button
						on:click={() => selectModelSize(size.id)}
						class="rounded-lg border-2 p-3 text-center transition-all
							{isSelected ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white hover:border-gray-300'}"
					>
						<div class="text-sm font-bold">{size.name}</div>
						<div class="text-xs text-gray-600">{size.size}</div>
						<div class="text-xs text-gray-500">{size.quality}</div>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.transcription-settings {
		@apply space-y-3;
	}
</style>
