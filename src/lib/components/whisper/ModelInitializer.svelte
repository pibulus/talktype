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
		console.log('[ModelInitializer] Component mounted, waiting for user interaction...');
		// Don't auto-check on mount - wait for user interaction (SEO optimization)
	});

	async function checkModelStatus() {
		// Only run in browser
		if (typeof window === 'undefined') return;
		
		// Check if model is already loaded
		if ($whisperStatus.isLoaded) {
			console.log('[ModelInitializer] Model already loaded, skipping initialization');
			hasInitialized = true;
			onModelReady();
			return;
		}

		// Initialize the model when called
		console.log('[ModelInitializer] Initializing model on user interaction...');
		await initializeModel();
	}

	// Removed handleAccept - auto-initializing silently now

	async function initializeModel() {
		// Silent initialization - no UI
		showModal = false;
		error = null;

		try {
			console.log('[ModelInitializer] Starting model preload...');
			const result = await whisperService.preloadModel();
			if (result.success) {
				console.log('[ModelInitializer] ✅ Model loaded successfully!');
				hasInitialized = true;
				onModelReady();
			} else {
				console.error('[ModelInitializer] ❌ Failed to load model:', result.error?.message || 'Unknown error');
				error = result.error?.message || 'Failed to load model';
				// Don't show modal - just log the error
			}
		} catch (err) {
			console.error('[ModelInitializer] ❌ Exception during model load:', err.message);
			error = err.message;
			// Don't show modal - just log the error
		}
	}

	// Removed handleDecline - no longer showing modal

	// Silently ensure model is loaded when user tries to record
	export function promptForModel() {
		if (!hasInitialized && !$whisperStatus.isLoaded) {
			console.log('[ModelInitializer] Model not loaded, checking and initializing now...');
			checkModelStatus();
		}
	}
</script>

<!-- Modal removed - loading happens silently now -->

<!-- Download progress is now logged to console only -->
{#if $downloadStatus.inProgress}
	{@const logProgress = (() => {
		const stage = $downloadStatus.stage;
		const progress = $downloadStatus.progress;
		const speed = $downloadStatus.speed;
		const eta = $downloadStatus.eta;
		
		let stageText = 'Processing...';
		if (stage === 'initializing') stageText = 'Preparing download...';
		else if (stage === 'downloading') stageText = `Downloading ${$selectedModel.name}`;
		else if (stage === 'loading') stageText = 'Loading model into memory...';
		else if (stage === 'ready') stageText = 'Almost ready!';
		
		console.log(`[Download Progress] ${stageText} - ${progress}%`);
		
		if ($downloadStatus.bytesTotal > 0) {
			console.log(`[Download Progress] ${formatBytes($downloadStatus.bytesLoaded)} / ${formatBytes($downloadStatus.bytesTotal)}`);
			if (speed > 0) {
				console.log(`[Download Progress] Speed: ${formatBytes(speed)}/s`);
			}
			if (eta > 0) {
				console.log(`[Download Progress] ETA: ${formatETA(eta)}`);
			}
		}
		return null;
	})()}
{/if}
