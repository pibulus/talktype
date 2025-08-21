<script>
	import { onMount, onDestroy } from 'svelte';

	let showShortcuts = false;

	// Define shortcuts
	const shortcuts = [
		{ key: 'Space', action: 'Start/Stop Recording', ctrl: false },
		{ key: 'Enter', action: 'Submit Transcription', ctrl: false },
		{ key: 'S', action: 'Download Transcript', ctrl: true },
		{ key: 'C', action: 'Copy to Clipboard', ctrl: true },
		{ key: 'O', action: 'Open Options', ctrl: true },
		{ key: 'T', action: 'Change Theme', ctrl: true },
		{ key: 'Delete', action: 'Clear Text', ctrl: false },
		{ key: '/', action: 'Show Shortcuts', ctrl: true }
	];

	// Handle keyboard shortcuts
	function handleKeydown(e) {
		// Ctrl/Cmd + O - Open Options
		if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
			e.preventDefault();
			const modal = document.getElementById('settings_modal');
			if (modal) modal.showModal();
		}

		// Ctrl/Cmd + / - Show shortcuts
		if ((e.ctrlKey || e.metaKey) && e.key === '/') {
			e.preventDefault();
			showShortcuts = !showShortcuts;
		}

		// Ctrl/Cmd + T - Cycle theme
		if ((e.ctrlKey || e.metaKey) && e.key === 't') {
			e.preventDefault();
			cycleTheme();
		}
	}

	function cycleTheme() {
		// Get current theme and cycle to next
		const themes = ['peach', 'lavender', 'mint', 'sky', 'sunset'];
		const currentTheme = localStorage.getItem('talktype-theme') || 'peach';
		const currentIndex = themes.indexOf(currentTheme);
		const nextIndex = (currentIndex + 1) % themes.length;
		const nextTheme = themes[nextIndex];

		// Apply theme
		window.dispatchEvent(
			new CustomEvent('talktype-setting-changed', {
				detail: { setting: 'theme', value: nextTheme }
			})
		);
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
	});
</script>

<div class="keyboard-shortcuts">
	<button
		on:click={() => (showShortcuts = !showShortcuts)}
		class="w-full rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-3 transition-all hover:from-indigo-100 hover:to-purple-100"
	>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<span class="text-lg">⌨️</span>
				<span class="font-medium text-gray-800">Keyboard Shortcuts</span>
			</div>
			<span class="text-sm text-gray-500">
				{showShortcuts ? '▼' : '▶'}
			</span>
		</div>
	</button>

	{#if showShortcuts}
		<div class="mt-2 space-y-1 rounded-lg border border-gray-200 bg-white/50 p-3">
			{#each shortcuts as shortcut}
				<div class="flex items-center justify-between py-1 text-xs">
					<span class="text-gray-600">{shortcut.action}</span>
					<kbd
						class="rounded border border-gray-300 bg-gray-100 px-2 py-0.5 font-mono text-gray-700"
					>
						{shortcut.ctrl ? '⌘' : ''}{shortcut.key}
					</kbd>
				</div>
			{/each}
		</div>
	{/if}
</div>
