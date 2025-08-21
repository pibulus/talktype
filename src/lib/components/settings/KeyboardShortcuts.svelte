<script>
	import { onMount, onDestroy } from 'svelte';

	let showShortcuts = false;

	// Define only essential shortcuts
	const shortcuts = [
		{ key: 'Space', action: 'Start/Stop Recording', ctrl: false },
		{ key: 'O', action: 'Open Options', ctrl: true },
		{ key: 'T', action: 'Change Theme', ctrl: true }
	];

	// Handle keyboard shortcuts
	function handleKeydown(e) {
		// Ctrl/Cmd + O - Open Options
		if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
			e.preventDefault();
			const modal = document.getElementById('settings_modal');
			if (modal) modal.showModal();
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

<div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
	<div class="flex items-center justify-between">
		<span class="text-sm font-medium text-gray-700">⌨️ Quick Shortcuts</span>
		<div class="flex gap-2">
			{#each shortcuts as shortcut}
				<kbd
					class="rounded border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-xs text-gray-600"
				>
					{shortcut.ctrl ? '⌘' : ''}{shortcut.key}
				</kbd>
			{/each}
		</div>
	</div>
</div>
