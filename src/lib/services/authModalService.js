import { showModal, hideModal } from '$lib/stores/modal';

/**
 * Opens the auth modal and resolves when a session cookie has been issued.
 * Rejects if the modal is dismissed.
 */
export function promptForApiToken() {
	return new Promise((resolve, reject) => {
		const props = {
			onSubmit: async (token) => {
				try {
					const response = await fetch('/api/auth', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ token })
					});

					if (!response.ok) {
						const error = await response.json().catch(() => ({}));
						return {
							success: false,
							error: error?.error || 'That token did not work. Double-check and try again.'
						};
					}

					hideModal();
					resolve();
					return { success: true };
				} catch (error) {
					console.error(error);
					return {
						success: false,
						error: "Couldn't reach the auth service. Check your connection and try again."
					};
				}
			},
			onClose: () => {
				hideModal();
				reject(new Error('API auth token is required to continue.'));
			}
		};

		showModal('auth', props);
	});
}
