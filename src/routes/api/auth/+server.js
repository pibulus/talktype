import { json } from '@sveltejs/kit';
import { checkSession, verifyTokenAndCreateSession } from '$lib/server/authService';

/**
 * Handles GET requests to check for a valid session.
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export async function GET(event) {
	if (await checkSession(event)) {
		return json({ message: 'Session valid' }, { status: 200 });
	}
	return json({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * Handles POST requests to create a new session from a token.
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export async function POST(event) {
	try {
		const { token } = await event.request.json();
		const isValid = await verifyTokenAndCreateSession(token, event);

		if (isValid) {
			return json({ message: 'Session created' }, { status: 200 });
		} else {
			return json({ error: 'Invalid token' }, { status: 401 });
		}
	} catch (error) {
		console.error('Error in POST /api/auth:', error);
		const message = error.message === 'Auth not configured' 
			? 'Auth not configured' 
			: 'Bad request';
		const status = error.message === 'Auth not configured' ? 500 : 400;
		return json({ error: message }, { status });
	}
}

