/**
 * Bridges the Vault sync protocol with a trusted QR renderer.
 */

const DEFAULT_QRBUDDY_API_URL = 'https://qrbuddy.app';
const DEFAULT_QRBUDDY_APP_URL = 'https://qrbuddy.app';
const DEFAULT_QRBUDDY_STYLE = 'sunset';
const DEFAULT_QR_SIZE = 256;

function getEnvValue(key, fallback) {
	return import.meta.env?.[key]?.trim() || fallback;
}

function normalizeQrSize(size) {
	const parsed = Number.parseInt(size || '', 10);
	if (!Number.isFinite(parsed)) return DEFAULT_QR_SIZE;
	return Math.min(1024, Math.max(128, parsed));
}

export function buildPassportQrPayload(identity) {
	if (!identity || identity.isFallback) return '';

	const memberId = identity.memberId?.toString().trim();
	const name = identity.name?.toString().trim();

	if (!memberId || !name) return '';

	return `talktype:passport:v1:${memberId}:${name}`;
}

export function buildQRBuddyRenderUrl(data, options = {}) {
	if (!data) return '';

	const baseUrl = options.baseUrl || getEnvValue('PUBLIC_QRBUDDY_API_URL', DEFAULT_QRBUDDY_API_URL);
	const url = new URL('/render-qr', baseUrl);
	url.searchParams.set('d', data);
	url.searchParams.set('s', options.style || DEFAULT_QRBUDDY_STYLE);
	url.searchParams.set('size', String(normalizeQrSize(options.size)));
	return url.toString();
}

export function buildQRBuddyShareUrl(data, options = {}) {
	if (!data) return '';

	const baseUrl = options.baseUrl || getEnvValue('PUBLIC_QRBUDDY_APP_URL', DEFAULT_QRBUDDY_APP_URL);
	const url = new URL('/q', baseUrl);
	url.searchParams.set('d', data);
	url.searchParams.set('s', options.style || DEFAULT_QRBUDDY_STYLE);
	return url.toString();
}

export function getVaultHandshakeQR(options = {}) {
	const data = options.data || buildPassportQrPayload(options.identity);
	return buildQRBuddyRenderUrl(data, options);
}

export function buildVaultHandshakeUrl() {
	throw new Error(
		'Passport transfer QR is not implemented because supporter codes must not be embedded.'
	);
}
