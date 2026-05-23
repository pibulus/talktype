import {
	deleteAudioFromVault,
	loadAudioFromVault,
	loadAudioManifestFromVault,
	loadFromVault,
	saveAudioManifestToVault,
	saveAudioToVault,
	saveToVault
} from '$lib/services/syncService.js';
import { importTranscriptHistory } from './transcriptStorage.js';
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

function deserializeTranscript(transcript, audioBlob = null) {
	const text = transcript?.text || '';
	return {
		id: transcript?.id,
		vaultSourceId: transcript?.id,
		text,
		audioBlob,
		duration: transcript?.duration || 0,
		timestamp: Number(transcript?.timestamp) || Date.now(),
		promptStyle: transcript?.promptStyle || 'standard',
		method: transcript?.method || 'gemini',
		wordCount:
			transcript?.wordCount || (text ? text.trim().split(/\s+/).filter(Boolean).length : 0),
		tags: cleanTranscriptTags(transcript?.tags || [])
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
	includeAudio = true,
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
	let audioFailed = 0;
	let audioDeleted = 0;
	let audioDeleteFailed = 0;
	const previousManifest = includeAudio
		? await loadAudioManifestFromVault(VAULT_APP_NAME, code, cleanServerUrl)
		: { entries: [] };
	const previousEntries = Array.isArray(previousManifest.entries) ? previousManifest.entries : [];
	const previousEntriesById = new Map(previousEntries.map((entry) => [entry.mediaId, entry]));
	const currentAudioEntries = [];
	const referencedMediaIds = new Set();

	for (const [index, transcript] of transcripts.entries()) {
		let audio = null;

		if (includeAudio && transcript?.audioBlob instanceof Blob) {
			try {
				const mediaId = await createTranscriptMediaId(transcript);
				const existingAudio = previousEntriesById.get(mediaId);
				const savedAudio =
					existingAudio?.size === transcript.audioBlob.size
						? existingAudio
						: await saveAudioToVault(VAULT_APP_NAME, transcript.audioBlob, code, cleanServerUrl, {
								mediaId,
								transcriptId: getTranscriptId(transcript),
								duration: transcript.duration || 0,
								mimeType: transcript.audioBlob.type || 'audio/webm',
								createdAt: new Date(transcript.timestamp || Date.now()).toISOString()
							});

				audio = {
					mediaId: savedAudio.mediaId,
					mediaHash: savedAudio.mediaHash,
					mimeType: savedAudio.mimeType,
					size: savedAudio.size,
					encryptedSize: savedAudio.encryptedSize
				};
				currentAudioEntries.push({
					...savedAudio,
					transcriptId: getTranscriptId(transcript),
					duration: transcript.duration || 0,
					createdAt:
						savedAudio.createdAt || new Date(transcript.timestamp || Date.now()).toISOString()
				});
				referencedMediaIds.add(savedAudio.mediaId);
				audioCount += 1;
			} catch (error) {
				console.warn('Failed to back up Vault audio clip:', error);
				audioFailed += 1;
			}
		}

		backedUpTranscripts.push(serializeTranscript(transcript, audio));
		onProgress({
			current: index + 1,
			total: transcripts.length,
			audioCount,
			audioFailed
		});
	}

	const payload = {
		v: 1,
		updatedAt: new Date().toISOString(),
		audioIncluded: includeAudio,
		audioMirror: includeAudio,
		transcripts: backedUpTranscripts
	};

	await saveToVault(VAULT_APP_NAME, payload, code, cleanServerUrl);

	if (includeAudio) {
		const retainedStaleEntries = [];
		for (const entry of previousEntries) {
			if (!entry?.mediaId || referencedMediaIds.has(entry.mediaId)) continue;

			try {
				await deleteAudioFromVault(VAULT_APP_NAME, entry.mediaId, code, cleanServerUrl);
				audioDeleted += 1;
			} catch (error) {
				console.warn('Failed to delete stale Vault audio clip:', error);
				audioDeleteFailed += 1;
				retainedStaleEntries.push(entry);
			}
		}

		await saveAudioManifestToVault(
			VAULT_APP_NAME,
			{
				v: 1,
				entries: [...currentAudioEntries, ...retainedStaleEntries]
			},
			code,
			cleanServerUrl
		);
	}

	return {
		transcriptCount: backedUpTranscripts.length,
		audioCount,
		audioFailed,
		audioDeleted,
		audioDeleteFailed,
		includeAudio,
		updatedAt: payload.updatedAt
	};
}

export async function restoreTranscriptsFromVault({
	code,
	serverUrl,
	includeAudio = true,
	onProgress = () => {}
}) {
	if (!serverUrl?.trim()) {
		throw new Error('Vault restore needs a server URL');
	}
	if (!code?.trim()) {
		throw new Error('Vault restore needs a supporter code');
	}

	const cleanServerUrl = serverUrl.trim();
	const payload = await loadFromVault(VAULT_APP_NAME, code, cleanServerUrl);

	if (!payload) {
		return {
			missing: true,
			imported: 0,
			updated: 0,
			total: 0,
			audioCount: 0,
			audioFailed: 0,
			updatedAt: null
		};
	}

	const vaultTranscripts = Array.isArray(payload.transcripts) ? payload.transcripts : [];
	const restoredTranscripts = [];
	let audioCount = 0;
	let audioFailed = 0;

	for (const [index, transcript] of vaultTranscripts.entries()) {
		let audioBlob = null;

		if (includeAudio && transcript?.audio?.mediaId) {
			try {
				const restoredAudio = await loadAudioFromVault(
					VAULT_APP_NAME,
					transcript.audio.mediaId,
					code,
					cleanServerUrl
				);
				if (restoredAudio?.blob) {
					audioBlob = restoredAudio.blob;
					audioCount += 1;
				}
			} catch (error) {
				console.warn('Failed to restore Vault audio clip:', error);
				audioFailed += 1;
			}
		}

		restoredTranscripts.push(deserializeTranscript(transcript, audioBlob));
		onProgress({
			current: index + 1,
			total: vaultTranscripts.length,
			audioCount,
			audioFailed
		});
	}

	const mergeSummary = await importTranscriptHistory(restoredTranscripts);

	return {
		missing: false,
		...mergeSummary,
		audioCount,
		audioFailed,
		updatedAt: payload.updatedAt || null
	};
}
