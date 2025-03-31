<script>
	// Props
	export let onClick = () => {};
	export let position = 'top-3 right-3';
	export let size = 'h-5 w-5';
	export let showToast = false;

	// CSS classes computed from props
	$: positionClasses = position;
	$: sizeClasses = size;
</script>

<button
	class="copy-button absolute {positionClasses} rounded-full p-2 text-purple-400 transition-all duration-200 hover:bg-pink-50 hover:text-purple-600"
	on:click|preventDefault|stopPropagation={onClick}
	aria-label="Copy to clipboard"
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		class={sizeClasses}
		viewBox="0 0 20 20"
		fill="currentColor"
	>
		<path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
		<path
			d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"
		/>
	</svg>
</button>

<style>
	.copy-button {
		opacity: 0.7;
		z-index: 20;
	}

	.copy-button:hover {
		opacity: 1;
		transform: scale(1.05);
	}
</style>
