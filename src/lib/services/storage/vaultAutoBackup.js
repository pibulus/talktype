import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { vaultAudioRetentionDays, vaultAudioSync } from '$lib';
import {
	readStoredSupporterCode,
	readStoredVaultServerUrl
} from '$lib/services/vaultHashStorage.js';
import { backupTranscriptsToVault } from './vaultTranscriptBackup.js';
import { loadAllTranscripts } from './transcriptStorage.js';

let autoBackupInFlight = null;

export async function autoBackupHistoryToVault(options = {}) {
	const {
		force = false,
		loadTranscripts = loadAllTranscripts,
		backup = backupTranscriptsToVault,
		readCode = readStoredSupporterCode,
		readVaultUrl = readStoredVaultServerUrl,
		logger = console
	} = options;

	if (!browser && !force) {
		return { skipped: true, reason: 'not-browser' };
	}

	const code = readCode();
	const serverUrl = readVaultUrl();

	if (!code || !serverUrl) {
		return { skipped: true, reason: 'missing-passport-or-vault' };
	}

	if (autoBackupInFlight) return autoBackupInFlight;

	autoBackupInFlight = (async () => {
		const transcripts = await loadTranscripts();
		if (!Array.isArray(transcripts) || transcripts.length === 0) {
			return { skipped: true, reason: 'empty-history' };
		}

		const summary = await backup({
			transcripts,
			code,
			serverUrl,
			includeAudio: options.includeAudio ?? get(vaultAudioSync) === 'true',
			retentionDays: options.retentionDays ?? get(vaultAudioRetentionDays)
		});

		return { skipped: false, summary };
	})()
		.catch((error) => {
			logger.warn?.('Vault auto-backup failed:', error);
			return { skipped: true, reason: 'failed', error };
		})
		.finally(() => {
			autoBackupInFlight = null;
		});

	return autoBackupInFlight;
}
