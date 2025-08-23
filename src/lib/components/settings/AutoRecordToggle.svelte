<script>
	export let enabled = false;
	export let onToggle = () => {};
</script>

<div
	class="flex items-center justify-between rounded-xl border border-pink-100 bg-[#fffdf5] p-3 shadow-sm transition-all duration-200 hover:border-pink-200"
>
	<div>
		<span class="text-sm font-medium text-gray-700">Auto-Record on Start</span>
		<p class="mt-0.5 text-xs text-gray-500">Start recording immediately when you open TalkType</p>
	</div>
	<label class="flex cursor-pointer items-center">
		<span class="sr-only">Auto-Record Toggle {enabled ? 'Enabled' : 'Disabled'}</span>
		<div class="relative">
			<input
				type="checkbox"
				class="sr-only"
				id="auto-record-toggle"
				name="auto-record"
				checked={enabled}
				on:change={onToggle}
			/>
			<div
				class={`h-5 w-10 rounded-full ${enabled ? 'bg-pink-400' : 'bg-gray-300'} transition-all duration-200`}
			></div>
			<div
				class={`absolute left-0.5 top-0.5 h-4 w-4 transform rounded-full bg-white transition-all duration-200 ${enabled ? 'translate-x-5' : ''}`}
			></div>
		</div>
	</label>
</div>
