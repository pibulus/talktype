import { SUPPORTER_VAULT } from '$lib/constants';
import { saveAudioToVaultWithManifest, saveToVault } from '$lib/services/syncService.js';
import { cleanTranscriptTags } from './transcriptTags.js';

const VAULT_APP_NAME = 'talktype';

function getTranscriptId(transcript) {
	return String(transcript.id ?? transcript.timestamp ?? Date.now());
}

async function createTranscriptMediaId(transcript) {
	const source = [
		getTranscriptId(transcript),
		transcript.timestamp || '',
		transcript.duration || 0,
		transcript.wordCount || 0,
		transcript.audioBlob?.size || 0,
		transcript.audioBlob?.type || 'audio/webm'
	].join(':');
	const encoded = new TextEncoder().encode(source);
	const digest = await crypto.subtle.digest('SHA-256', encoded);
	const hash = Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, '0')
	).join('');

	return `clip-${hash.slice(0, 24)}`;
}

function serializeTranscript(transcript, audio = null) {
	return {
		id: getTranscriptId(transcript),
		text: transcript.text || '',
		duration: transcript.duration || 0,
		timestamp: transcript.timestamp || Date.now(),
		promptStyle: transcript.promptStyle || 'standard',
		method: transcript.method || 'gemini',
		wordCount:
			transcript.wordCount || (transcript.text ? transcript.text.trim().split(/\s+/).length : 0),
		tags: cleanTranscriptTags(transcript.tags || []),
		audio
	};
}

export function countTranscriptsWithAudio(transcripts) {
	if (!Array.isArray(transcripts)) return 0;
	return transcripts.filter((transcript) => transcript?.audioBlob instanceof Blob).length;
}

export async function backupTranscriptsToVault({
	transcripts,
	code,
	serverUrl,
	includeAudio = false,
	retentionDays = String(SUPPORTER_VAULT.DEFAULT_AUDIO_RETENTION_DAYS),
	onProgress = () => {}
}) {
	if (!Array.isArray(transcripts)) {
		throw new Error('Vault backup needs transcript history');
	}
	if (!serverUrl?.trim()) {
		throw new Error('Vault backup needs a server URL');
	}
	if (!code?.trim()) {
		throw new Error('Vault backup needs a supporter code');
	}

	const cleanServerUrl = serverUrl.trim();
	const backedUpTranscripts = [];
	let audioCount = 0;

	for (const [index, transcript] of transcripts.entries()) {
		let audio = null;

		if (includeAudio && transcript?.audioBlob instanceof Blob) {
			const mediaId = await createTranscriptMediaId(transcript);
			const savedAudio = await saveAudioToVaultWithManifest(
				VAULT_APP_NAME,
				transcript.audioBlob,
				code,
				cleanServerUrl,
				{
					mediaId,
					transcriptId: getTranscriptId(transcript),
					duration: transcript.duration || 0,
					mimeType: transcript.audioBlob.type || 'audio/webm',
					createdAt: new Date(transcript.timestamp || Date.now()).toISOString(),
					retentionDays
				}
			);

			audio = {
				mediaId: savedAudio.mediaId,
				mediaHash: savedAudio.mediaHash,
				mimeType: savedAudio.mimeType,
				size: savedAudio.size,
				encryptedSize: savedAudio.encryptedSize
			};
			audioCount += 1;
		}

		backedUpTranscripts.push(serializeTranscript(transcript, audio));
		onProgress({
			current: index + 1,
			total: transcripts.length,
			audioCount
		});
	}

	const payload = {
		v: 1,
		updatedAt: new Date().toISOString(),
		audioIncluded: includeAudio,
		audioRetentionDays: String(retentionDays),
		transcripts: backedUpTranscripts
	};

	await saveToVault(VAULT_APP_NAME, payload, code, cleanServerUrl);

	return {
		transcriptCount: backedUpTranscripts.length,
		audioCount,
		includeAudio,
		updatedAt: payload.updatedAt
	};
}
