<script>
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import {
		whisperServiceUltimate as whisperService,
		ultimateWhisperStatus as whisperStatus
	} from '../../services/transcription/whisper/whisperServiceUltimate';
	import {
		downloadStatus,
		formatBytes,
		formatETA
	} from '../../services/transcription/whisper/modelDownloader';
	import { selectedEnhancedModel as selectedModel } from '../../services/transcription/whisper/modelRegistryEnhanced';

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
		} else {
			// Auto-download on first visit for seamless experience
			handleAccept();
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
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
		transition:fade={{ duration: 200 }}
	>
		<div
			class="w-full max-w-md overflow-hidden rounded-3xl border-4 border-black bg-white shadow-2xl"
			transition:fly={{ y: 50, duration: 300 }}
		>
			<!-- Header with gradient -->
			<div
				class="border-b-4 border-black bg-gradient-to-r from-amber-400 via-rose-300 to-purple-400 p-6"
			>
				<h2 class="text-2xl font-black text-black">✨ Enable Offline Magic?</h2>
			</div>

			<!-- Content -->
			<div class="space-y-4 p-6">
				{#if error}
					<div class="rounded-xl border-2 border-red-300 bg-red-50 p-4">
						<p class="text-sm text-red-800">{error}</p>
					</div>
				{/if}

				<div class="space-y-3">
					<p class="text-gray-700">
						TalkType can work <strong>completely offline</strong> by downloading a small AI model to
						your device.
					</p>

					<div
						class="rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-rose-50 p-4"
					>
						<h3 class="mb-2 font-bold text-gray-800">What you get:</h3>
						<ul class="space-y-1 text-sm text-gray-600">
							<li>🎯 <strong>Unlimited transcriptions</strong> - no quotas!</li>
							<li>🔒 <strong>100% privacy</strong> - nothing leaves your device</li>
							<li>✈️ <strong>Works offline</strong> - on planes, anywhere!</li>
							<li>⚡ <strong>Super fast</strong> - no network delays</li>
						</ul>
					</div>

					<div class="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
						<div class="mb-1 flex items-center justify-between">
							<span class="text-sm font-medium text-gray-600">Model:</span>
							<span class="text-sm font-bold text-gray-800">{$selectedModel.name}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium text-gray-600">Download size:</span>
							<span class="text-sm font-bold text-gray-800">{formatBytes($selectedModel.size)}</span
							>
						</div>
						<p class="mt-2 text-xs text-gray-500">Downloads once, works forever! 🎉</p>
					</div>
				</div>

				<!-- Action buttons -->
				<div class="flex gap-3 pt-2">
					<button
						on:click={handleAccept}
						class="flex-1 rounded-full border-2 border-black bg-gradient-to-r from-amber-400 to-rose-300 px-6 py-3 font-bold text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
					>
						Enable Magic ✨
					</button>
					<button
						on:click={handleDecline}
						class="px-6 py-3 text-gray-600 transition-colors hover:text-gray-800"
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
		<div class="overflow-hidden rounded-2xl border-2 border-black bg-white shadow-2xl">
			<!-- Header -->
			<div class="bg-gradient-to-r from-amber-400 to-rose-300 px-4 py-3">
				<h3 class="font-bold text-black">Downloading Magic... ✨</h3>
			</div>

			<!-- Content -->
			<div class="p-4">
				<!-- Progress Bar -->
				<div class="mb-3">
					<div class="h-8 overflow-hidden rounded-full bg-gray-200">
						<div
							class="flex h-full items-center justify-center bg-gradient-to-r from-amber-400 to-rose-300 transition-all duration-300"
							style="width: {$downloadStatus.progress}%"
						>
							<span class="px-2 text-xs font-bold text-black">
								{$downloadStatus.progress}%
							</span>
						</div>
					</div>
				</div>

				<!-- Stage indicator -->
				<div class="mb-2 text-sm text-gray-600">
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
					<div class="space-y-1 text-xs text-gray-500">
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
