<script>
	import { onMount } from 'svelte';
	import { whisperServiceUltimate, ultimateWhisperStatus } from '$lib/services/transcription/whisper/whisperServiceUltimate';
	import { downloadStatus } from '$lib/services/transcription/whisper/modelDownloader';
	import { formatBytes, formatETA } from '$lib/services/transcription/whisper/modelDownloader';
	import { checkWebGPUSupport, ENHANCED_MODELS } from '$lib/services/transcription/whisper/modelRegistryEnhanced';

	let isLoading = false;
	let transcribing = false;
	let downloadComplete = false;
	let error = null;
	let startTime = null;
	let totalTime = null;
	let selectedModel = 'distil-small-real';
	let webgpuInfo = null;
	let mediaRecorder = null;
	let audioChunks = [];
	let isRecording = false;
	let transcriptionResult = '';
	let testMode = 'download'; // 'download' or 'transcribe'

	// Subscribe to download status
	let currentStatus = {};
	downloadStatus.subscribe((status) => {
		currentStatus = status;
	});

	// Subscribe to whisper status
	let whisperStatus = {};
	ultimateWhisperStatus.subscribe((status) => {
		whisperStatus = status;
	});

	onMount(async () => {
		webgpuInfo = await checkWebGPUSupport();
	});

	async function testDownload() {
		isLoading = true;
		downloadComplete = false;
		error = null;
		startTime = Date.now();
		transcriptionResult = '';

		try {
			console.log(`🚀 Starting download test for ${selectedModel}...`);
			const result = await whisperServiceUltimate.preloadModel(selectedModel);

			if (result.success) {
				const endTime = Date.now();
				totalTime = ((endTime - startTime) / 1000).toFixed(2);
				downloadComplete = true;
				console.log(`✨ Download complete in ${totalTime} seconds!`);
			} else {
				error = result.error?.message || 'Download failed';
			}
		} catch (err) {
			error = err.message;
			console.error('Download test failed:', err);
		} finally {
			isLoading = false;
		}
	}

	async function startRecording() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mediaRecorder = new MediaRecorder(stream);
			audioChunks = [];

			mediaRecorder.ondataavailable = (event) => {
				audioChunks.push(event.data);
			};

			mediaRecorder.onstop = async () => {
				const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
				await transcribeAudio(audioBlob);
			};

			mediaRecorder.start();
			isRecording = true;
		} catch (err) {
			error = `Microphone access failed: ${err.message}`;
		}
	}

	function stopRecording() {
		if (mediaRecorder && isRecording) {
			mediaRecorder.stop();
			mediaRecorder.stream.getTracks().forEach(track => track.stop());
			isRecording = false;
		}
	}

	async function transcribeAudio(audioBlob) {
		transcribing = true;
		error = null;
		transcriptionResult = '';

		try {
			// Ensure model is loaded
			if (!whisperStatus.isLoaded) {
				await testDownload();
			}

			const result = await whisperServiceUltimate.transcribe(audioBlob);
			
			if (result.success) {
				transcriptionResult = result.text;
			} else {
				error = result.error || 'Transcription failed';
			}
		} catch (err) {
			error = `Transcription error: ${err.message}`;
		} finally {
			transcribing = false;
		}
	}

	function getSpeedClass(speed) {
		if (!speed) return '';
		const mbps = speed / (1024 * 1024);
		if (mbps > 5) return 'text-green-500';
		if (mbps > 2) return 'text-yellow-500';
		return 'text-red-500';
	}

	function getModelInfo(modelId) {
		return ENHANCED_MODELS.find(m => m.id === modelId);
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 p-8">
	<div class="mx-auto max-w-5xl">
		<h1 class="mb-2 text-5xl font-bold text-white">🧪 TalkType Test Suite</h1>
		<p class="mb-8 text-xl text-pink-200">
			Test model downloads and transcription performance
		</p>

		<!-- Mode Selector -->
		<div class="mb-6 flex gap-4">
			<button
				on:click={() => testMode = 'download'}
				class="flex-1 rounded-xl px-6 py-3 font-bold text-white transition-all {testMode === 'download' ? 'bg-purple-600' : 'bg-white/20 hover:bg-white/30'}"
			>
				📥 Download Test
			</button>
			<button
				on:click={() => testMode = 'transcribe'}
				class="flex-1 rounded-xl px-6 py-3 font-bold text-white transition-all {testMode === 'transcribe' ? 'bg-purple-600' : 'bg-white/20 hover:bg-white/30'}"
			>
				🎤 Transcription Test
			</button>
		</div>

		<!-- Status Cards -->
		<div class="mb-6 grid gap-4 md:grid-cols-2">
			<!-- WebGPU Status -->
			<div class="rounded-xl border-2 border-white/20 bg-black/30 p-4 backdrop-blur-md">
				<h3 class="mb-2 font-bold text-white">🎮 WebGPU Status</h3>
				{#if webgpuInfo}
					{#if webgpuInfo.supported}
						<div class="text-green-400">✅ Available (10-100x faster)</div>
					{:else}
						<div class="text-yellow-400">⚠️ Not Available</div>
						<div class="text-xs text-white/60">{webgpuInfo.reason}</div>
					{/if}
				{:else}
					<div class="text-white/60">Checking...</div>
				{/if}
			</div>

			<!-- Model Status -->
			<div class="rounded-xl border-2 border-white/20 bg-black/30 p-4 backdrop-blur-md">
				<h3 class="mb-2 font-bold text-white">📦 Model Status</h3>
				{#if whisperStatus.isLoaded}
					<div class="text-green-400">✅ Ready ({selectedModel})</div>
				{:else if whisperStatus.isLoading}
					<div class="text-yellow-400">⏳ Loading... {whisperStatus.progress}%</div>
				{:else}
					<div class="text-white/60">Not loaded</div>
				{/if}
			</div>
		</div>

		<!-- Model Selector -->
		<div class="mb-6 rounded-xl border-2 border-white/20 bg-black/30 p-4 backdrop-blur-md">
			<label class="mb-2 block font-bold text-white">Select Model:</label>
			<select
				bind:value={selectedModel}
				class="w-full rounded-lg bg-white/20 p-3 text-white"
				disabled={isLoading || transcribing}
			>
				<option value="distil-small-real">Small English (154MB) - Default</option>
				<option value="distil-tiny">Tiny (39MB) - Fastest</option>
				<option value="tiny-q8">Tiny Quantized (10MB) - Smallest</option>
				<option value="whisper-small-en">Small English (154MB) - Stable</option>
				<option value="whisper-small">Small Multilingual (154MB) - 100+ Languages</option>
			</select>
			{#if getModelInfo(selectedModel)}
				<div class="mt-2 text-sm text-white/70">
					{getModelInfo(selectedModel).description}
				</div>
			{/if}
		</div>

		<!-- Main Test Area -->
		<div class="rounded-2xl border-4 border-white/20 bg-black/30 p-6 backdrop-blur-md">
			{#if testMode === 'download'}
				<!-- Download Test -->
				{#if !isLoading && !downloadComplete}
					<button
						on:click={testDownload}
						class="w-full transform rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-8 py-6 text-2xl font-bold text-white transition-all hover:scale-105"
					>
						Start Download Test
					</button>
				{/if}

				{#if isLoading}
					<div class="space-y-4">
						<h2 class="text-2xl font-bold text-white">
							📥 Downloading {getModelInfo(selectedModel)?.name || selectedModel}
						</h2>
						
						<!-- Progress Bar -->
						<div class="relative h-8 overflow-hidden rounded-full border-2 border-white/30 bg-black/50">
							<div
								class="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-300"
								style="width: {currentStatus.progress || 0}%"
							/>
						</div>

						<!-- Stats -->
						<div class="grid grid-cols-2 gap-4 text-white">
							<div class="rounded-lg bg-white/10 p-3">
								<div class="text-sm opacity-70">Speed</div>
								<div class="text-xl font-bold {getSpeedClass(currentStatus.speed)}">
									{currentStatus.speed ? formatBytes(currentStatus.speed) + '/s' : 'Calculating...'}
								</div>
							</div>
							<div class="rounded-lg bg-white/10 p-3">
								<div class="text-sm opacity-70">ETA</div>
								<div class="text-xl font-bold text-yellow-300">
									{formatETA(currentStatus.eta)}
								</div>
							</div>
						</div>
					</div>
				{/if}

				{#if downloadComplete}
					<div class="space-y-4 text-center">
						<div class="text-6xl">🎉</div>
						<h2 class="text-3xl font-bold text-white">Download Complete!</h2>
						<div class="font-mono text-xl text-green-400">
							Time: {totalTime} seconds
						</div>
						<button
							on:click={() => { downloadComplete = false; error = null; }}
							class="rounded-xl bg-white/20 px-6 py-3 font-bold text-white hover:bg-white/30"
						>
							Test Again
						</button>
					</div>
				{/if}
			{:else}
				<!-- Transcription Test -->
				<div class="space-y-4">
					{#if !isRecording}
						<button
							on:click={startRecording}
							disabled={transcribing}
							class="w-full transform rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-6 text-2xl font-bold text-white transition-all hover:scale-105 disabled:opacity-50"
						>
							🎤 Start Recording
						</button>
					{:else}
						<button
							on:click={stopRecording}
							class="w-full transform rounded-xl bg-gradient-to-r from-red-500 to-pink-600 px-8 py-6 text-2xl font-bold text-white transition-all hover:scale-105 animate-pulse"
						>
							⏹️ Stop Recording
						</button>
					{/if}

					{#if transcribing}
						<div class="rounded-xl bg-blue-500/20 p-4 text-center">
							<div class="text-xl font-bold text-white">🔄 Transcribing...</div>
						</div>
					{/if}

					{#if transcriptionResult}
						<div class="rounded-xl bg-green-500/20 p-4">
							<h3 class="mb-2 font-bold text-white">📝 Transcription Result:</h3>
							<p class="text-white">{transcriptionResult}</p>
						</div>
					{/if}
				</div>
			{/if}

			{#if error}
				<div class="mt-4 rounded-xl border-2 border-red-500 bg-red-500/20 p-4">
					<h3 class="mb-2 text-xl font-bold text-red-400">Error</h3>
					<p class="text-white">{error}</p>
				</div>
			{/if}
		</div>

		<!-- Info Panel -->
		<div class="mt-6 rounded-xl bg-white/10 p-4 text-sm text-white/80">
			<h3 class="mb-2 font-bold">ℹ️ Testing Notes:</h3>
			<ul class="list-inside list-disc space-y-1">
				<li>Models are cached after first download</li>
				<li>WebGPU provides 10-100x speed boost if available</li>
				<li>Tiny models load in 2-3 seconds, perfect for instant start</li>
				<li>Test with Chrome DevTools network throttling for slow connections</li>
			</ul>
		</div>
	</div>
</div>