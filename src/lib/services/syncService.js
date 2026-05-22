import { encrypt, decrypt } from './encryptionService.js';

/**
 * SyncService - The Master Cartridge
 * Facilitates encrypted sync with the Pi Vault.
 */

// Generate a hash from the supporter code (used as the vault identifier)
async function getVaultHash(code) {
    const encoder = new TextEncoder();
    const data = encoder.encode(`talktype-vault-id:${code}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
    
    const response = await fetch(`${serverUrl}/vault/${appName}/${hash}`, {
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
    
    const response = await fetch(`${serverUrl}/vault/${appName}/${hash}`);
    if (response.status === 404) return null; // Vault empty
    if (!response.ok) throw new Error('Failed to load from Vault');
    
    const { data } = await response.json();
    return await decrypt(data, code);
}
