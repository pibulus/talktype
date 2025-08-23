<script>
	export let label = '';
	export let value = '';
	export let options = [];
	export let disabled = false;
	export let placeholder = 'Choose an option';
	export let id = '';

	function handleChange(event) {
		value = event.target.value;
	}
</script>

<div class="form-control w-full">
	{#if label}
		<label class="label" for={id || label}>
			<span class="label-text text-xs font-medium uppercase tracking-widest text-gray-500"
				>{label}</span
			>
		</label>
	{/if}
	<select
		class="select select-bordered select-sm w-full bg-white/70 backdrop-blur-sm"
		bind:value
		on:change={handleChange}
		on:change
		{disabled}
		{id}
	>
		{#if placeholder}
			<option disabled selected value="">{placeholder}</option>
		{/if}
		{#each options as option}
			{#if typeof option === 'object'}
				<option value={option.value} disabled={option.disabled}>
					{option.label}
					{#if option.description}
						<span class="text-gray-500">- {option.description}</span>
					{/if}
				</option>
			{:else}
				<option value={option}>{option}</option>
			{/if}
		{/each}
	</select>
</div>
