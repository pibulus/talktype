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

<div
	class="flex items-center justify-between rounded-xl border border-pink-100 bg-[#fffdf5] p-3 shadow-sm transition-all duration-200 hover:border-pink-200"
>
	<div>
		<span class="text-sm font-medium text-gray-700">Auto-Save</span>
		<p class="mt-0.5 text-xs text-gray-500">Automatically save transcripts</p>
	</div>
	<label class="flex cursor-pointer items-center">
		<span class="sr-only">Auto-Save Toggle {isEnabled ? 'Enabled' : 'Disabled'}</span>
		<div class="relative">
			<input
				type="checkbox"
				class="sr-only"
				id="auto-save-toggle"
				name="auto-save"
				checked={isEnabled}
				on:change={toggle}
			/>
			<div
				class={`h-5 w-10 rounded-full ${isEnabled ? 'bg-pink-400' : 'bg-gray-300'} transition-all duration-200`}
			></div>
			<div
				class={`absolute left-0.5 top-0.5 h-4 w-4 transform rounded-full bg-white transition-all duration-200 ${isEnabled ? 'translate-x-5' : ''}`}
			></div>
		</div>
	</label>
</div>
