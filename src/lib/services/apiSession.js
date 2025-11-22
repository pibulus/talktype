import { showModal, hideModal } from '$lib/stores/modal';

let inFlightSession = null;

export async function ensureApiSession() {
	if (typeof window === 'undefined') return;

	if (inFlightSession) {
		return inFlightSession;
	}

	inFlightSession = (async () => {
		const status = await fetch('/api/auth', { method: 'GET' });
		if (status.ok) {
			return;
		}

		await promptForTokenWithModal();
	})().finally(() => {
		inFlightSession = null;
	});

	return inFlightSession;
}

function promptForTokenWithModal() {
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
                        throw new Error('Invalid API auth token');
                    }
                    
                    hideModal();
                    resolve();
                } catch (error) {
                    // TODO: Show error in the modal
                    console.error(error);
                    reject(error);
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

