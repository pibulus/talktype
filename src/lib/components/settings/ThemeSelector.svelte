<script>
	import ThemeOption from './ThemeOption.svelte';

	export let currentTheme;
	export let onThemeChange;

	// Theme options
	const vibeOptions = [
		{
			id: 'peach',
			name: 'Peach'
		},
		{
			id: 'mint',
			name: 'Mint'
		},
		{
			id: 'bubblegum',
			name: 'Bubblegum'
		},
		{
			id: 'rainbow',
			name: 'Rainbow'
		}
	];
</script>

<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
	{#each vibeOptions as vibe, index}
		<ThemeOption
			{vibe}
			{index}
			active={currentTheme === vibe.id}
			on:select={() => onThemeChange(vibe.id)}
		/>
	{/each}
</div>
