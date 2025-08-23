<script>
	let showShortcuts = false;
</script>

<div class="space-y-2">
	<button
		on:click={() => (showShortcuts = !showShortcuts)}
		class="flex w-full items-center justify-between rounded-xl border border-pink-100 bg-[#fffdf5] p-3 shadow-sm transition-all duration-200 hover:border-pink-200"
	>
		<span class="text-sm font-medium text-gray-700">Keyboard Shortcuts</span>
		<svg
			class="h-4 w-4 text-gray-500 transition-transform duration-200 {showShortcuts
				? 'rotate-180'
				: ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if showShortcuts}
		<div class="animate-in slide-in-from-top-2 space-y-2 rounded-xl bg-pink-50 p-4 duration-200">
			<div class="flex items-center justify-between">
				<span class="text-sm text-gray-700">Start/Stop Recording</span>
				<kbd
					class="rounded-md border border-pink-200 bg-white px-2 py-1 text-xs font-medium text-gray-700"
					>Space</kbd
				>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-sm text-gray-700">Clear Transcript</span>
				<kbd
					class="rounded-md border border-pink-200 bg-white px-2 py-1 text-xs font-medium text-gray-700"
					>Esc</kbd
				>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-sm text-gray-700">Save Transcript</span>
				<kbd
					class="rounded-md border border-pink-200 bg-white px-2 py-1 text-xs font-medium text-gray-700"
					>⌘ S</kbd
				>
			</div>
		</div>
	{/if}
</div>

<style>
	@keyframes slide-in-from-top-2 {
		from {
			transform: translateY(-8px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.animate-in {
		animation: slide-in-from-top-2 0.2s ease-out;
	}
</style>