import { afterEach, describe, expect, it, vi } from 'vitest';
import { backupTranscriptsToVault, countTranscriptsWithAudio } from './vaultTranscriptBackup.js';

describe('Vault transcript backup', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('counts transcripts with audio blobs', () => {
		expect(
			countTranscriptsWithAudio([
				{ audioBlob: new Blob(['audio'], { type: 'audio/webm' }) },
				{ audioBlob: null },
				{}
			])
		).toBe(1);
	});

	it('can back up text history without uploading audio when a caller excludes media', async () => {
		const posts = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url, options = {}) => {
				if (options.method === 'POST') {
					posts.push({
						url: url.toString(),
						body: JSON.parse(options.body)
					});
				}

				return { ok: true, status: 200 };
			})
		);

		const summary = await backupTranscriptsToVault({
			transcripts: [
				{
					id: 1,
					text: 'hello vault',
					timestamp: Date.parse('2026-05-23T00:00:00.000Z'),
					audioBlob: new Blob(['audio'], { type: 'audio/webm' })
				}
			],
			code: 'TT-ABCD-1234',
			serverUrl: 'https://vault.local',
			includeAudio: false
		});

		expect(summary).toMatchObject({
			transcriptCount: 1,
			audioCount: 0,
			includeAudio: false
		});
		expect(posts).toHaveLength(1);
		expect(posts[0].url).toMatch(/^https:\/\/vault\.local\/vault\/talktype\/[a-f0-9]{64}$/);
		expect(posts[0].body.data).not.toContain('hello vault');
	});

	it('uploads audio media and an encrypted manifest when media backup is requested', async () => {
		const posts = [];
		const payloads = new Map();

		vi.stubGlobal(
			'fetch',
			vi.fn(async (url, options = {}) => {
				const key = url.toString();
				if (options.method === 'POST') {
					const body = JSON.parse(options.body);
					posts.push({ url: key, body });
					payloads.set(key, body.data);
					return { ok: true, status: 200 };
				}

				const payload = payloads.get(key);
				if (!payload) return { ok: false, status: 404 };

				return {
					ok: true,
					status: 200,
					json: async () => ({ data: payload })
				};
			})
		);

		const summary = await backupTranscriptsToVault({
			transcripts: [
				{
					id: 1,
					text: 'audio backup',
					duration: 12,
					wordCount: 2,
					timestamp: Date.parse('2026-05-23T00:00:00.000Z'),
					audioBlob: new Blob(['audio'], { type: 'audio/webm' })
				}
			],
			code: 'TT-ABCD-1234',
			serverUrl: 'https://vault.local',
			includeAudio: true,
			retentionDays: '30'
		});

		expect(summary).toMatchObject({
			transcriptCount: 1,
			audioCount: 1,
			includeAudio: true
		});
		expect(posts.map((post) => new URL(post.url).pathname)).toEqual([
			expect.stringMatching(/^\/vault\/talktype-media\/[a-f0-9]{64}$/),
			expect.stringMatching(/^\/vault\/talktype-media-index\/[a-f0-9]{64}$/),
			expect.stringMatching(/^\/vault\/talktype\/[a-f0-9]{64}$/)
		]);
	});

	it('still saves the transcript snapshot when one audio upload fails', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const posts = [];

		vi.stubGlobal(
			'fetch',
			vi.fn(async (url, options = {}) => {
				const pathname = new URL(url.toString()).pathname;
				if (options.method === 'POST') {
					posts.push(pathname);
					if (pathname.startsWith('/vault/talktype-media/')) {
						return { ok: false, status: 413 };
					}
				}

				return { ok: true, status: 200 };
			})
		);

		const summary = await backupTranscriptsToVault({
			transcripts: [
				{
					id: 1,
					text: 'keep the note',
					timestamp: Date.parse('2026-05-23T00:00:00.000Z'),
					audioBlob: new Blob(['audio'], { type: 'audio/webm' })
				}
			],
			code: 'TT-ABCD-1234',
			serverUrl: 'https://vault.local'
		});

		expect(summary).toMatchObject({
			transcriptCount: 1,
			audioCount: 0,
			audioFailed: 1,
			includeAudio: true
		});
		expect(posts).toEqual([
			expect.stringMatching(/^\/vault\/talktype-media\/[a-f0-9]{64}$/),
			expect.stringMatching(/^\/vault\/talktype\/[a-f0-9]{64}$/)
		]);
		expect(warn).toHaveBeenCalled();
	});
});
