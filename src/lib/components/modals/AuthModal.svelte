<script>
	export let onSubmit = (token) => {};
	export let onClose = () => {};

	let token = '';

	function handleSubmit() {
		if (token.trim()) {
			onSubmit(token.trim());
		}
	}

	function handleModalClose() {
		onClose();
	}
</script>

<dialog id="auth_modal" class="modal modal-open" on:close={handleModalClose}>
	<div class="modal-box relative w-11/12 max-w-sm rounded-2xl border border-gray-200 bg-white shadow-xl">
		<form method="dialog" on:submit|preventDefault={handleSubmit}>
			<div class="space-y-4">
                <div class="text-center">
                    <h3 class="text-lg font-bold">API Access</h3>
                    <p class="py-2 text-sm text-gray-600">
                        Please enter the API token to continue.
                    </p>
                </div>

				<div>
					<label for="token-input" class="sr-only">API Token</label>
					<input
						id="token-input"
						type="password"
						bind:value={token}
						placeholder="Enter token..."
						class="w-full rounded-lg border border-gray-300 px-4 py-2 text-center text-sm focus:border-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-200"
						required
					/>
				</div>
                <div class="modal-action mt-6 text-center">
                    <button type="submit" class="btn btn-primary w-full max-w-xs text-white">
                        Submit
                    </button>
                </div>
			</div>
		</form>
		<ModalCloseButton closeModal={handleModalClose} />
	</div>
	<div class="modal-backdrop bg-black/30" on:click={handleModalClose}></div>
</dialog>

