<!--
  RecordingStatus component - handles error messages and status indicators
  Focused responsibility: displaying error states and status information
-->
<script>
	import { onMount } from 'svelte';
	import PermissionError from './PermissionError.svelte';
	import { errorMessage, uiState, uiActions } from '$lib/services';

	// Screen reader announcements
	$: screenReaderMessage = $uiState.screenReaderMessage;
</script>

<!-- Error message display -->
{#if $errorMessage}
	<div class="error-container mt-4 w-full">
		<p class="error-message text-center font-medium text-red-500">
			{$errorMessage}
		</p>
	</div>
{/if}

<!-- Screen reader only status announcements -->
<div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
	{#if screenReaderMessage}
		{screenReaderMessage}
	{/if}
</div>

<!-- Permission error modal -->
{#if $uiState.showPermissionError}
	<PermissionError on:close={() => uiActions.setPermissionError(false)} />
{/if}

<style>
	.error-container {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 0 1rem;
	}

	.error-message {
		max-width: 500px;
		line-height: 1.5;
		font-size: 0.9rem;
		color: #ef4444;
		text-align: center;
	}

	/* Screen reader only class */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.error-container {
			margin-top: 0.75rem;
			padding: 0 0.5rem;
		}

		.error-message {
			font-size: 0.85rem;
		}
	}
</style>
