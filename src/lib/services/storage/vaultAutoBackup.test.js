import { describe, expect, it, vi } from 'vitest';
import { autoBackupHistoryToVault } from './vaultAutoBackup.js';

describe('Vault auto-backup', () => {
	it('skips when the device has no Passport or Vault URL', async () => {
		const backup = vi.fn();

		await expect(
			autoBackupHistoryToVault({
				force: true,
				readCode: () => '',
				readVaultUrl: () => 'https://vault.local',
				backup
			})
		).resolves.toMatchObject({
			skipped: true,
			reason: 'missing-passport-or-vault'
		});
		expect(backup).not.toHaveBeenCalled();
	});

	it('backs up text and recording history when Passport and Vault URL are saved', async () => {
		const transcripts = [{ id: 1, text: 'hello vault' }];
		const backup = vi.fn(async () => ({ transcriptCount: 1, audioCount: 0 }));

		await expect(
			autoBackupHistoryToVault({
				force: true,
				readCode: () => 'TT-ABCD-1234',
				readVaultUrl: () => 'https://vault.local',
				loadTranscripts: async () => transcripts,
				backup
			})
		).resolves.toMatchObject({
			skipped: false,
			summary: { transcriptCount: 1 }
		});

		expect(backup).toHaveBeenCalledWith({
			transcripts,
			code: 'TT-ABCD-1234',
			serverUrl: 'https://vault.local',
			includeAudio: true
		});
	});

	it('can mirror an empty history when local history was cleared', async () => {
		const backup = vi.fn(async () => ({ transcriptCount: 0, audioCount: 0 }));

		await expect(
			autoBackupHistoryToVault({
				force: true,
				allowEmptyHistory: true,
				readCode: () => 'TT-ABCD-1234',
				readVaultUrl: () => 'https://vault.local',
				loadTranscripts: async () => [],
				backup
			})
		).resolves.toMatchObject({
			skipped: false,
			summary: { transcriptCount: 0 }
		});

		expect(backup).toHaveBeenCalledWith({
			transcripts: [],
			code: 'TT-ABCD-1234',
			serverUrl: 'https://vault.local',
			includeAudio: true
		});
	});

	it('skips empty history unless a mirror cleanup asks for it', async () => {
		const backup = vi.fn();

		await expect(
			autoBackupHistoryToVault({
				force: true,
				readCode: () => 'TT-ABCD-1234',
				readVaultUrl: () => 'https://vault.local',
				loadTranscripts: async () => [],
				backup
			})
		).resolves.toMatchObject({
			skipped: true,
			reason: 'empty-history'
		});
		expect(backup).not.toHaveBeenCalled();
	});

	it('runs a fresh queued backup after an in-flight backup finishes', async () => {
		let resolveFirstBackup;
		const backup = vi
			.fn()
			.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						resolveFirstBackup = resolve;
					})
			)
			.mockResolvedValueOnce({ transcriptCount: 0, audioCount: 0 });

		const first = autoBackupHistoryToVault({
			force: true,
			readCode: () => 'TT-ABCD-1234',
			readVaultUrl: () => 'https://vault.local',
			loadTranscripts: async () => [{ id: 1, text: 'old state' }],
			backup
		});
		const queued = autoBackupHistoryToVault({
			force: true,
			allowEmptyHistory: true,
			readCode: () => 'TT-ABCD-1234',
			readVaultUrl: () => 'https://vault.local',
			loadTranscripts: async () => [],
			backup
		});

		await Promise.resolve();
		expect(backup).toHaveBeenCalledTimes(1);
		resolveFirstBackup({ transcriptCount: 1, audioCount: 1 });

		await expect(first).resolves.toMatchObject({ skipped: false });
		await expect(queued).resolves.toMatchObject({
			skipped: false,
			summary: { transcriptCount: 0 }
		});
		expect(backup).toHaveBeenCalledTimes(2);
		expect(backup).toHaveBeenLastCalledWith({
			transcripts: [],
			code: 'TT-ABCD-1234',
			serverUrl: 'https://vault.local',
			includeAudio: true
		});
	});

	it('keeps backup failures quiet for the recording flow', async () => {
		const logger = { warn: vi.fn() };

		await expect(
			autoBackupHistoryToVault({
				force: true,
				readCode: () => 'TT-ABCD-1234',
				readVaultUrl: () => 'https://vault.local',
				loadTranscripts: async () => [{ id: 1, text: 'hello vault' }],
				backup: vi.fn(async () => {
					throw new Error('offline');
				}),
				logger
			})
		).resolves.toMatchObject({
			skipped: true,
			reason: 'failed'
		});
		expect(logger.warn).toHaveBeenCalled();
	});
});
