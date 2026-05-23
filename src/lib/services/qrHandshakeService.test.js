import { describe, expect, it } from 'vitest';
import {
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
	it('builds a non-secret passport QR payload', () => {
		expect(buildPassportQrPayload(identity)).toBe(
			'talktype:passport:v1:TT-A3F2-C819:Neon Platypus'
		);
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

	it('keeps supporter-code handoff disabled until there is a real transfer protocol', () => {
		expect(() => buildVaultHandshakeUrl('TT-SECRET-CODE', '/sync')).toThrow(
			/supporter codes must not be embedded/
		);
	});

	it('uses the same safe renderer path for the legacy QR helper name', () => {
		const url = new URL(
			getVaultHandshakeQR({
				identity,
				baseUrl: 'http://localhost:8005',
				style: 'sunset'
			})
		);

		expect(url.pathname).toBe('/render-qr');
		expect(url.toString()).not.toContain('TT-SECRET-CODE');
		expect(url.searchParams.get('d')).toContain('TT-A3F2-C819');
	});
});
