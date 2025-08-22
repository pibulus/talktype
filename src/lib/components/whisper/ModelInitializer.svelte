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
			// Don't auto-download on first visit - let API handle it
			// User can manually trigger download from the modal if they want offline
			console.log('📡 Using online transcription - offline model available on demand');
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

<!-- Download progress modal removed - not working properly -->
