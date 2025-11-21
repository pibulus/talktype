import { env } from '$env/dynamic/private';

const SESSION_TTL_MS = Number(env.API_SESSION_TTL_MS ?? `${4 * 60 * 60 * 1000}`);
export const SESSION_COOKIE_NAME = 'talktype_session';

const sessions = new Map();

export function createSession() {
	cleanupExpired();
	const id = crypto.randomUUID();
	sessions.set(id, Date.now() + SESSION_TTL_MS);
	return id;
}

export function validateSession(id) {
	if (!id) return false;
	const expiry = sessions.get(id);
	if (!expiry) return false;
	if (expiry < Date.now()) {
		sessions.delete(id);
		return false;
	}
	return true;
}

export function deleteSession(id) {
	if (!id) return;
	sessions.delete(id);
}

function cleanupExpired() {
	const now = Date.now();
	for (const [id, expiry] of sessions.entries()) {
		if (expiry < now) {
			sessions.delete(id);
		}
	}
}
