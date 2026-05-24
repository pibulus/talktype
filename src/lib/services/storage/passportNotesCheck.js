import { browser } from '$app/environment';
import {
	readStoredSupporterCode,
	readStoredVaultServerUrl
} from '$lib/services/vaultHashStorage.js';
import { autoBackupHistoryToVault } from './vaultAutoBackup.js';
import {
	getHistoryChangedAt,
	loadAllTranscripts,
	markHistoryChangedAt
} from './transcriptStorage.js';
import { loadVaultTranscriptMirror, restoreTranscriptsFromVault } from './vaultTranscriptBackup.js';

let checkInFlight = null;

function getHistoryTimestamp(transcripts) {
	if (!Array.isArray(transcripts) || transcripts.length === 0) return 0;

	return transcripts.reduce((latest, transcript) => {
		const timestamp = Number(transcript?.timestamp) || 0;
		return Math.max(latest, timestamp);
	}, 0);
}

export async function checkPassportNotes(options = {}) {
	const {
		force = false,
		readCode = readStoredSupporterCode,
		readServerUrl = readStoredVaultServerUrl,
		loadTranscripts = loadAllTranscripts,
		loadMirror = loadVaultTranscriptMirror,
		restore = restoreTranscriptsFromVault,
		backup = autoBackupHistoryToVault,
		getChangedAt = getHistoryChangedAt,
		markChangedAt = markHistoryChangedAt,
		logger = console
	} = options;

	if (!browser && !force) {
		return { skipped: true, reason: 'not-browser' };
	}

	if (checkInFlight) return checkInFlight;

	checkInFlight = (async () => {
		const code = readCode();
		const serverUrl = readServerUrl();

		if (!code || !serverUrl) {
			return { skipped: true, reason: 'missing-passport' };
		}

		const [transcripts, mirror] = await Promise.all([
			loadTranscripts(),
			loadMirror({ code, serverUrl })
		]);
		const localChangedAt = Math.max(getChangedAt(), getHistoryTimestamp(transcripts));
		const hasLocalHistory = Array.isArray(transcripts) && transcripts.length > 0;

		if (!mirror.missing && mirror.updatedAtMs > localChangedAt) {
			const summary = await restore({
				code,
				serverUrl,
				includeAudio: true,
				replaceExisting: true
			});
			if (mirror.updatedAtMs) markChangedAt(mirror.updatedAtMs);
			return { skipped: false, action: 'pulled', summary };
		}

		if (localChangedAt > mirror.updatedAtMs && (hasLocalHistory || localChangedAt > 0)) {
			const result = await backup({ allowEmptyHistory: true });
			return { skipped: false, action: 'pushed', summary: result.summary };
		}

		return { skipped: true, reason: 'current' };
	})()
		.catch((error) => {
			logger.warn?.('Passport notes check failed:', error);
			return { skipped: true, reason: 'failed', error };
		})
		.finally(() => {
			checkInFlight = null;
		});

	return checkInFlight;
}
