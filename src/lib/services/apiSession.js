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

		await promptForToken();
	})().finally(() => {
		inFlightSession = null;
	});

	return inFlightSession;
}

async function promptForToken() {
	const token = window.prompt('Enter the API auth token to use TalkType:')?.trim();

	if (!token) {
		throw new Error('API auth token is required to continue.');
	}

	const response = await fetch('/api/auth', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token })
	});

	if (!response.ok) {
		throw new Error('Invalid API auth token');
	}
}
