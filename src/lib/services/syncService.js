import { SUPPORTER_VAULT } from '$lib/constants';
import { encrypt, decrypt, encryptBlob, decryptBlob } from './encryptionService.js';

const APP_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/i;
const MEDIA_ID_PATTERN = /^[a-z0-9][a-z0-9_.:-]{0,79}$/i;

/**
 * Low-level encrypted transport helpers for the Pi Vault.
 */

function normalizeVaultCode(code) {
	if (typeof code !== 'string' || !code.trim()) {
		throw new Error('Vault backup needs a supporter code');
	}

	return code.trim().toUpperCase();
}

// Generate a hash from the supporter code (used as the vault identifier)
export async function getVaultHash(code) {
	const encoder = new TextEncoder();
	const data = encoder.encode(`talktype-vault-id:${normalizeVaultCode(code)}`);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createVaultMediaId() {
	if (crypto.randomUUID) return crypto.randomUUID();

	const bytes = crypto.getRandomValues(new Uint8Array(16));
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function normalizeMediaId(mediaId) {
	if (typeof mediaId !== 'string' || !mediaId.trim()) {
		throw new Error('Vault media needs a media id');
	}

	const normalized = mediaId.trim();
	if (!MEDIA_ID_PATTERN.test(normalized)) {
		throw new Error('Invalid Vault media id');
	}

	return normalized;
}

export async function getVaultMediaHash(code, mediaId) {
	const encoder = new TextEncoder();
	const data = encoder.encode(
		`talktype-vault-media:${normalizeVaultCode(code)}:${normalizeMediaId(mediaId)}`
	);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Reject vault server URLs that aren't HTTPS (or loopback for local dev). The
// URL comes from localStorage and is user/attacker-controllable; without this an
// injected http://evil.com would receive every encrypted vault blob via fetch().
function assertSafeVaultOrigin(serverUrl) {
	let parsed;
	try {
		parsed = new URL(serverUrl);
	} catch {
		throw new Error('Invalid Vault server URL');
	}

	const isLoopback =
		parsed.hostname === 'localhost' ||
		parsed.hostname === '127.0.0.1' ||
		parsed.hostname === '[::1]';

	if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLoopback)) {
		throw new Error('Vault server must use HTTPS');
	}

	return parsed;
}

function getVaultUrl(serverUrl, appName, hash) {
	if (!APP_NAME_PATTERN.test(appName)) {
		throw new Error('Invalid Vault app name');
	}

	assertSafeVaultOrigin(serverUrl);

	return `${serverUrl.replace(/\/+$/, '')}/vault/${encodeURIComponent(appName)}/${hash}`;
}

function getMediaAppName(appName) {
	const mediaAppName = `${appName}-media`;
	if (!APP_NAME_PATTERN.test(mediaAppName)) {
		throw new Error('Invalid Vault media app name');
	}
	return mediaAppName;
}

function getMediaManifestAppName(appName) {
	const manifestAppName = `${appName}-media-index`;
	if (!APP_NAME_PATTERN.test(manifestAppName)) {
		throw new Error('Invalid Vault media manifest app name');
	}
	return manifestAppName;
}

function normalizeAudioManifest(manifest) {
	const entries = Array.isArray(manifest?.entries) ? manifest.entries : [];
	return {
		v: 1,
		updatedAt: manifest?.updatedAt || new Date().toISOString(),
		entries: entries.filter((entry) => entry?.mediaId && entry?.mediaHash)
	};
}

/**
 * Encrypt and upload data to the Pi Vault.
 * @param {string} appName - 'talktype' or 'ziplist'
 * @param {Object} data - The JSON state to save
 * @param {string} code - The supporter code
 * @param {string} serverUrl - URL of your Pi vault
 */
export async function saveToVault(appName, data, code, serverUrl) {
	const hash = await getVaultHash(code);
	const encryptedData = await encrypt(data, code);

	const response = await fetch(getVaultUrl(serverUrl, appName, hash), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ data: encryptedData })
	});

	if (!response.ok) throw new Error('Failed to save to Vault');
	return true;
}

/**
 * Fetch and decrypt data from the Pi Vault.
 * @param {string} appName - 'talktype' or 'ziplist'
 * @param {string} code - The supporter code
 * @param {string} serverUrl - URL of your Pi vault
 */
export async function loadFromVault(appName, code, serverUrl) {
	const hash = await getVaultHash(code);

	const response = await fetch(getVaultUrl(serverUrl, appName, hash));
	if (response.status === 404) return null;
	if (!response.ok) throw new Error('Failed to load from Vault');

	const { data } = await response.json();
	return await decrypt(data, code);
}

export async function deleteFromVault(appName, code, serverUrl) {
	const hash = await getVaultHash(code);

	const response = await fetch(getVaultUrl(serverUrl, appName, hash), {
		method: 'DELETE'
	});
	if (response.status === 404) return false;
	if (!response.ok) throw new Error('Failed to delete from Vault');

	return true;
}

export async function saveAudioManifestToVault(appName, manifest, code, serverUrl) {
	const payload = normalizeAudioManifest({
		...manifest,
		updatedAt: new Date().toISOString()
	});

	return saveToVault(getMediaManifestAppName(appName), payload, code, serverUrl);
}

export async function loadAudioManifestFromVault(appName, code, serverUrl) {
	const manifest = await loadFromVault(getMediaManifestAppName(appName), code, serverUrl);
	return manifest ? normalizeAudioManifest(manifest) : { v: 1, updatedAt: null, entries: [] };
}

/**
 * Encrypt and upload an audio Blob to the Vault as a separate media payload.
 * Store the returned mediaId/mediaHash in the encrypted transcript metadata.
 */
export async function saveAudioToVault(appName, audioBlob, code, serverUrl, options = {}) {
	if (!(audioBlob instanceof Blob)) {
		throw new Error('Vault audio backup needs a Blob');
	}

	const mediaId = normalizeMediaId(options.mediaId || createVaultMediaId());
	if (audioBlob.size > (options.maxSizeBytes || SUPPORTER_VAULT.MAX_AUDIO_BLOB_BYTES)) {
		throw new Error('Vault audio is too large');
	}

	const mediaHash = await getVaultMediaHash(code, mediaId);
	const encryptedData = await encryptBlob(audioBlob, code, {
		mediaId,
		transcriptId: options.transcriptId || null,
		createdAt: options.createdAt || new Date().toISOString(),
		duration: options.duration || 0,
		mimeType: options.mimeType || audioBlob.type || 'audio/webm'
	});

	const response = await fetch(getVaultUrl(serverUrl, getMediaAppName(appName), mediaHash), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ data: encryptedData })
	});

	if (!response.ok) throw new Error('Failed to save audio to Vault');

	return {
		mediaId,
		mediaHash,
		mimeType: audioBlob.type || options.mimeType || 'audio/webm',
		size: audioBlob.size,
		encryptedSize: encryptedData.length
	};
}

/**
 * Fetch and decrypt an audio Blob from the Vault.
 */
export async function loadAudioFromVault(appName, mediaId, code, serverUrl) {
	const mediaHash = await getVaultMediaHash(code, mediaId);

	const response = await fetch(getVaultUrl(serverUrl, getMediaAppName(appName), mediaHash));
	if (response.status === 404) return null;
	if (!response.ok) throw new Error('Failed to load audio from Vault');

	const { data } = await response.json();
	return await decryptBlob(data, code);
}

export async function deleteAudioFromVault(appName, mediaId, code, serverUrl) {
	const mediaHash = await getVaultMediaHash(code, mediaId);

	const response = await fetch(getVaultUrl(serverUrl, getMediaAppName(appName), mediaHash), {
		method: 'DELETE'
	});
	if (response.status === 404) return false;
	if (!response.ok) throw new Error('Failed to delete audio from Vault');

	return true;
}
