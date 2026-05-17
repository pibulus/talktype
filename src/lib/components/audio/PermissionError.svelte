<script>
	import { createEventDispatcher } from 'svelte';

	// Event handling
	const dispatch = createEventDispatcher();

	// Close the modal when clicked or keyboard activated
	function closeModal() {
		dispatch('close');
	}

	// Handle keyboard events
	function handleKeydown(event) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			closeModal();
		} else if (event.key === 'Escape') {
			closeModal();
		}
	}
</script>

<div
	class="permission-error-container flex w-full justify-center"
	on:click={closeModal}
	on:keydown={handleKeydown}
	role="dialog"
	tabindex="0"
	aria-labelledby="permission_error_title"
	aria-describedby="permission_error_description"
	aria-live="polite"
>
	<div class="permission-error-modal">
		<!-- Icon and title -->
		<div class="modal-header">
			<div class="permission-icon">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="h-6 w-6"
					style="pointer-events: none;"
				>
					<path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"></path>
					<path d="M19 10v1a7 7 0 0 1-14 0v-1"></path>
					<line x1="12" y1="18" x2="12" y2="21"></line>
					<line x1="8" y1="21" x2="16" y2="21"></line>
				</svg>
			</div>
			<h3 id="permission_error_title">Microphone needs a nudge</h3>
		</div>

		<!-- Permission error message -->
		<p id="permission_error_description">
			TalkType needs the mic before it can listen. Allow microphone access in your browser, then try
			recording again.
		</p>

		<!-- Solution steps -->
		<div class="error-steps">
			<div class="step">
				<div class="step-number">1</div>
				<p>Click the microphone or lock icon in your address bar</p>
			</div>
			<div class="step">
				<div class="step-number">2</div>
				<p>Select "Allow" for microphone access</p>
			</div>
			<div class="step">
				<div class="step-number">3</div>
				<p>Refresh the page and try again</p>
			</div>
		</div>

		<!-- Dismiss button -->
		<button class="dismiss-btn" on:click|stopPropagation={closeModal}> Got it </button>
	</div>
</div>

<style>
	.permission-error-container {
		margin-top: 1rem;
		padding: 0 1rem;
	}

	.permission-error-modal {
		width: min(100%, 520px);
		border: 1px solid rgba(249, 168, 212, 0.55);
		border-radius: 1.5rem;
		background: linear-gradient(135deg, rgba(255, 250, 239, 0.98), rgba(255, 246, 230, 0.96));
		box-shadow: 0 18px 42px rgba(249, 168, 212, 0.22);
		padding: 1rem;
		color: #374151;
	}

	.modal-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.permission-icon {
		display: inline-flex;
		width: 2.5rem;
		height: 2.5rem;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		border-radius: 999px;
		border: 1px solid rgba(245, 158, 11, 0.24);
		background: rgba(255, 251, 235, 0.92);
		color: #b45309;
	}

	h3 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 800;
		letter-spacing: 0;
		color: #2f3545;
	}

	p {
		margin: 0;
		font-size: 0.92rem;
		line-height: 1.5;
		color: #5b6270;
	}

	.error-steps {
		display: grid;
		gap: 0.5rem;
		margin: 1rem 0;
	}

	.step {
		display: grid;
		grid-template-columns: 1.75rem 1fr;
		align-items: start;
		gap: 0.6rem;
		border: 1px solid rgba(249, 168, 212, 0.35);
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.66);
		padding: 0.65rem 0.75rem;
		text-align: left;
	}

	.step-number {
		display: inline-flex;
		width: 1.75rem;
		height: 1.75rem;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		background: rgba(255, 92, 159, 0.1);
		color: #c24172;
		font-size: 0.78rem;
		font-weight: 800;
	}

	.dismiss-btn {
		min-height: 44px;
		width: 100%;
		border: 1px solid rgba(249, 168, 212, 0.62);
		border-radius: 999px;
		background: linear-gradient(135deg, #ff7bab, #f6a43a);
		color: #fff;
		font-size: 0.95rem;
		font-weight: 800;
		box-shadow: 0 10px 22px rgba(255, 92, 159, 0.18);
		cursor: pointer;
	}

	.dismiss-btn:focus-visible {
		outline: 2px solid rgba(255, 92, 159, 0.5);
		outline-offset: 3px;
	}
</style>
