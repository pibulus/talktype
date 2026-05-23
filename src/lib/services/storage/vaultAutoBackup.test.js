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

	it('backs up text history when Passport and Vault URL are saved', async () => {
		const transcripts = [{ id: 1, text: 'hello vault' }];
		const backup = vi.fn(async () => ({ transcriptCount: 1, audioCount: 0 }));

		await expect(
			autoBackupHistoryToVault({
				force: true,
				readCode: () => 'TT-ABCD-1234',
				readVaultUrl: () => 'https://vault.local',
				loadTranscripts: async () => transcripts,
				backup,
				includeAudio: false,
				retentionDays: '30'
			})
		).resolves.toMatchObject({
			skipped: false,
			summary: { transcriptCount: 1 }
		});

		expect(backup).toHaveBeenCalledWith({
			transcripts,
			code: 'TT-ABCD-1234',
			serverUrl: 'https://vault.local',
			includeAudio: false,
			retentionDays: '30'
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
