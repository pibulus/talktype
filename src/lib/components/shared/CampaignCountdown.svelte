<script>
	/**
	 * Campaign Countdown Component - Modular & Reusable!
	 *
	 * Copy this to any app to show real-time campaign progress
	 * Just update the API endpoint URL
	 *
	 * Usage:
	 *   <CampaignCountdown apiUrl="/api/campaign-status" />
	 */

	import { onMount } from 'svelte';

	export let apiUrl = '/api/campaign-status';
	export let showPercentage = false;
	export let refreshInterval = 30000; // Refresh every 30s
	export let variant = 'compact'; // 'compact' | 'badge' | 'banner'

	let status = {
		isActive: false,
		remaining: 0,
		total: 100,
		sold: 0,
		percentage: 0,
		showUrgency: false,
		config: {
			name: 'Launch Special',
			showCountdown: true
		}
	};

	let loading = true;
	let error = null;

	async function fetchStatus() {
		try {
			const response = await fetch(apiUrl);
			if (response.ok) {
				status = await response.json();
				loading = false;
				error = null;
			} else {
				throw new Error('Failed to fetch campaign status');
			}
		} catch (err) {
			console.error('Campaign countdown error:', err);
			error = err.message;
			loading = false;
		}
	}

	onMount(() => {
		fetchStatus();

		// Refresh periodically
		const interval = setInterval(fetchStatus, refreshInterval);

		return () => clearInterval(interval);
	});

	// Don't show anything if campaign is inactive or not configured to show
	$: shouldDisplay = status.isActive && status.config.showCountdown && !loading;
</script>

{#if shouldDisplay}
	{#if variant === 'badge'}
		<!-- Badge style - small and inline -->
		<span
			class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
			class:bg-rose-100={status.showUrgency}
			class:text-rose-700={status.showUrgency}
			class:bg-amber-100={!status.showUrgency}
			class:text-amber-700={!status.showUrgency}
			class:animate-pulse={status.showUrgency}
		>
			{#if status.showUrgency}
				🔥
			{:else}
				⏳
			{/if}
			<span>{status.remaining} / {status.total} left</span>
		</span>
	{:else if variant === 'banner'}
		<!-- Banner style - full width with urgency -->
		<div
			class="w-full rounded-lg p-3 text-center font-semibold"
			class:bg-gradient-to-r={status.showUrgency}
			class:from-rose-500={status.showUrgency}
			class:to-pink-500={status.showUrgency}
			class:text-white={status.showUrgency}
			class:bg-amber-50={!status.showUrgency}
			class:text-amber-800={!status.showUrgency}
			class:animate-pulse={status.showUrgency}
		>
			{#if status.showUrgency}
				<div class="flex items-center justify-center gap-2">
					<span class="text-xl">🔥</span>
					<span class="text-sm">Only {status.remaining} spots left!</span>
					<span class="text-xl">🔥</span>
				</div>
			{:else}
				<div class="text-sm">
					<span class="font-bold">{status.remaining}</span> of {status.total}
					{status.config.name} spots remaining
				</div>
			{/if}

			{#if showPercentage}
				<div class="mt-2">
					<div class="mx-auto h-2 max-w-xs overflow-hidden rounded-full bg-white/30">
						<div
							class="h-full transition-all duration-500"
							class:bg-white={status.showUrgency}
							class:bg-amber-600={!status.showUrgency}
							style="width: {status.percentage}%"
						></div>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Compact style - default -->
		<div
			class="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium"
			class:bg-rose-50={status.showUrgency}
			class:text-rose-700={status.showUrgency}
			class:bg-amber-50={!status.showUrgency}
			class:text-amber-700={!status.showUrgency}
			class:animate-pulse={status.showUrgency}
		>
			{#if status.showUrgency}
				<span class="text-base">🔥</span>
				<span>Only <strong>{status.remaining}</strong> left!</span>
			{:else}
				<span class="text-base">⏳</span>
				<span><strong>{status.remaining}</strong> / {status.total} remaining</span>
			{/if}
		</div>
	{/if}
{:else if loading}
	<!-- Loading state -->
	<div
		class="inline-flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-500"
	>
		<div class="loading loading-spinner loading-xs"></div>
		<span>Loading...</span>
	</div>
{/if}

<style>
	/* Custom animations if needed */
</style>
