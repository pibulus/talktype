import { describe, expect, it } from 'vitest';
import {
	buildPassportSyncUrl,
	buildPassportQrPayload,
	buildQRBuddyRenderUrl,
	buildQRBuddyShareUrl,
	buildVaultHandshakeUrl,
	getVaultHandshakeQR
} from './qrHandshakeService.js';

const identity = {
	name: 'Neon Platypus',
	memberId: 'TT-A3F2-C819',
	isFallback: false
};

describe('QR handshake helpers', () => {
	it('can still build a display-only passport payload', () => {
		expect(buildPassportQrPayload(identity)).toBe(
			'talktype:passport:v1:TT-A3F2-C819:Neon Platypus'
		);
	});

	it('builds a Passport sync link with the code in the fragment', () => {
		const url = new URL(
			buildPassportSyncUrl({
				code: ' TT-SECRET-CODE ',
				vaultUrl: 'https://vault.local:3000',
				baseUrl: 'https://talktype.app'
			})
		);
		const fragment = new URLSearchParams(url.hash.slice(1));

		expect(url.origin).toBe('https://talktype.app');
		expect(url.pathname).toBe('/passport');
		expect(url.search).toBe('');
		expect(fragment.get('code')).toBe('TT-SECRET-CODE');
		expect(fragment.get('vault')).toBe('https://vault.local:3000');
	});

	it('does not build payloads for placeholder passports', () => {
		expect(buildPassportQrPayload({ ...identity, isFallback: true })).toBe('');
	});

	it('builds QRBuddy render and share URLs', () => {
		const payload = buildPassportQrPayload(identity);
		const renderUrl = new URL(
			buildQRBuddyRenderUrl(payload, {
				baseUrl: 'http://localhost:8005',
				style: 'candy',
				size: 192
			})
		);
		const shareUrl = new URL(
			buildQRBuddyShareUrl(payload, {
				baseUrl: 'http://localhost:8004',
				style: 'candy'
			})
		);

		expect(renderUrl.origin).toBe('http://localhost:8005');
		expect(renderUrl.pathname).toBe('/render-qr');
		expect(renderUrl.searchParams.get('d')).toBe(payload);
		expect(renderUrl.searchParams.get('s')).toBe('candy');
		expect(renderUrl.searchParams.get('size')).toBe('192');
		expect(shareUrl.origin).toBe('http://localhost:8004');
		expect(shareUrl.pathname).toBe('/q');
		expect(shareUrl.searchParams.get('d')).toBe(payload);
	});

	it('builds the legacy handoff helper as a Passport sync link', () => {
		const url = new URL(buildVaultHandshakeUrl('TT-SECRET-CODE', 'https://vault.local:3000'));
		const fragment = new URLSearchParams(url.hash.slice(1));

		expect(url.pathname).toBe('/passport');
		expect(fragment.get('code')).toBe('TT-SECRET-CODE');
		expect(fragment.get('vault')).toBe('https://vault.local:3000');
	});

	it('uses QRBuddy to render a Passport sync link', () => {
		const url = new URL(
			getVaultHandshakeQR({
				code: 'TT-SECRET-CODE',
				vaultUrl: 'https://vault.local:3000',
				appBaseUrl: 'https://talktype.app',
				baseUrl: 'http://localhost:8005',
				style: 'sunset'
			})
		);
		const payload = new URL(url.searchParams.get('d'));
		const fragment = new URLSearchParams(payload.hash.slice(1));

		expect(url.pathname).toBe('/render-qr');
		expect(payload.pathname).toBe('/passport');
		expect(fragment.get('code')).toBe('TT-SECRET-CODE');
	});
});
