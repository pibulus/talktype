<script>
	import { autoSave } from '$lib';

	$: isEnabled = $autoSave === 'true';

	function toggle() {
		const newValue = isEnabled ? 'false' : 'true';
		$autoSave = newValue;

		// Dispatch event for main app
		window.dispatchEvent(
			new CustomEvent('talktype-setting-changed', {
				detail: { setting: 'autoSave', value: newValue === 'true' }
			})
		);
	}
</script>

<label
	class="label cursor-pointer justify-between rounded-xl border border-base-200 p-3 transition-colors hover:border-primary/30"
>
	<div class="flex items-center gap-3">
		<span class="text-lg">💾</span>
		<div>
			<span class="label-text font-medium">Auto-Save</span>
			<p class="mt-0.5 text-xs opacity-60">Automatically save transcripts</p>
		</div>
	</div>
	<input
		type="checkbox"
		class="toggle toggle-primary"
		checked={isEnabled}
		on:change={toggle}
		aria-label="Toggle auto-save"
	/>
</label>
