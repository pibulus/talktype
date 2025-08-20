<script>
	export let title = '';
	export let description = '';
	export let showBorder = true;
	export let spacing = 'space-y-2';
</script>

<div class={`${spacing} ${showBorder ? 'mb-2' : ''}`}>
	{#if title}
		<h4 class="text-sm font-bold text-gray-700">{title}</h4>
	{/if}

	{#if showBorder}
		<div
			class="mb-2 rounded-xl border border-pink-100 bg-[#fffdf5] p-2 shadow-sm transition-all duration-200 hover:border-pink-200"
		>
			{#if description}
				<div class="mb-2">
					<span class="text-sm font-medium text-gray-700">{$$props.label || ''}</span>
					<p class="mt-0.5 text-xs text-gray-500">{description}</p>
				</div>
			{/if}
			<slot />
		</div>
	{:else}
		{#if description}
			<p class="mb-2 text-xs text-gray-500">{description}</p>
		{/if}
		<slot />
	{/if}
</div>

<style>
	/* Consistent section styling */
	:global(.settings-section) {
		margin-bottom: 0.5rem;
	}
</style>
