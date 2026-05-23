import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	createVaultMediaId,
	getVaultHash,
	getVaultMediaHash,
	loadAudioFromVault,
	saveAudioToVault
} from './syncService.js';

describe('Vault sync helpers', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('uses a stable case-insensitive supporter-code hash', async () => {
		await expect(getVaultHash(' tt-abcd-1234 ')).resolves.toBe(await getVaultHash('TT-ABCD-1234'));
	});

	it('uses stable media hashes per supporter code and media id', async () => {
		await expect(getVaultMediaHash(' tt-abcd-1234 ', 'clip-1')).resolves.toBe(
			await getVaultMediaHash('TT-ABCD-1234', 'clip-1')
		);
		await expect(getVaultMediaHash('TT-ABCD-1234', 'clip-1')).resolves.not.toBe(
			await getVaultMediaHash('TT-ABCD-1234', 'clip-2')
		);
	});

	it('creates uuid-shaped media ids', () => {
		expect(createVaultMediaId()).toMatch(
			/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
		);
	});

	it('round-trips encrypted audio through the Vault media namespace', async () => {
		let savedPayload = '';
		let savedUrl = '';

		vi.stubGlobal(
			'fetch',
			vi.fn(async (url, options = {}) => {
				if (options.method === 'POST') {
					savedUrl = url.toString();
					savedPayload = JSON.parse(options.body).data;
					return { ok: true, status: 200 };
				}

				return {
					ok: true,
					status: 200,
					json: async () => ({ data: savedPayload })
				};
			})
		);

		const code = 'TT-ABCD-1234';
		const audioBlob = new Blob(['vault audio'], { type: 'audio/webm' });
		const saved = await saveAudioToVault('talktype', audioBlob, code, 'https://vault.local/', {
			mediaId: 'clip-1',
			transcriptId: 'transcript-1',
			duration: 3
		});
		const loaded = await loadAudioFromVault(
			'talktype',
			saved.mediaId,
			code,
			'https://vault.local/'
		);

		expect(savedUrl).toMatch(/^https:\/\/vault\.local\/vault\/talktype-media\/[a-f0-9]{64}$/);
		expect(saved).toMatchObject({
			mediaId: 'clip-1',
			mimeType: 'audio/webm',
			size: audioBlob.size
		});
		expect(loaded.metadata).toMatchObject({
			mediaId: 'clip-1',
			transcriptId: 'transcript-1',
			duration: 3,
			mimeType: 'audio/webm'
		});
		expect(await loaded.blob.text()).toBe('vault audio');
	});
});
