/**
 * Bridges the Vault sync protocol with a trusted QR renderer.
 */

export function buildVaultHandshakeUrl(code, syncBaseUrl) {
	if (!code) {
		throw new Error('Vault QR needs a supporter code');
	}

	const baseUrl =
		typeof window !== 'undefined' && window.location?.origin
			? window.location.origin
			: 'https://talktype.local';
	const url = new URL(syncBaseUrl, baseUrl);
	url.hash = `code=${encodeURIComponent(code)}`;
	return url.toString();
}

export async function getVaultHandshakeQR() {
	throw new Error(
		'Vault QR generation needs a trusted local renderer before codes can be embedded.'
	);
}
