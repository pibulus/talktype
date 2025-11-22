import { env } from '$env/dynamic/private';

const SESSION_TTL_MS = Number(env.API_SESSION_TTL_MS ?? `${4 * 60 * 60 * 1000}`);
export const SESSION_COOKIE_NAME = 'talktype_session';

const secret = env.API_COOKIE_SECRET;
if (!secret) {
	throw new Error('API_COOKIE_SECRET environment variable is not set. Please provide a long, random string.');
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function getCryptoKey() {
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify']
	);
	return keyMaterial;
}

export async function createSession(event) {
	const key = await getCryptoKey();
	const expiry = Date.now() + SESSION_TTL_MS;
	const data = { expiry };
	const dataStr = JSON.stringify(data);

	const signature = await crypto.subtle.sign(
		'HMAC',
		key,
		encoder.encode(dataStr)
	);

	const signedCookie = `${btoa(dataStr)}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

	event.cookies.set(SESSION_COOKIE_NAME, signedCookie, {
		path: '/',
		httpOnly: true,
		secure: event.url.protocol === 'https:',
		maxAge: SESSION_TTL_MS / 1000
	});
}

export async function validateSession(event) {
	const cookie = event.cookies.get(SESSION_COOKIE_NAME);
	if (!cookie) return false;

	const parts = cookie.split('.');
	if (parts.length !== 2) return false;

	const [dataStr, signatureStr] = parts;

	try {
		const data = JSON.parse(atob(dataStr));
		const signature = Uint8Array.from(atob(signatureStr), c => c.charCodeAt(0));

		const key = await getCryptoKey();
		const isValid = await crypto.subtle.verify(
			'HMAC',
			key,
			signature,
			encoder.encode(JSON.stringify(data))
		);

		if (!isValid) return false;
		if (data.expiry < Date.now()) return false;

		return true;
	} catch (error) {
		console.error("Error validating session:", error);
		return false;
	}
}
