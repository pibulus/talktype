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
		isRecording,
		isTranscribing,
		transcriptionService
	} from '$lib/services';
	import { transcriptionActions } from '$lib/services/infrastructure/stores';

	// Screen reader announcements
	$: screenReaderMessage = $uiState.screenReaderMessage;
	$: pendingRecording = $transcriptionState.pendingRecording;
	// Live Mode snapshots the Deepgram text into the draft every few seconds, so
	// after a crash the words are usually already here — no re-upload needed.
	$: savedText = pendingRecording?.liveTranscript?.text?.trim() || '';

	let isRetrying = false;

	function handleRestoreText() {
		if (!savedText) return;
		transcriptionActions.completeTranscription(savedText);
		uiActions.clearErrorMessage();
		uiActions.setScreenReaderMessage('Saved transcript restored');
	}

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
			uiActions.setErrorMessage(error.message || 'Try one fresh recording.');
		} finally {
			isRetrying = false;
		}
	}
</script>

<!-- Gentle status message display -->
{#if $errorMessage}
	<div class="notice-container mt-4 w-full" role="status" aria-live="polite">
		<p class="notice-message text-center font-medium">
			{$errorMessage}
		</p>
	</div>
{/if}

{#if pendingRecording && !$isTranscribing && !$isRecording}
	<div
		class="recovery-card mx-auto mt-3 flex w-full max-w-[540px] items-center justify-between gap-3 rounded-xl border border-pink-200/70 bg-[#fdf5ea]/95 px-3 py-2 text-left shadow-sm sm:px-4"
	>
		<p class="text-xs font-medium leading-snug text-[#2b2320] sm:text-sm">
			{savedText
				? 'Last recording saved, transcript and all'
				: 'Last recording saved locally'}{#if formatDuration(pendingRecording.duration)}<span
					class="text-pink-500">&nbsp;({formatDuration(pendingRecording.duration)})</span
				>{/if}
		</p>
		<div class="flex shrink-0 items-center gap-2">
			{#if savedText}
				<button
					class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-pink-500 px-4 text-sm font-bold text-white shadow-sm shadow-pink-200/60 transition hover:bg-pink-600 active:scale-[0.97]"
					on:click={handleRestoreText}
				>
					Get text back
				</button>
			{/if}
			<button
				class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-white/90 px-4 text-sm font-bold text-pink-600 shadow-sm ring-1 ring-pink-200 transition hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-60"
				on:click={handleRetry}
				disabled={isRetrying || $isTranscribing}
			>
				{isRetrying ? 'Retrying' : savedText ? 'Redo' : 'Retry'}
			</button>
		</div>
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
	.notice-container {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 0 1rem;
	}

	.notice-message {
		max-width: 500px;
		line-height: 1.5;
		font-size: 0.9rem;
		color: #8a5a16;
		text-align: center;
		padding: 0.65rem 0.9rem;
		border: 1px solid rgba(245, 158, 11, 0.22);
		border-radius: 999px;
		background: rgba(255, 251, 235, 0.9);
		box-shadow: 0 8px 20px rgba(245, 158, 11, 0.1);
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
		.notice-container {
			margin-top: 0.75rem;
			padding: 0 0.5rem;
		}

		.notice-message {
			font-size: 0.85rem;
			border-radius: 1rem;
		}
	}
</style>
