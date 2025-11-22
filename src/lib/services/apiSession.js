import { promptForApiToken } from '$lib/services/authModalService';

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

		await promptForApiToken();
	})().finally(() => {
		inFlightSession = null;
	});

	return inFlightSession;
}
