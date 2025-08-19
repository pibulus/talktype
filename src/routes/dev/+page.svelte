<script>
	import { dev } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	
	let GhostTestContainer;
	
	onMount(async () => {
		if (!dev) {
			// Redirect to home in production
			goto('/');
			return;
		}
		
		// Lazy load the test container in dev only
		const module = await import('$lib/components/ghostTest/GhostTestContainer.svelte');
		GhostTestContainer = module.default;
	});
</script>

{#if dev && GhostTestContainer}
	<div class="dev-container">
		<div class="dev-header">
			<h1>Ghost Component Test Suite</h1>
			<a href="/" class="back-link">← Back to App</a>
		</div>
		<svelte:component this={GhostTestContainer} />
	</div>
{:else if dev}
	<div class="loading">Loading test suite...</div>
{:else}
	<div class="redirect">Redirecting...</div>
{/if}

<style>
	.dev-container {
		min-height: 100vh;
		background: #1a1a1a;
		color: white;
		padding: 1rem;
	}
	
	.dev-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid #333;
	}
	
	.dev-header h1 {
		margin: 0;
		font-size: 1.5rem;
		color: #ff69b4;
	}
	
	.back-link {
		color: #87ceeb;
		text-decoration: none;
		padding: 0.5rem 1rem;
		border: 1px solid #87ceeb;
		border-radius: 4px;
		transition: all 0.3s ease;
	}
	
	.back-link:hover {
		background: #87ceeb;
		color: #1a1a1a;
	}
	
	.loading, .redirect {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		font-size: 1.2rem;
		color: #666;
	}
</style>