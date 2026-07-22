import { createHmac } from 'crypto';
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

	it('stamps a ~1 year expiry on issued tokens', () => {
		const token = issueSupporterToken({ sub: 'license-123' }, SECRET);
		const body = verifySupporterToken(token, SECRET);
		const now = Math.floor(Date.now() / 1000);
		expect(body.exp).toBeGreaterThan(now);
		// within a year + small slack
		expect(body.exp).toBeLessThanOrEqual(now + 366 * 24 * 60 * 60);
		expect(body.exp - body.iat).toBe(365 * 24 * 60 * 60);
	});

	it('rejects an expired token but keeps legacy (no-exp) tokens valid', () => {
		// Sign a body the same way the module does so the signature is valid and
		// only the exp check decides the outcome.
		const signToken = (body) => {
			const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
			const head = b64({ alg: 'HS256', typ: 'JWT' });
			const payload = b64(body);
			const sig = createHmac('sha256', SECRET).update(`${head}.${payload}`).digest('base64url');
			return `${head}.${payload}.${sig}`;
		};

		const nowSec = Math.floor(Date.now() / 1000);

		const expired = signToken({ sub: 'old', v: 1, iat: nowSec - 1000, exp: nowSec - 10 });
		expect(verifySupporterToken(expired, SECRET)).toBeNull();

		const legacy = signToken({ sub: 'legacy', v: 1, iat: nowSec - 1000 }); // no exp
		expect(verifySupporterToken(legacy, SECRET)).toMatchObject({ sub: 'legacy' });
	});
});
