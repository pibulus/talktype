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
			description: 'Fully offline transcription',
			privacy: '100% offline',
			size: '39MB',
			speed: '2-3 seconds',
			badge: 'Most Private'
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
		transcriptionConfig.update(c => ({ ...c, modelSize: size }));
	}
</script>

<div class="transcription-settings">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-bold text-gray-800">Transcription Mode</h3>
		<button
			on:click={() => showDetails = !showDetails}
			class="text-sm text-gray-600 hover:text-gray-800 transition-colors"
		>
			{showDetails ? 'Hide' : 'Show'} Details
		</button>
	</div>
	
	<!-- Quick Status -->
	<div class="mb-4 p-3 bg-gradient-to-r from-amber-50 to-rose-50 rounded-xl border-2 border-amber-200">
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
				<span class="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
					🔒 Privacy Mode
				</span>
			{/if}
		</div>
		
		{#if showDetails}
			<div class="mt-3 pt-3 border-t border-amber-200 text-xs text-gray-600 space-y-1" transition:fade>
				<div>✅ Web Speech: {$hybridStatus.webSpeechAvailable ? 'Available' : 'Not available'}</div>
				<div>✅ Whisper: Always available</div>
				<div>✅ WebGPU: {$hybridStatus.webGPUAvailable ? 'Available' : 'Not available'}</div>
			</div>
		{/if}
	</div>
	
	<!-- Mode Selection -->
	<div class="grid gap-3 mb-4">
		{#each modes as mode}
			{@const isAvailable = mode.id === 'auto' || 
				(mode.id === 'webspeech' && $hybridStatus.webSpeechAvailable) || 
				mode.id === 'whisper'}
			{@const isSelected = currentMode === mode.id}
			
			<button
				on:click={() => selectMode(mode.id)}
				disabled={!isAvailable}
				class="relative p-4 text-left rounded-xl border-2 transition-all
					{isSelected 
						? 'border-amber-400 bg-gradient-to-r from-amber-50 to-rose-50 shadow-md' 
						: 'border-gray-200 hover:border-gray-300 bg-white'}
					{!isAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
			>
				{#if mode.badge}
					<span class="absolute top-2 right-2 px-2 py-1 text-xs font-bold rounded-full
						{mode.badge === 'Recommended' ? 'bg-amber-100 text-amber-800' : ''}
						{mode.badge === 'Fastest' ? 'bg-blue-100 text-blue-800' : ''}
						{mode.badge === 'Most Private' ? 'bg-green-100 text-green-800' : ''}">
						{mode.badge}
					</span>
				{/if}
				
				<div class="font-bold text-gray-900 mb-1">{mode.name}</div>
				<div class="text-sm text-gray-600 mb-2">{mode.description}</div>
				
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
	<div class="p-4 bg-green-50 rounded-xl border-2 border-green-200">
		<label class="flex items-center justify-between cursor-pointer">
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
	</div>
	
	<!-- Model Size Selection (only for Whisper mode) -->
	{#if currentMode === 'whisper' || (currentMode === 'auto' && recommendation === 'whisper')}
		<div class="mt-4 p-4 bg-gray-50 rounded-xl border-2 border-gray-200" transition:fly={{ y: 10 }}>
			<h4 class="font-bold text-gray-900 mb-3">Model Size</h4>
			<div class="grid grid-cols-3 gap-2">
				{#each modelSizes as size}
					{@const isSelected = $transcriptionConfig.modelSize === size.id}
					<button
						on:click={() => selectModelSize(size.id)}
						class="p-3 rounded-lg border-2 transition-all text-center
							{isSelected 
								? 'border-amber-400 bg-amber-50' 
								: 'border-gray-200 hover:border-gray-300 bg-white'}"
					>
						<div class="font-bold text-sm">{size.name}</div>
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