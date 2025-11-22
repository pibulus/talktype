/**
 * Unlock Code Storage Service
 * Uses abstract storage adapter (FS in dev, Memory in prod)
 */

import { dev } from '$app/environment';
import { storage } from './storage/index.js';

const STORAGE_KEY = 'unlock-codes';

/**
 * Generate a random unlock code in format: TALK-XXXX-XXXX
 */
export function generateUnlockCode() {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars (0,O,1,I)
	const segment1 = Array.from(
		{ length: 4 },
		() => chars[Math.floor(Math.random() * chars.length)]
	).join('');
	const segment2 = Array.from(
		{ length: 4 },
		() => chars[Math.floor(Math.random() * chars.length)]
	).join('');
	return `TALK-${segment1}-${segment2}`;
}

/**
 * Load unlock codes from storage
 */
async function loadCodes() {
	const data = await storage.get(STORAGE_KEY);
	if (!data) {
		return { codes: {} };
	}
	return data;
}

/**
 * Save unlock codes to storage
 */
async function saveCodes(data) {
	return await storage.set(STORAGE_KEY, data);
}

/**
 * Store a new unlock code
 * @param {string} code - The unlock code
 * @param {object} metadata - Payment metadata (paymentId, amount, etc.)
 * @returns {Promise<boolean>} Success status
 */
export async function storeUnlockCode(code, metadata = {}) {
	const data = await loadCodes();

	data.codes[code] = {
		...metadata,
		createdAt: new Date().toISOString(),
		usedCount: 0, // Allow unlimited device unlocks
		lastUsedAt: null
	};

	return await saveCodes(data);
}

/**
 * Validate an unlock code
 * @param {string} code - The code to validate
 * @returns {Promise<object>} { valid: boolean, metadata?: object }
 */
export async function validateUnlockCode(code) {
	const data = await loadCodes();

	// Normalize code (remove spaces, uppercase)
	const normalizedCode = code.toUpperCase().replace(/\s/g, '');

	if (data.codes[normalizedCode]) {
		// Code exists - mark as used
		data.codes[normalizedCode].usedCount++;
		data.codes[normalizedCode].lastUsedAt = new Date().toISOString();
		await saveCodes(data);

		return {
			valid: true,
			metadata: data.codes[normalizedCode]
		};
	}

	return { valid: false };
}

/**
 * Get statistics about unlock codes (for admin/debugging)
 */
export async function getCodeStats() {
	const data = await loadCodes();
	const codes = Object.values(data.codes);

	return {
		totalCodes: codes.length,
		totalUses: codes.reduce((sum, code) => sum + code.usedCount, 0),
		recentCodes: codes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10)
	};
}

/**
 * Development helper - create a test code
 */
export async function createTestCode() {
	if (dev) {
		const testCode = 'TALK-TEST-CODE';
		await storeUnlockCode(testCode, {
			paymentId: 'test-payment',
			amount: 9.0,
			currency: 'AUD',
			email: 'test@example.com'
		});
		return testCode;
	}
	return null;
}

// Initialize test code in development
if (dev) {
	createTestCode().then(() => {
		console.log('🔑 Dev unlock code available: TALK-TEST-CODE');
	});
}
