<script>
	export let variant = 'primary'; // primary, secondary, ghost, outline
	export let size = 'md'; // sm, md, lg
	export let disabled = false;
	export let loading = false;
	export let fullWidth = false;
	export let type = 'button';

	const variantClasses = {
		primary: 'btn-primary',
		secondary: 'btn-secondary',
		ghost: 'btn-ghost',
		outline: 'btn-outline'
	};

	const sizeClasses = {
		sm: 'btn-sm',
		md: '',
		lg: 'btn-lg'
	};

	$: buttonClass = `btn ${variantClasses[variant]} ${sizeClasses[size]} ${
		fullWidth ? 'w-full' : ''
	} ${loading ? 'loading' : ''}`;
</script>

<button class={buttonClass} {disabled} {type} on:click>
	{#if !loading}
		<slot />
	{/if}
</button>
