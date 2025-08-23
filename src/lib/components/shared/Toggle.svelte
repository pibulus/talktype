<script>
	export let label = '';
	export let checked = false;
	export let disabled = false;
	export let description = '';
	export let id = '';

	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	function handleChange(event) {
		checked = event.target.checked;
		dispatch('change', checked);
	}
</script>

<div class="form-control">
	<label class="label cursor-pointer justify-start gap-3" for={id || label}>
		<input
			type="checkbox"
			class="toggle toggle-primary toggle-sm"
			bind:checked
			on:change={handleChange}
			on:change
			{disabled}
			{id}
		/>
		<div class="flex-1">
			{#if label}
				<span class="label-text font-medium text-gray-700">{label}</span>
			{/if}
			{#if description}
				<p class="mt-0.5 text-xs text-gray-500">{description}</p>
			{/if}
		</div>
	</label>
</div>
