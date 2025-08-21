<script>
	import { onMount } from 'svelte';

	// Feature toggles
	let autoSave = false;
	let includeTimestamp = false;
	let filenameFormat = 'transcript';

	// Load saved preferences
	onMount(() => {
		const saved = localStorage.getItem('talktype_quick_features');
		if (saved) {
			const prefs = JSON.parse(saved);
			autoSave = prefs.autoSave || false;
			includeTimestamp = prefs.includeTimestamp || false;
			filenameFormat = prefs.filenameFormat || 'transcript';
		}
	});

	// Save preferences
	function savePrefs() {
		localStorage.setItem(
			'talktype_quick_features',
			JSON.stringify({
				autoSave,
				includeTimestamp,
				filenameFormat
			})
		);

		// Dispatch event for main app
		window.dispatchEvent(
			new CustomEvent('talktype-setting-changed', {
				detail: {
					setting: 'quickFeatures',
					value: { autoSave, includeTimestamp, filenameFormat }
				}
			})
		);
	}

	function toggleAutoSave() {
		autoSave = !autoSave;
		savePrefs();
	}

	function toggleTimestamp() {
		includeTimestamp = !includeTimestamp;
		savePrefs();
	}

	function updateFilenameFormat(format) {
		filenameFormat = format;
		savePrefs();
	}

	// Generate example filename
	$: exampleFilename = () => {
		const date = new Date();
		const dateStr = date.toISOString().split('T')[0];
		const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');

		let name = filenameFormat;
		if (includeTimestamp) {
			name += `_${dateStr}_${timeStr}`;
		}
		return `${name}.txt`;
	};
</script>

<div class="quick-features space-y-3">
	<h4 class="text-sm font-bold text-gray-700">Quick Features</h4>

	<!-- Auto-save Toggle -->
	<div class="rounded-lg border border-blue-200 bg-blue-50 p-3">
		<label class="flex cursor-pointer items-center justify-between">
			<div>
				<div class="text-sm font-medium text-gray-800">💾 Auto-save Transcripts</div>
				<div class="text-xs text-gray-600">Automatically download after each transcription</div>
			</div>
			<input
				type="checkbox"
				bind:checked={autoSave}
				on:change={toggleAutoSave}
				class="toggle toggle-primary toggle-sm"
			/>
		</label>
	</div>

	<!-- Filename Builder -->
	<div class="rounded-lg border border-purple-200 bg-purple-50 p-3">
		<div class="mb-2 text-sm font-medium text-gray-800">📝 Filename Format</div>

		<div class="mb-2 grid grid-cols-3 gap-2">
			<button
				on:click={() => updateFilenameFormat('transcript')}
				class="rounded-lg border px-2 py-1 text-xs transition-all {filenameFormat === 'transcript'
					? 'border-purple-400 bg-purple-200 text-purple-900'
					: 'border-gray-200 bg-white hover:border-gray-300'}"
			>
				transcript
			</button>
			<button
				on:click={() => updateFilenameFormat('talktype')}
				class="rounded-lg border px-2 py-1 text-xs transition-all {filenameFormat === 'talktype'
					? 'border-purple-400 bg-purple-200 text-purple-900'
					: 'border-gray-200 bg-white hover:border-gray-300'}"
			>
				talktype
			</button>
			<button
				on:click={() => updateFilenameFormat('audio')}
				class="rounded-lg border px-2 py-1 text-xs transition-all {filenameFormat === 'audio'
					? 'border-purple-400 bg-purple-200 text-purple-900'
					: 'border-gray-200 bg-white hover:border-gray-300'}"
			>
				audio
			</button>
		</div>

		<label class="flex cursor-pointer items-center gap-2">
			<input
				type="checkbox"
				bind:checked={includeTimestamp}
				on:change={toggleTimestamp}
				class="checkbox-primary checkbox checkbox-xs"
			/>
			<span class="text-xs text-gray-600">Include timestamp</span>
		</label>

		<div class="mt-2 rounded border border-purple-200 bg-white/70 p-2">
			<div class="text-xs text-gray-500">Example:</div>
			<div class="font-mono text-xs text-purple-700">{exampleFilename()}</div>
		</div>
	</div>

	<!-- Export Format -->
	<div class="rounded-lg border border-green-200 bg-green-50 p-3">
		<div class="mb-2 text-sm font-medium text-gray-800">📄 Export Format</div>
		<div class="grid grid-cols-3 gap-2 text-xs">
			<button
				class="rounded border border-green-300 bg-green-100 px-2 py-1 transition-all hover:bg-green-200"
			>
				.txt
			</button>
			<button
				class="cursor-not-allowed rounded border border-gray-200 bg-white px-2 py-1 opacity-50 transition-all hover:border-gray-300"
				disabled
			>
				.srt
			</button>
			<button
				class="cursor-not-allowed rounded border border-gray-200 bg-white px-2 py-1 opacity-50 transition-all hover:border-gray-300"
				disabled
			>
				.vtt
			</button>
		</div>
		<div class="mt-1 text-xs text-gray-500">SRT & VTT coming soon!</div>
	</div>
</div>
