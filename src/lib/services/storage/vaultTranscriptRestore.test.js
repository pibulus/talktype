import { afterEach, describe, expect, it, vi } from 'vitest';
import { encrypt, encryptBlob } from '../encryptionService.js';
import { importTranscriptHistory } from './transcriptStorage.js';
import { restoreTranscriptsFromVault } from './vaultTranscriptBackup.js';

vi.mock('./transcriptStorage.js', () => ({
	importTranscriptHistory: vi.fn(async (transcripts) => ({
		imported: transcripts.length,
		updated: 0,
		total: transcripts.length
	})),
	markHistoryChangedAt: vi.fn()
}));

describe('Vault transcript restore', () => {
	afterEach(() => {
		vi.clearAllMocks();
		vi.unstubAllGlobals();
	});

	it('loads encrypted Vault history and restores referenced audio', async () => {
		const code = 'TT-ABCD-1234';
		const vaultPayload = await encrypt(
			{
				v: 1,
				updatedAt: '2026-05-23T00:00:00.000Z',
				transcripts: [
					{
						id: 'source-1',
						text: 'hello from the vault',
						timestamp: Date.parse('2026-05-23T00:00:00.000Z'),
						duration: 12,
						audio: { mediaId: 'clip-1' }
					}
				]
			},
			code
		);
		const audioPayload = await encryptBlob(
			new Blob(['vault audio'], { type: 'audio/webm' }),
			code,
			{
				mediaId: 'clip-1',
				mimeType: 'audio/webm'
			}
		);

		vi.stubGlobal(
			'fetch',
			vi.fn(async (url) => {
				const pathname = new URL(url).pathname;

				if (pathname.includes('/talktype-media/')) {
					return {
						ok: true,
						status: 200,
						json: async () => ({ data: audioPayload })
					};
				}

				if (pathname.includes('/talktype/')) {
					return {
						ok: true,
						status: 200,
						json: async () => ({ data: vaultPayload })
					};
				}

				return { ok: false, status: 404 };
			})
		);

		const summary = await restoreTranscriptsFromVault({
			code,
			serverUrl: 'https://vault.local'
		});

		expect(summary).toMatchObject({
			missing: false,
			imported: 1,
			total: 1,
			audioCount: 1,
			audioFailed: 0
		});
		expect(importTranscriptHistory).toHaveBeenCalledWith([
			expect.objectContaining({
				id: 'source-1',
				text: 'hello from the vault',
				audioBlob: expect.any(Blob)
			})
		]);
	});
});
