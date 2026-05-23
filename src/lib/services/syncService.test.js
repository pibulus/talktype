import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	createVaultMediaId,
	deleteAudioFromVault,
	deleteFromVault,
	getVaultHash,
	getVaultMediaHash,
	loadAudioManifestFromVault,
	loadAudioFromVault,
	saveAudioManifestToVault,
	saveAudioToVault
} from './syncService.js';

describe('Vault transport helpers', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
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

	it('saves and loads audio manifests through an encrypted media index', async () => {
		let savedUrl = '';
		let savedPayload = '';

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

		const manifest = {
			entries: [{ mediaId: 'clip-1', mediaHash: 'abc123', size: 12 }]
		};

		await saveAudioManifestToVault('talktype', manifest, 'TT-ABCD-1234', 'https://vault.local');
		const loaded = await loadAudioManifestFromVault(
			'talktype',
			'TT-ABCD-1234',
			'https://vault.local'
		);

		expect(savedUrl).toMatch(/^https:\/\/vault\.local\/vault\/talktype-media-index\/[a-f0-9]{64}$/);
		expect(loaded.entries).toEqual(manifest.entries);
	});

	it('rejects oversized audio before upload', async () => {
		const fetchSpy = vi.fn();
		vi.stubGlobal('fetch', fetchSpy);

		await expect(
			saveAudioToVault(
				'talktype',
				new Blob(['too large'], { type: 'audio/webm' }),
				'TT-ABCD-1234',
				'https://vault.local',
				{ maxSizeBytes: 2 }
			)
		).rejects.toThrow('Vault audio is too large');
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('deletes Vault JSON and audio payloads by derived address', async () => {
		const requests = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url, options = {}) => {
				requests.push({ pathname: new URL(url.toString()).pathname, method: options.method });
				return { ok: true, status: 200 };
			})
		);

		await deleteFromVault('talktype', 'TT-ABCD-1234', 'https://vault.local');
		await deleteAudioFromVault('talktype', 'clip-1', 'TT-ABCD-1234', 'https://vault.local');

		expect(requests).toEqual([
			{
				pathname: expect.stringMatching(/^\/vault\/talktype\/[a-f0-9]{64}$/),
				method: 'DELETE'
			},
			{
				pathname: expect.stringMatching(/^\/vault\/talktype-media\/[a-f0-9]{64}$/),
				method: 'DELETE'
			}
		]);
	});
});
