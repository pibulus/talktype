/**
 * Unlock Code Storage Service
 * Simple JSON-based storage for premium unlock codes
 */

import fs from 'fs';
import path from 'path';
import { dev } from '$app/environment';

const DATA_DIR = path.join(process.cwd(), 'src/lib/server/data');
const CODES_FILE = path.join(DATA_DIR, 'unlock-codes.json');

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
 * Load unlock codes from JSON file
 */
function loadCodes() {
	try {
		if (!fs.existsSync(DATA_DIR)) {
			fs.mkdirSync(DATA_DIR, { recursive: true });
		}

		if (!fs.existsSync(CODES_FILE)) {
			// Initialize with empty codes object
			const initialData = { codes: {} };
			fs.writeFileSync(CODES_FILE, JSON.stringify(initialData, null, 2));
			return initialData;
		}

		const data = fs.readFileSync(CODES_FILE, 'utf-8');
		return JSON.parse(data);
	} catch (error) {
		console.error('Error loading unlock codes:', error);
		return { codes: {} };
	}
}

/**
 * Save unlock codes to JSON file
 */
function saveCodes(data) {
	try {
		if (!fs.existsSync(DATA_DIR)) {
			fs.mkdirSync(DATA_DIR, { recursive: true });
		}
		fs.writeFileSync(CODES_FILE, JSON.stringify(data, null, 2));
		return true;
	} catch (error) {
		console.error('Error saving unlock codes:', error);
		return false;
	}
}

/**
 * Store a new unlock code
 * @param {string} code - The unlock code
 * @param {object} metadata - Payment metadata (paymentId, amount, etc.)
 * @returns {boolean} Success status
 */
export function storeUnlockCode(code, metadata = {}) {
	const data = loadCodes();

	data.codes[code] = {
		...metadata,
		createdAt: new Date().toISOString(),
		usedCount: 0, // Allow unlimited device unlocks
		lastUsedAt: null
	};

	return saveCodes(data);
}

/**
 * Validate an unlock code
 * @param {string} code - The code to validate
 * @returns {object} { valid: boolean, metadata?: object }
 */
export function validateUnlockCode(code) {
	const data = loadCodes();

	// Normalize code (remove spaces, uppercase)
	const normalizedCode = code.toUpperCase().replace(/\s/g, '');

	if (data.codes[normalizedCode]) {
		// Code exists - mark as used
		data.codes[normalizedCode].usedCount++;
		data.codes[normalizedCode].lastUsedAt = new Date().toISOString();
		saveCodes(data);

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
export function getCodeStats() {
	const data = loadCodes();
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
export function createTestCode() {
	if (dev) {
		const testCode = 'TALK-TEST-CODE';
		storeUnlockCode(testCode, {
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
	createTestCode();
	console.log('🔑 Dev unlock code available: TALK-TEST-CODE');
}
