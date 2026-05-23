import { browser } from '$app/environment';
import {
	readStoredSupporterCode,
	readStoredVaultServerUrl
} from '$lib/services/vaultHashStorage.js';
import { backupTranscriptsToVault } from './vaultTranscriptBackup.js';
import { loadAllTranscripts } from './transcriptStorage.js';

let autoBackupInFlight = null;
let queuedAutoBackupOptions = null;
let queuedAutoBackupPromise = null;

function queueAutoBackup(options) {
	queuedAutoBackupOptions = {
		...options,
		allowEmptyHistory: Boolean(
			queuedAutoBackupOptions?.allowEmptyHistory || options.allowEmptyHistory
		)
	};

	if (!queuedAutoBackupPromise) {
		queuedAutoBackupPromise = autoBackupInFlight.then(async () => {
			const queuedOptions = queuedAutoBackupOptions;
			queuedAutoBackupOptions = null;
			queuedAutoBackupPromise = null;

			return queuedOptions
				? autoBackupHistoryToVault(queuedOptions)
				: { skipped: true, reason: 'no-queued-backup' };
		});
	}

	return queuedAutoBackupPromise;
}

export async function autoBackupHistoryToVault(options = {}) {
	const {
		force = false,
		allowEmptyHistory = false,
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

	if (autoBackupInFlight) return queueAutoBackup(options);

	autoBackupInFlight = (async () => {
		const transcripts = await loadTranscripts();
		if (!Array.isArray(transcripts) || (!allowEmptyHistory && transcripts.length === 0)) {
			return { skipped: true, reason: 'empty-history' };
		}

		const summary = await backup({
			transcripts,
			code,
			serverUrl,
			includeAudio: options.includeAudio ?? true
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
