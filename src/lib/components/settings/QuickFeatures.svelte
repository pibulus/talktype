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

<!-- Auto-save Toggle -->
<div class="rounded-lg border border-blue-200 bg-blue-50 p-3">
	<label class="flex cursor-pointer items-center justify-between">
		<div>
			<div class="text-sm font-medium text-gray-800">💾 Auto-save Transcripts</div>
			<div class="text-xs text-gray-600">Download automatically after each recording</div>
		</div>
		<input
			type="checkbox"
			bind:checked={autoSave}
			on:change={toggleAutoSave}
			class="toggle toggle-primary toggle-sm"
		/>
	</label>

	{#if autoSave}
		<div class="mt-2 flex items-center gap-2 border-t border-blue-200 pt-2">
			<label class="flex cursor-pointer items-center gap-1.5">
				<input
					type="checkbox"
					bind:checked={includeTimestamp}
					on:change={toggleTimestamp}
					class="checkbox-primary checkbox checkbox-xs"
				/>
				<span class="text-xs text-gray-600">Add timestamp</span>
			</label>
			<span class="text-xs text-gray-400">•</span>
			<span class="font-mono text-xs text-gray-500">
				{exampleFilename()}
			</span>
		</div>
	{/if}
</div>
