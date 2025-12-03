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

	function formatRelativeTime(timestamp) {
		if (!timestamp) return 'just now';
		const deltaMs = Date.now() - timestamp;
		const deltaSeconds = Math.max(0, Math.round(deltaMs / 1000));

		if (deltaSeconds < 60) return `${deltaSeconds}s ago`;
		const deltaMinutes = Math.round(deltaSeconds / 60);
		if (deltaMinutes < 60) return `${deltaMinutes}m ago`;
		const deltaHours = Math.round(deltaMinutes / 60);
		return `${deltaHours}h ago`;
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

<!-- 
{#if pendingRecording}
	<div
		class="recovery-card mx-auto mt-3 w-full max-w-[540px] rounded-2xl border border-pink-100 bg-white/90 p-4 text-center shadow-md"
	>
		<p class="text-sm text-gray-700">
			We saved your last recording
			{#if formatDuration(pendingRecording.duration)}
				({formatDuration(pendingRecording.duration)})
			{/if}
			. You can retry transcription anytime.
		</p>
		<p class="mt-1 text-xs text-gray-500">
			Saved {formatRelativeTime(pendingRecording.createdAt)}
		</p>
		<button
			class="retry-button mt-3 inline-flex items-center justify-center rounded-full bg-pink-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:bg-gray-300"
			on:click={handleRetry}
			disabled={$isTranscribing || isRetrying}
		>
			{#if $isTranscribing || isRetrying}
				Retrying…
			{:else}
				Retry transcription
			{/if}
		</button>
	</div>
{/if}
-->

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

	.recovery-card {
		backdrop-filter: blur(6px);
	}

	.retry-button {
		min-width: 180px;
	}
</style>
