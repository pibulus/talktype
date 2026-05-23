/**
 * Bridges Passport import links with a trusted QR renderer.
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

function getTalkTypeBaseUrl(baseUrl) {
	if (baseUrl) return baseUrl;
	if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
	return getEnvValue('PUBLIC_APP_URL', 'https://talktype.app');
}

export function buildPassportSyncUrl({ code, vaultUrl = '', baseUrl = '', appBaseUrl = '' } = {}) {
	const normalizedCode = code?.toString().trim();
	if (!normalizedCode) return '';

	const url = new URL('/passport', getTalkTypeBaseUrl(appBaseUrl || baseUrl));
	const fragment = new URLSearchParams();
	fragment.set('code', normalizedCode);
	if (vaultUrl?.toString().trim()) fragment.set('vault', vaultUrl.toString().trim());
	url.hash = fragment.toString();
	return url.toString();
}

export function buildPassportQrPayload(identityOrOptions) {
	if (identityOrOptions?.code) return buildPassportSyncUrl(identityOrOptions);
	if (!identityOrOptions || identityOrOptions.isFallback) return '';

	const memberId = identityOrOptions.memberId?.toString().trim();
	const name = identityOrOptions.name?.toString().trim();

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
	const data =
		options.data ||
		(options.code
			? buildPassportSyncUrl({
					...options,
					baseUrl: options.appBaseUrl
				})
			: '') ||
		buildPassportQrPayload(options.identity || options);
	return buildQRBuddyRenderUrl(data, options);
}

export function buildVaultHandshakeUrl(code, syncBaseUrl = '') {
	return buildPassportSyncUrl({
		code,
		vaultUrl: syncBaseUrl
	});
}
