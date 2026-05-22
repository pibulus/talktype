import { browser } from '$app/environment';

const ALGO = 'AES-GCM';

/**
 * Derives a cryptographic key from the user's supporter code.
 * Uses PBKDF2 for secure key derivation.
 */
async function deriveKey(code) {
	const enc = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		enc.encode(code),
		{ name: 'PBKDF2' },
		false,
		['deriveKey']
	);

	return crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt: enc.encode('talktype-vault-salt'), // Static salt for simple sync
			iterations: 100000,
			hash: 'SHA-256'
		},
		keyMaterial,
		{ name: ALGO, length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

/**
 * Encrypts data using AES-GCM
 */
export async function encrypt(data, code) {
	const key = await deriveKey(code);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encoded = new TextEncoder().encode(JSON.stringify(data));

	const encrypted = await crypto.subtle.encrypt(
		{ name: ALGO, iv },
		key,
		encoded
	);

	// Prepend IV to the ciphertext so we can use it for decryption
	const combined = new Uint8Array(iv.length + encrypted.byteLength);
	combined.set(iv);
	combined.set(new Uint8Array(encrypted), iv.length);

	return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts data using AES-GCM
 */
export async function decrypt(encryptedBase64, code) {
	const key = await deriveKey(code);
	const combined = new Uint8Array(
		atob(encryptedBase64)
			.split('')
			.map((c) => c.charCodeAt(0))
	);

	const iv = combined.slice(0, 12);
	const data = combined.slice(12);

	const decrypted = await crypto.subtle.decrypt(
		{ name: ALGO, iv },
		key,
		data
	);

	return JSON.parse(new TextDecoder().decode(decrypted));
}
