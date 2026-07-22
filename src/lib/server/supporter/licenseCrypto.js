import crypto from 'crypto';
import { env } from '$env/dynamic/private';
import { normalizeSupporterCode } from '../supporterCodes.js';

const CODE_PREFIX = 'TT';
const TOKEN_ALG = 'HS256';
const TOKEN_VERSION = 1;
// Supporter term. PRICING says "lasts a year" — make the token actually enforce it.
const TOKEN_TTL_SECONDS = 365 * 24 * 60 * 60;

export function getSupporterSecret() {
	const secret =
		env.SUPPORTER_LICENSE_SECRET?.trim() ||
		env.API_COOKIE_SECRET?.trim() ||
		env.API_AUTH_TOKEN?.trim();

	if (!secret || secret.length < 16) {
		throw new Error('Supporter license secret is not configured');
	}

	return secret;
}

function base64url(value) {
	return Buffer.from(value).toString('base64url');
}

function hmacHex(value, secret = getSupporterSecret()) {
	return crypto.createHmac('sha256', secret).update(value).digest('hex').toUpperCase();
}

export function generateClaimToken() {
	return crypto.randomBytes(32).toString('base64url');
}

export function hashSensitiveValue(value, secret = getSupporterSecret()) {
	return hmacHex(value, secret).toLowerCase();
}

export function generateLicenseCode(seed, secret = getSupporterSecret()) {
	const digest = hmacHex(`talktype-license:${seed}`, secret);
	return `${CODE_PREFIX}-${digest.slice(0, 4)}-${digest.slice(4, 8)}-${digest.slice(8, 12)}`;
}

// Deterministic license id derived from the checkout id. Two concurrent callers
// (Square webhook + claim poll) racing createLicenseForCheckout therefore mint
// byte-identical license objects, so a last-write-wins overwrite is a harmless
// no-op instead of losing a paid supporter's license. Formatted as a UUID so it
// stays drop-in compatible with the previous crypto.randomUUID() ids.
export function licenseIdForCheckout(checkoutId, secret = getSupporterSecret()) {
	const hex = hmacHex(`talktype-license-id:${checkoutId}`, secret).toLowerCase();
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function hashSupporterCode(code, secret = getSupporterSecret()) {
	return hashSensitiveValue(normalizeSupporterCode(code), secret);
}

export function issueSupporterToken(payload, secret = getSupporterSecret()) {
	const header = { alg: TOKEN_ALG, typ: 'JWT' };
	const issuedAt = Math.floor(Date.now() / 1000);
	const body = {
		...payload,
		v: TOKEN_VERSION,
		iat: issuedAt,
		exp: issuedAt + TOKEN_TTL_SECONDS
	};

	const encodedHeader = base64url(JSON.stringify(header));
	const encodedBody = base64url(JSON.stringify(body));
	const signature = crypto
		.createHmac('sha256', secret)
		.update(`${encodedHeader}.${encodedBody}`)
		.digest('base64url');

	return `${encodedHeader}.${encodedBody}.${signature}`;
}

export function verifySupporterToken(token, secret = getSupporterSecret()) {
	const [encodedHeader, encodedBody, signature] = token?.split('.') || [];
	if (!encodedHeader || !encodedBody || !signature) return null;

	const expectedSignature = crypto
		.createHmac('sha256', secret)
		.update(`${encodedHeader}.${encodedBody}`)
		.digest('base64url');

	const signatureBuffer = Buffer.from(signature, 'base64url');
	const expectedBuffer = Buffer.from(expectedSignature, 'base64url');

	if (
		signatureBuffer.length !== expectedBuffer.length ||
		!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
	) {
		return null;
	}

	try {
		const body = JSON.parse(Buffer.from(encodedBody, 'base64url').toString('utf8'));
		// Reject expired tokens. Legacy tokens minted before exp existed have no
		// exp field and stay valid (the signature still gates them); only enforce
		// when exp is present so we don't lock out already-issued supporters.
		if (Number.isFinite(body?.exp) && body.exp < Math.floor(Date.now() / 1000)) {
			return null;
		}
		return body;
	} catch {
		return null;
	}
}
