const ALGO = 'AES-GCM';
const KEY_ITERATIONS = 100000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const LEGACY_SALT = 'talktype-vault-salt';

function bytesToBase64(bytes) {
	let binary = '';
	const chunkSize = 0x8000;

	for (let index = 0; index < bytes.length; index += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
	}

	return btoa(binary);
}

function base64ToBytes(base64) {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}

	return bytes;
}

function requireCode(code) {
	if (typeof code !== 'string' || code.trim().length === 0) {
		throw new Error('Vault encryption needs a supporter code');
	}

	return code.trim().toUpperCase();
}

async function deriveKey(code, salt, iterations = KEY_ITERATIONS) {
	const enc = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		enc.encode(requireCode(code)),
		{ name: 'PBKDF2' },
		false,
		['deriveKey']
	);

	return crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt,
			iterations,
			hash: 'SHA-256'
		},
		keyMaterial,
		{ name: ALGO, length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

async function encryptPayloadBytes(bytes, code, metadata = {}) {
	if (!(bytes instanceof Uint8Array)) {
		throw new Error('Vault encryption needs bytes');
	}

	const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
	const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
	const key = await deriveKey(code, salt);

	const encrypted = await crypto.subtle.encrypt({ name: ALGO, iv }, key, bytes);

	return JSON.stringify({
		v: 1,
		alg: ALGO,
		kdf: 'PBKDF2-SHA256',
		iterations: KEY_ITERATIONS,
		salt: bytesToBase64(salt),
		iv: bytesToBase64(iv),
		data: bytesToBase64(new Uint8Array(encrypted)),
		metadata
	});
}

/**
 * Encrypts JSON-compatible data using AES-GCM.
 */
export async function encrypt(data, code) {
	const encoded = new TextEncoder().encode(JSON.stringify(data));
	return encryptPayloadBytes(encoded, code);
}

async function decryptStructuredPayload(payload, code) {
	if (payload?.v !== 1 || payload.alg !== ALGO || typeof payload.data !== 'string') {
		throw new Error('Unsupported vault payload');
	}

	const salt = base64ToBytes(payload.salt);
	const iv = base64ToBytes(payload.iv);
	const encrypted = base64ToBytes(payload.data);
	const key = await deriveKey(code, salt, payload.iterations || KEY_ITERATIONS);
	const decrypted = await crypto.subtle.decrypt({ name: ALGO, iv }, key, encrypted);

	return JSON.parse(new TextDecoder().decode(decrypted));
}

async function decryptPayloadBytes(payload, code) {
	if (payload?.v !== 1 || payload.alg !== ALGO || typeof payload.data !== 'string') {
		throw new Error('Unsupported vault payload');
	}

	const salt = base64ToBytes(payload.salt);
	const iv = base64ToBytes(payload.iv);
	const encrypted = base64ToBytes(payload.data);
	const key = await deriveKey(code, salt, payload.iterations || KEY_ITERATIONS);
	const decrypted = await crypto.subtle.decrypt({ name: ALGO, iv }, key, encrypted);

	return {
		bytes: new Uint8Array(decrypted),
		metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}
	};
}

async function decryptLegacyPayload(encryptedBase64, code) {
	const enc = new TextEncoder();
	const key = await deriveKey(code, enc.encode(LEGACY_SALT));
	const combined = base64ToBytes(encryptedBase64);
	const iv = combined.slice(0, IV_BYTES);
	const data = combined.slice(IV_BYTES);
	const decrypted = await crypto.subtle.decrypt({ name: ALGO, iv }, key, data);

	return JSON.parse(new TextDecoder().decode(decrypted));
}

/**
 * Decrypts current JSON vault payloads and the first-run legacy base64 payload.
 */
export async function decrypt(encryptedPayload, code) {
	try {
		return await decryptStructuredPayload(JSON.parse(encryptedPayload), code);
	} catch (error) {
		if (error instanceof SyntaxError) {
			return decryptLegacyPayload(encryptedPayload, code);
		}

		throw error;
	}
}

/**
 * Encrypts raw media bytes, preserving metadata inside the authenticated payload.
 */
export async function encryptBytes(bytes, code, metadata = {}) {
	return encryptPayloadBytes(bytes, code, metadata);
}

/**
 * Decrypts raw media bytes and returns authenticated metadata.
 */
export async function decryptBytes(encryptedPayload, code) {
	return decryptPayloadBytes(JSON.parse(encryptedPayload), code);
}

/**
 * Encrypts a Blob, suitable for Vault media storage.
 */
export async function encryptBlob(blob, code, metadata = {}) {
	if (!(blob instanceof Blob)) {
		throw new Error('Vault media encryption needs a Blob');
	}

	const bytes = new Uint8Array(await blob.arrayBuffer());
	return encryptPayloadBytes(bytes, code, {
		...metadata,
		mimeType: metadata.mimeType || blob.type || 'application/octet-stream',
		size: blob.size
	});
}

/**
 * Decrypts a Vault media payload back into a Blob plus authenticated metadata.
 */
export async function decryptBlob(encryptedPayload, code) {
	const { bytes, metadata } = await decryptBytes(encryptedPayload, code);
	return {
		blob: new Blob([bytes], { type: metadata.mimeType || 'application/octet-stream' }),
		metadata
	};
}
