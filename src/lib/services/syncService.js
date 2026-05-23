import { encrypt, decrypt } from './encryptionService.js';

const APP_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/i;

/**
 * SyncService - The Master Cartridge
 * Facilitates encrypted sync with the Pi Vault.
 */

function normalizeVaultCode(code) {
	if (typeof code !== 'string' || !code.trim()) {
		throw new Error('Vault sync needs a supporter code');
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

function getVaultUrl(serverUrl, appName, hash) {
	if (!APP_NAME_PATTERN.test(appName)) {
		throw new Error('Invalid Vault app name');
	}

	return `${serverUrl.replace(/\/+$/, '')}/vault/${encodeURIComponent(appName)}/${hash}`;
}

/**
 * Encrypt and upload data to the Pi Vault.
 * @param {string} appName - 'talktype' or 'ziplist'
 * @param {Object} data - The JSON state to sync
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
