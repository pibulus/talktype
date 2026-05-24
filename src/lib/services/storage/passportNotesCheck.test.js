import { describe, expect, it, vi } from 'vitest';
import { checkPassportNotes } from './passportNotesCheck.js';

const code = 'TT-ABCD-1234';
const serverUrl = 'https://vault.local';

describe('Passport notes check-in', () => {
	it('skips when the device has no Passport or notes source', async () => {
		const backup = vi.fn();

		await expect(
			checkPassportNotes({
				force: true,
				readCode: () => '',
				readServerUrl: () => serverUrl,
				backup
			})
		).resolves.toMatchObject({
			skipped: true,
			reason: 'missing-passport'
		});
		expect(backup).not.toHaveBeenCalled();
	});

	it('pulls the current notes mirror when the remote copy is newer', async () => {
		const restore = vi.fn(async () => ({ imported: 1, total: 1 }));
		const markChangedAt = vi.fn();

		await expect(
			checkPassportNotes({
				force: true,
				readCode: () => code,
				readServerUrl: () => serverUrl,
				loadTranscripts: async () => [{ id: 1, text: 'old', timestamp: 1000 }],
				loadMirror: async () => ({ missing: false, updatedAtMs: 5000, total: 1 }),
				restore,
				getChangedAt: () => 1000,
				markChangedAt
			})
		).resolves.toMatchObject({
			skipped: false,
			action: 'pulled'
		});

		expect(restore).toHaveBeenCalledWith({
			code,
			serverUrl,
			includeAudio: true,
			replaceExisting: true
		});
		expect(markChangedAt).toHaveBeenCalledWith(5000);
	});

	it('pushes the current local notes when this device is newer', async () => {
		const backup = vi.fn(async () => ({
			summary: { transcriptCount: 1, audioCount: 0 }
		}));

		await expect(
			checkPassportNotes({
				force: true,
				readCode: () => code,
				readServerUrl: () => serverUrl,
				loadTranscripts: async () => [{ id: 1, text: 'new', timestamp: 3000 }],
				loadMirror: async () => ({ missing: false, updatedAtMs: 2000, total: 1 }),
				backup,
				getChangedAt: () => 3000
			})
		).resolves.toMatchObject({
			skipped: false,
			action: 'pushed',
			summary: { transcriptCount: 1 }
		});

		expect(backup).toHaveBeenCalledWith({ allowEmptyHistory: true });
	});

	it('uses transcript timestamps as a fallback for existing local history', async () => {
		const backup = vi.fn(async () => ({
			summary: { transcriptCount: 1, audioCount: 1 }
		}));

		await checkPassportNotes({
			force: true,
			readCode: () => code,
			readServerUrl: () => serverUrl,
			loadTranscripts: async () => [{ id: 1, text: 'older saved note', timestamp: 3000 }],
			loadMirror: async () => ({ missing: true, updatedAtMs: 0, total: 0 }),
			backup,
			getChangedAt: () => 0
		});

		expect(backup).toHaveBeenCalledWith({ allowEmptyHistory: true });
	});

	it('does nothing when local notes already match the mirror', async () => {
		const backup = vi.fn();
		const restore = vi.fn();

		await expect(
			checkPassportNotes({
				force: true,
				readCode: () => code,
				readServerUrl: () => serverUrl,
				loadTranscripts: async () => [{ id: 1, text: 'same', timestamp: 1000 }],
				loadMirror: async () => ({ missing: false, updatedAtMs: 1000, total: 1 }),
				backup,
				restore,
				getChangedAt: () => 1000
			})
		).resolves.toMatchObject({
			skipped: true,
			reason: 'current'
		});

		expect(backup).not.toHaveBeenCalled();
		expect(restore).not.toHaveBeenCalled();
	});

	it('keeps failed checks quiet for the main app flow', async () => {
		const logger = { warn: vi.fn() };

		await expect(
			checkPassportNotes({
				force: true,
				readCode: () => code,
				readServerUrl: () => serverUrl,
				loadTranscripts: async () => [],
				loadMirror: async () => {
					throw new Error('offline');
				},
				logger
			})
		).resolves.toMatchObject({
			skipped: true,
			reason: 'failed'
		});
		expect(logger.warn).toHaveBeenCalled();
	});
});
