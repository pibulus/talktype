<script>
	import { onMount } from 'svelte';
	import ModalCloseButton from './ModalCloseButton.svelte';
	export let onSubmit = async (token) => ({ success: false, error: null });
	export let onClose = () => {};

	let token = '';
	let submitting = false;
	let errorMessage = '';
	let tokenInput;

	onMount(() => {
		if (typeof window !== 'undefined') {
			queueMicrotask(() => {
				tokenInput?.focus();
			});
		}
	});

	async function handleSubmit() {
		if (!token.trim() || submitting) {
			return;
		}

		submitting = true;
		errorMessage = '';

		try {
			const result = (await onSubmit(token.trim())) ?? { success: false };
			if (!result.success) {
				errorMessage = result.error || 'Something went wrong. Try again in a moment.';
			}
		} catch (error) {
			errorMessage =
				error?.message || 'Something unexpected happened. Please try submitting the token again.';
		} finally {
			submitting = false;
		}
	}

	function handleModalClose() {
		if (!submitting) {
			onClose();
		}
	}
</script>

<dialog
	id="auth_modal"
	class="modal modal-open"
	aria-labelledby="auth-modal-title"
	aria-describedby="auth-modal-description"
	on:close={handleModalClose}
>
	<div
		class="modal-box relative w-11/12 max-w-sm rounded-2xl border border-gray-200 bg-white shadow-xl"
	>
		<form method="dialog" class="space-y-4" on:submit|preventDefault={handleSubmit}>
			<div class="text-center">
				<h3 id="auth-modal-title" class="text-lg font-bold">API Access</h3>
				<p id="auth-modal-description" class="py-2 text-sm text-gray-600">
					Enter the shared API token to unlock the transcription endpoints.
				</p>
			</div>

			<div>
				<label for="token-input" class="sr-only">API Token</label>
					<input
						id="token-input"
						type="password"
						bind:this={tokenInput}
						bind:value={token}
						placeholder="Enter token..."
						class="w-full rounded-lg border border-gray-300 px-4 py-2 text-center text-sm focus:border-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-200"
						autocomplete="one-time-code"
						required
						disabled={submitting}
					/>
				</div>

			{#if errorMessage}
				<p class="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">
					{errorMessage}
				</p>
			{/if}

			<div class="modal-action mt-6 text-center">
				<button
					type="submit"
					class="btn btn-primary w-full max-w-xs text-white"
					disabled={submitting}
				>
					{submitting ? 'Verifying…' : 'Submit'}
				</button>
			</div>
		</form>
		<ModalCloseButton closeModal={handleModalClose} />
	</div>
	<div
		role="button"
		tabindex="0"
		aria-label="Close auth modal"
		class="modal-backdrop bg-black/30"
		on:click={handleModalClose}
		on:keydown={(event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				handleModalClose();
			}
		}}
	></div>
</dialog>
