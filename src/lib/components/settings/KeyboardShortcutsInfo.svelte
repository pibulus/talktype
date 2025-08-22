<script>
	let showShortcuts = false;
</script>

<div class="space-y-2">
	<button
		on:click={() => (showShortcuts = !showShortcuts)}
		class="btn btn-ghost btn-sm w-full justify-between"
	>
		<span class="flex items-center gap-2">
			<span>⌨️</span>
			<span>Keyboard Shortcuts</span>
		</span>
		<svg
			class="h-4 w-4 transition-transform duration-200 {showShortcuts ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if showShortcuts}
		<div class="animate-in slide-in-from-top-2 space-y-2 rounded-xl bg-base-200 p-3 duration-200">
			<div class="flex items-center justify-between">
				<span class="text-sm">Start/Stop Recording</span>
				<kbd class="kbd kbd-sm">Space</kbd>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-sm">Clear Transcript</span>
				<kbd class="kbd kbd-sm">Esc</kbd>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-sm">Save Transcript</span>
				<kbd class="kbd kbd-sm">⌘ S</kbd>
			</div>
		</div>
	{/if}
</div>
