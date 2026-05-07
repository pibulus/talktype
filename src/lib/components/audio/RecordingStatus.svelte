<!--
  RecordingStatus component - handles error messages and status indicators
  Focused responsibility: displaying error states and status information
-->
<script>
	import PermissionError from './PermissionError.svelte';
	import {
		errorMessage,
		uiState,
		uiActions,
		transcriptionState,
		isTranscribing,
		transcriptionService
	} from '$lib/services';

	// Screen reader announcements
	$: screenReaderMessage = $uiState.screenReaderMessage;
	$: pendingRecording = $transcriptionState.pendingRecording;

	let isRetrying = false;

	function formatDuration(seconds) {
		if (!seconds || Number.isNaN(seconds)) return null;
		if (seconds >= 60) {
			const minutes = Math.floor(seconds / 60);
			const remaining = Math.round(seconds % 60);
			return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes}m`;
		}
		return `${seconds.toFixed(1)}s`;
	}

	async function handleRetry() {
		if (isRetrying || $isTranscribing) return;

		try {
			isRetrying = true;
			uiActions.clearErrorMessage();
			await transcriptionService.retryPendingRecording();
		} catch (error) {
			console.error('Retry transcription failed:', error);
			uiActions.setErrorMessage(error.message || 'Retry failed - please record again.');
		} finally {
			isRetrying = false;
		}
	}
</script>

<!-- Error message display -->
{#if $errorMessage}
	<div class="error-container mt-4 w-full">
		<p class="error-message text-center font-medium text-red-500">
			{$errorMessage}
		</p>
	</div>
{/if}

{#if pendingRecording && !$isTranscribing}
	<div
		class="recovery-card mx-auto mt-3 flex w-full max-w-[540px] items-center justify-between gap-3 rounded-xl border border-amber-200/70 bg-amber-50/90 px-3 py-2 text-left shadow-sm sm:px-4"
	>
		<p class="text-xs font-medium leading-snug text-amber-900 sm:text-sm">
			Last recording saved locally{#if formatDuration(pendingRecording.duration)}
				<span class="text-amber-700">({formatDuration(pendingRecording.duration)})</span>
			{/if}
		</p>
		<button
			class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-white px-4 text-sm font-bold text-amber-800 shadow-sm ring-1 ring-amber-200 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
			on:click={handleRetry}
			disabled={isRetrying || $isTranscribing}
		>
			{isRetrying ? 'Retrying' : 'Retry'}
		</button>
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
