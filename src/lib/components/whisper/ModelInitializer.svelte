<script>
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { whisperService, whisperStatus } from '../../services/transcription/whisper/whisperService';
	import { downloadStatus, formatBytes, formatETA } from '../../services/transcription/whisper/modelDownloader';
	import { selectedModel } from '../../services/transcription/whisper/modelRegistry';

	export let onModelReady = () => {};
	export let showAlways = false;

	let hasInitialized = false;
	let showModal = false;
	let userAccepted = false;
	let error = null;

	onMount(() => {
		checkModelStatus();
	});

	async function checkModelStatus() {
		// Check if model is already loaded
		if ($whisperStatus.isLoaded) {
			hasInitialized = true;
			onModelReady();
			return;
		}

		// Check localStorage to see if user has previously accepted
		const previouslyAccepted = localStorage.getItem('talktype_whisper_accepted');
		if (previouslyAccepted === 'true') {
			await initializeModel();
		} else if (showAlways) {
			showModal = true;
		}
	}

	async function handleAccept() {
		userAccepted = true;
		localStorage.setItem('talktype_whisper_accepted', 'true');
		await initializeModel();
	}

	async function initializeModel() {
		showModal = false;
		error = null;

		try {
			const result = await whisperService.preloadModel();
			if (result.success) {
				hasInitialized = true;
				onModelReady();
			} else {
				error = result.error?.message || 'Failed to load model';
				showModal = true;
			}
		} catch (err) {
			error = err.message;
			showModal = true;
		}
	}

	function handleDecline() {
		showModal = false;
		// User declined - they won't be able to use transcription
	}

	// Show modal when user tries to record without model
	export function promptForModel() {
		if (!hasInitialized && !$whisperStatus.isLoaded) {
			showModal = true;
		}
	}
</script>

{#if showModal && !hasInitialized}
	<div 
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
		transition:fade={{ duration: 200 }}
	>
		<div 
			class="bg-white rounded-3xl shadow-2xl border-4 border-black max-w-md w-full overflow-hidden"
			transition:fly={{ y: 50, duration: 300 }}
		>
			<!-- Header with gradient -->
			<div class="bg-gradient-to-r from-amber-400 via-rose-300 to-purple-400 p-6 border-b-4 border-black">
				<h2 class="text-2xl font-black text-black">
					✨ Enable Offline Magic?
				</h2>
			</div>

			<!-- Content -->
			<div class="p-6 space-y-4">
				{#if error}
					<div class="bg-red-50 border-2 border-red-300 rounded-xl p-4">
						<p class="text-red-800 text-sm">{error}</p>
					</div>
				{/if}

				<div class="space-y-3">
					<p class="text-gray-700">
						TalkType can work <strong>completely offline</strong> by downloading a small AI model to your device.
					</p>

					<div class="bg-gradient-to-r from-amber-50 to-rose-50 rounded-xl p-4 border-2 border-amber-200">
						<h3 class="font-bold text-gray-800 mb-2">What you get:</h3>
						<ul class="space-y-1 text-sm text-gray-600">
							<li>🎯 <strong>Unlimited transcriptions</strong> - no quotas!</li>
							<li>🔒 <strong>100% privacy</strong> - nothing leaves your device</li>
							<li>✈️ <strong>Works offline</strong> - on planes, anywhere!</li>
							<li>⚡ <strong>Super fast</strong> - no network delays</li>
						</ul>
					</div>

					<div class="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
						<div class="flex items-center justify-between mb-1">
							<span class="text-sm font-medium text-gray-600">Model:</span>
							<span class="text-sm font-bold text-gray-800">{$selectedModel.name}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium text-gray-600">Download size:</span>
							<span class="text-sm font-bold text-gray-800">{formatBytes($selectedModel.size)}</span>
						</div>
						<p class="text-xs text-gray-500 mt-2">
							Downloads once, works forever! 🎉
						</p>
					</div>
				</div>

				<!-- Action buttons -->
				<div class="flex gap-3 pt-2">
					<button
						on:click={handleAccept}
						class="flex-1 bg-gradient-to-r from-amber-400 to-rose-300 text-black font-bold py-3 px-6 rounded-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
					>
						Enable Magic ✨
					</button>
					<button
						on:click={handleDecline}
						class="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
					>
						Maybe later
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

{#if $downloadStatus.inProgress}
	<div 
		class="fixed bottom-4 right-4 z-40 w-96 max-w-[calc(100vw-2rem)]"
		transition:fly={{ y: 100, duration: 300 }}
	>
		<div class="bg-white rounded-2xl shadow-2xl border-2 border-black overflow-hidden">
			<!-- Header -->
			<div class="bg-gradient-to-r from-amber-400 to-rose-300 px-4 py-3">
				<h3 class="font-bold text-black">
					Downloading Magic... ✨
				</h3>
			</div>

			<!-- Content -->
			<div class="p-4">
				<!-- Progress Bar -->
				<div class="mb-3">
					<div class="h-8 bg-gray-200 rounded-full overflow-hidden">
						<div 
							class="h-full bg-gradient-to-r from-amber-400 to-rose-300 transition-all duration-300 flex items-center justify-center"
							style="width: {$downloadStatus.progress}%"
						>
							<span class="text-xs font-bold text-black px-2">
								{$downloadStatus.progress}%
							</span>
						</div>
					</div>
				</div>

				<!-- Stage indicator -->
				<div class="text-sm text-gray-600 mb-2">
					{#if $downloadStatus.stage === 'initializing'}
						Preparing download...
					{:else if $downloadStatus.stage === 'downloading'}
						Downloading {$selectedModel.name}
					{:else if $downloadStatus.stage === 'loading'}
						Loading model into memory...
					{:else if $downloadStatus.stage === 'ready'}
						Almost ready!
					{:else}
						Processing...
					{/if}
				</div>

				{#if $downloadStatus.bytesTotal > 0}
					<div class="text-xs text-gray-500 space-y-1">
						<div>
							{formatBytes($downloadStatus.bytesLoaded)} / {formatBytes($downloadStatus.bytesTotal)}
						</div>
						{#if $downloadStatus.speed > 0}
							<div>
								Speed: {formatBytes($downloadStatus.speed)}/s
							</div>
						{/if}
						{#if $downloadStatus.eta > 0}
							<div>
								Time remaining: {formatETA($downloadStatus.eta)}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}