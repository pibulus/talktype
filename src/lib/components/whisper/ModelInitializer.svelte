<script>
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import {
		whisperService,
		whisperStatus
	} from '../../services/transcription/whisper/whisperService';
	import {
		downloadStatus,
		formatBytes,
		formatETA
	} from '../../services/transcription/whisper/modelDownloader';
	import { selectedModel } from '../../services/transcription/whisper/modelRegistry';

	export let onModelReady = () => {};
	export let showAlways = false;

	let hasInitialized = false;
	let showModal = false;
	let userAccepted = false;
	let error = null;
	let downloadStarted = false;

	onMount(() => {
		checkModelStatus();
	});

	async function checkModelStatus() {
		// Check if model is already loaded
		if ($whisperStatus.isLoaded) {
			console.log('✅ Whisper model already loaded');
			hasInitialized = true;
			onModelReady();
			return;
		}

		// ALWAYS download the model automatically for quality transcription
		console.log('🚀 Auto-downloading Whisper model for quality transcription...');
		await initializeModel();
	}

	async function handleAccept() {
		userAccepted = true;
		localStorage.setItem('talktype_whisper_accepted', 'true');
		await initializeModel();
	}

	async function initializeModel() {
		showModal = false;
		error = null;
		downloadStarted = true;

		try {
			console.log('📦 Starting Whisper model download...');
			const result = await whisperService.preloadModel();
			if (result.success) {
				console.log('✅ Whisper model loaded successfully!');
				hasInitialized = true;
				localStorage.setItem('talktype_whisper_accepted', 'true');
				onModelReady();
			} else {
				console.error('❌ Failed to load Whisper model:', result.error);
				error = result.error?.message || 'Failed to load model';
				// Don't show modal on auto-download failure, just fall back to API
			}
		} catch (err) {
			console.error('❌ Error loading Whisper model:', err);
			error = err.message;
			// Don't show modal on auto-download failure, just fall back to API
		}
	}

	function handleDecline() {
		showModal = false;
		// User declined - they won't be able to use transcription
	}

	// Show modal when user tries to record without model
	export function promptForModel() {
		if (!hasInitialized && !$whisperStatus.isLoaded && !downloadStarted) {
			showModal = true;
		}
	}
</script>

<!-- Download progress indicator (subtle, non-blocking) -->
{#if $downloadStatus.inProgress && !showModal}
	<div 
		class="fixed bottom-20 right-4 z-40 rounded-xl border border-pink-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm"
		transition:fly={{ x: 100, duration: 300 }}
	>
		<div class="flex items-center gap-3">
			<div class="relative h-8 w-8">
				<svg class="h-8 w-8 -rotate-90 transform">
					<circle
						cx="16"
						cy="16"
						r="14"
						stroke="currentColor"
						stroke-width="2"
						fill="none"
						class="text-pink-100"
					/>
					<circle
						cx="16"
						cy="16"
						r="14"
						stroke="currentColor"
						stroke-width="2"
						fill="none"
						stroke-dasharray={88}
						stroke-dashoffset={88 - (88 * $downloadStatus.progress) / 100}
						class="text-pink-400 transition-all duration-300"
					/>
				</svg>
				<span class="absolute inset-0 flex items-center justify-center text-xs font-bold">
					{Math.round($downloadStatus.progress)}%
				</span>
			</div>
			<div>
				<p class="text-xs font-medium text-gray-700">Downloading AI model...</p>
				<p class="text-xs text-gray-500">One-time download for offline magic</p>
			</div>
		</div>
	</div>
{/if}

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