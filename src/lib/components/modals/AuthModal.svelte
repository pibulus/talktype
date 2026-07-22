<script>
	import { onMount } from 'svelte';
	import ModalCloseButton from './ModalCloseButton.svelte';
	import { ANIMATION } from '$lib/constants';
	import { modalService } from '$lib/services/modals/modalService.js';
	export let onSubmit = async () => ({ success: false, error: null });
	export let onSuccess = () => {};
	export let onClose = () => {};

	let token = '';
	let submitting = false;
	let closing = false;
	let errorMessage = '';
	let tokenInput;
	let closeTimer;

	onMount(() => {
		if (typeof window !== 'undefined') {
			modalService.openModal('auth_modal');
			queueMicrotask(() => {
				tokenInput?.focus();
			});
		}

		return () => {
			if (closeTimer) {
				clearTimeout(closeTimer);
			}
		};
	});

	async function handleSubmit() {
		if (!token.trim() || submitting) {
			return;
		}

		submitting = true;
		errorMessage = '';

		try {
			const result = (await onSubmit(token.trim())) ?? { success: false };
			if (result.success) {
				submitting = false;
				handleModalClose(onSuccess);
				return;
			}

			if (!result.success) {
				errorMessage = result.error || 'Check the shared access token and try once more.';
			}
		} catch (error) {
			errorMessage = error?.message || 'Check the shared access token and try once more.';
		} finally {
			if (!closing) {
				submitting = false;
			}
		}
	}

	// modalService owns the close animation and the reduced-motion branch; this
	// only waits out the same duration before handing control back to the caller.
	function handleModalClose(afterClose = onClose) {
		if (submitting || closing) return;

		closing = true;
		modalService.closeModal();

		const closeDelay = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
			? 0
			: ANIMATION.MODAL.CLOSE_DURATION;

		closeTimer = setTimeout(() => {
			closing = false;
			afterClose();
		}, closeDelay);
	}

	function handleNativeClose(event) {
		if (!closing) {
			event.preventDefault();
			onClose();
		}
	}
</script>

<dialog
	id="auth_modal"
	class={`modal ${closing ? 'tt-modal-closing' : ''}`}
	aria-labelledby="auth-modal-title"
	aria-describedby="auth-modal-description"
	on:close={handleNativeClose}
>
	<div class="tt-modal-sm modal-box relative">
		<form method="dialog" class="space-y-4" on:submit|preventDefault={handleSubmit}>
			<div class="text-center">
				<h3 id="auth-modal-title" class="text-lg font-bold">Shared Access</h3>
				<p id="auth-modal-description" class="py-2 text-sm text-gray-600">
					Enter the shared access token to continue.
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
				<p
					class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-900"
				>
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
	<button
		type="button"
		class="modal-backdrop"
		aria-label="Close auth modal"
		on:click={handleModalClose}
		on:keydown={(event) => event.key === 'Enter' && handleModalClose()}
	></button>
</dialog>
