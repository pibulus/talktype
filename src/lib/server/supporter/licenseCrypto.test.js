import { describe, expect, it } from 'vitest';
import {
	generateLicenseCode,
	hashSupporterCode,
	issueSupporterToken,
	verifySupporterToken
} from './licenseCrypto.js';

const SECRET = 'test-supporter-secret-with-enough-length';

describe('supporter license crypto', () => {
	it('generates deterministic supporter codes without storing raw codes', () => {
		expect(generateLicenseCode('checkout-123', SECRET)).toBe(
			generateLicenseCode('checkout-123', SECRET)
		);
		expect(generateLicenseCode('checkout-123', SECRET)).toMatch(
			/^TT-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/
		);
	});

	it('hashes codes case-insensitively', () => {
		expect(hashSupporterCode('tt-abcd-1234-ef56', SECRET)).toBe(
			hashSupporterCode('TT-ABCD-1234-EF56', SECRET)
		);
	});

	it('issues and verifies signed supporter tokens', () => {
		const token = issueSupporterToken({ sub: 'license-123', tier: 'supporter' }, SECRET);

		expect(verifySupporterToken(token, SECRET)).toMatchObject({
			sub: 'license-123',
			tier: 'supporter'
		});
		expect(verifySupporterToken(`${token}x`, SECRET)).toBeNull();
	});
});
