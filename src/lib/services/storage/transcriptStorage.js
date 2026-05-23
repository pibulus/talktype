/**
 * Transcript Storage Service - IndexedDB storage for transcripts + audio
 * Premium feature: Save and manage transcript history
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { createLogger } from '$lib/utils/logger';
import {
	cleanTranscriptTags,
	generateTranscriptTags,
	getTranscriptTagPool
} from './transcriptTags.js';

const log = createLogger('TranscriptStorage');

const DB_NAME = 'TalkTypeTranscripts';
const DB_VERSION = 2;
const STORE_NAME = 'transcripts';

// Transcript history store
export const transcriptHistory = writable([]);
export const storageStats = writable({
	count: 0,
	totalSize: 0
});

let db = null;

/**
 * Initialize IndexedDB
 */
async function initDB() {
	if (!browser || db) return db;

	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => {
			log.error('Failed to open IndexedDB:', request.error);
			reject(request.error);
		};

		request.onsuccess = () => {
			db = request.result;
			log.log('Transcript storage initialized');
			resolve(db);
		};

		request.onupgradeneeded = (event) => {
			const database = event.target.result;

			let objectStore;

			if (!database.objectStoreNames.contains(STORE_NAME)) {
				objectStore = database.createObjectStore(STORE_NAME, {
					keyPath: 'id',
					autoIncrement: true
				});
			} else {
				objectStore = event.target.transaction.objectStore(STORE_NAME);
			}

			if (!objectStore.indexNames.contains('timestamp')) {
				objectStore.createIndex('timestamp', 'timestamp', { unique: false });
			}
			if (!objectStore.indexNames.contains('promptStyle')) {
				objectStore.createIndex('promptStyle', 'promptStyle', { unique: false });
			}
			if (!objectStore.indexNames.contains('method')) {
				objectStore.createIndex('method', 'method', { unique: false });
			}
			if (!objectStore.indexNames.contains('tags')) {
				objectStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
			}

			log.log('Transcript storage schema ready');
		};
	});
}

function getHistorySnapshot() {
	let current = [];
	transcriptHistory.subscribe((value) => {
		current = Array.isArray(value) ? value : [];
	})();
	return current;
}

function getGeneratedTags(text, explicitTags = null, excludedId = null) {
	if (Array.isArray(explicitTags) && explicitTags.length) {
		return cleanTranscriptTags(explicitTags);
	}

	const existingTranscripts = excludedId
		? getHistorySnapshot().filter((transcript) => transcript.id !== excludedId)
		: getHistorySnapshot();

	return generateTranscriptTags(text, getTranscriptTagPool(existingTranscripts));
}

function getRestoredTranscriptId(sourceId, timestamp) {
	const normalizedSourceId = sourceId?.toString().trim();
	return normalizedSourceId ? `vault:${normalizedSourceId}` : `vault:${timestamp || Date.now()}`;
}

function findExistingTranscript(transcripts, sourceId, timestamp, text) {
	const normalizedSourceId = sourceId?.toString();

	return transcripts.find((transcript) => {
		if (normalizedSourceId) {
			if (transcript.id?.toString() === normalizedSourceId) return true;
			if (transcript.vaultSourceId?.toString() === normalizedSourceId) return true;
			if (transcript.id?.toString() === `vault:${normalizedSourceId}`) return true;
		}

		return Boolean(
			timestamp && text && transcript.timestamp === timestamp && transcript.text === text
		);
	});
}

/**
 * Save a transcript to storage
 * @param {Object} transcript - Transcript data to save
 * @returns {Promise<number>} - ID of saved transcript
 */
export async function saveTranscript(transcript) {
	try {
		const database = await initDB();
		const transaction = database.transaction([STORE_NAME], 'readwrite');
		const store = transaction.objectStore(STORE_NAME);

		// Prepare transcript object
		const transcriptData = {
			text: transcript.text,
			audioBlob: transcript.audioBlob, // Store audio blob for later playback/download
			duration: transcript.duration || 0,
			timestamp: Date.now(),
			promptStyle: transcript.promptStyle || 'standard',
			method: transcript.method || 'gemini', // 'gemini' or 'whisper'
			wordCount: transcript.text ? transcript.text.split(/\s+/).length : 0,
			tags: getGeneratedTags(transcript.text, transcript.tags)
		};

		return new Promise((resolve, reject) => {
			const request = store.add(transcriptData);

			request.onsuccess = () => {
				log.log('Transcript saved:', request.result);
				updateStats();
				loadAllTranscripts(); // Refresh the list
				resolve(request.result);
			};

			request.onerror = () => {
				log.error('Failed to save transcript:', request.error);
				reject(request.error);
			};
		});
	} catch (error) {
		log.error('Error saving transcript:', error);
		throw error;
	}
}

export async function importTranscriptHistory(transcripts) {
	if (!Array.isArray(transcripts) || transcripts.length === 0) {
		return { imported: 0, updated: 0, total: 0 };
	}

	try {
		const database = await initDB();
		const existingTranscripts = await new Promise((resolve, reject) => {
			const transaction = database.transaction([STORE_NAME], 'readonly');
			const store = transaction.objectStore(STORE_NAME);
			const request = store.getAll();

			request.onsuccess = () => resolve(request.result || []);
			request.onerror = () => reject(request.error);
		});

		const transaction = database.transaction([STORE_NAME], 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		const transactionComplete = new Promise((resolve, reject) => {
			transaction.oncomplete = resolve;
			transaction.onerror = () => reject(transaction.error);
			transaction.onabort = () => reject(transaction.error);
		});
		let imported = 0;
		let updated = 0;

		await Promise.all(
			transcripts.map(
				(transcript) =>
					new Promise((resolve, reject) => {
						const timestamp = Number(transcript.timestamp) || Date.now();
						const text = transcript.text || '';
						const sourceId = transcript.vaultSourceId || transcript.id || timestamp;
						const existing = findExistingTranscript(existingTranscripts, sourceId, timestamp, text);
						const restored = {
							...existing,
							id: existing?.id ?? getRestoredTranscriptId(sourceId, timestamp),
							vaultSourceId: sourceId.toString(),
							text,
							audioBlob: transcript.audioBlob || existing?.audioBlob || null,
							duration: transcript.duration || 0,
							timestamp,
							promptStyle: transcript.promptStyle || 'standard',
							method: transcript.method || 'gemini',
							wordCount:
								transcript.wordCount ||
								(text ? text.trim().split(/\s+/).filter(Boolean).length : 0),
							tags: getGeneratedTags(text, transcript.tags)
						};

						const request = store.put(restored);
						request.onsuccess = () => {
							if (existing) updated += 1;
							else imported += 1;
							resolve();
						};
						request.onerror = () => reject(request.error);
					})
			)
		);

		await transactionComplete;

		updateStats();
		await loadAllTranscripts();

		return {
			imported,
			updated,
			total: transcripts.length
		};
	} catch (error) {
		log.error('Error importing transcript history:', error);
		throw error;
	}
}

/**
 * Load all transcripts from storage
 * @returns {Promise<Array>} - Array of transcript objects
 */
export async function loadAllTranscripts() {
	try {
		const database = await initDB();
		const transaction = database.transaction([STORE_NAME], 'readonly');
		const store = transaction.objectStore(STORE_NAME);
		const index = store.index('timestamp');

		return new Promise((resolve, reject) => {
			// Get all transcripts in reverse chronological order
			const request = index.openCursor(null, 'prev');
			const transcripts = [];

			request.onsuccess = (event) => {
				const cursor = event.target.result;
				if (cursor) {
					const transcript = cursor.value;
					transcripts.push({
						id: transcript.id,
						...transcript,
						tags: cleanTranscriptTags(
							transcript.tags?.length ? transcript.tags : generateTranscriptTags(transcript.text)
						)
					});
					cursor.continue();
				} else {
					// Done iterating
					transcriptHistory.set(transcripts);
					log.log(`Loaded ${transcripts.length} transcripts from history`);
					resolve(transcripts);
				}
			};

			request.onerror = () => {
				log.error('Failed to load transcripts:', request.error);
				reject(request.error);
			};
		});
	} catch (error) {
		log.error('Error loading transcripts:', error);
		return [];
	}
}

/**
 * Update a transcript's text
 * @param {number} id - Transcript ID
 * @param {string} newText - Updated transcript text
 * @returns {Promise<boolean>}
 */
export async function updateTranscript(id, newText, options = {}) {
	try {
		const database = await initDB();
		const transaction = database.transaction([STORE_NAME], 'readwrite');
		const store = transaction.objectStore(STORE_NAME);

		return new Promise((resolve, reject) => {
			// First get the existing transcript
			const getRequest = store.get(id);

			getRequest.onsuccess = () => {
				const transcript = getRequest.result;
				if (!transcript) {
					reject(new Error('Transcript not found'));
					return;
				}

				// Update the text and word count
				transcript.text = newText;
				transcript.wordCount = newText ? newText.split(/\s+/).length : 0;
				transcript.tags = getGeneratedTags(newText, options.tags, id);

				// Save the updated transcript
				const putRequest = store.put(transcript);

				putRequest.onsuccess = () => {
					log.log('Transcript updated:', id);
					updateStats();
					loadAllTranscripts(); // Refresh the list
					resolve(true);
				};

				putRequest.onerror = () => {
					log.error('Failed to update transcript:', putRequest.error);
					reject(putRequest.error);
				};
			};

			getRequest.onerror = () => {
				log.error('Failed to get transcript:', getRequest.error);
				reject(getRequest.error);
			};
		});
	} catch (error) {
		log.error('Error updating transcript:', error);
		return false;
	}
}

/**
 * Delete a transcript by ID
 * @param {number} id - Transcript ID
 * @returns {Promise<boolean>}
 */
export async function deleteTranscript(id) {
	try {
		const database = await initDB();
		const transaction = database.transaction([STORE_NAME], 'readwrite');
		const store = transaction.objectStore(STORE_NAME);

		return new Promise((resolve, reject) => {
			const request = store.delete(id);

			request.onsuccess = () => {
				log.log('Transcript deleted:', id);
				updateStats();
				loadAllTranscripts(); // Refresh the list
				resolve(true);
			};

			request.onerror = () => {
				log.error('Failed to delete transcript:', request.error);
				reject(request.error);
			};
		});
	} catch (error) {
		log.error('Error deleting transcript:', error);
		return false;
	}
}

/**
 * Clear all transcripts
 * @returns {Promise<boolean>}
 */
export async function clearAllTranscripts() {
	try {
		const database = await initDB();
		const transaction = database.transaction([STORE_NAME], 'readwrite');
		const store = transaction.objectStore(STORE_NAME);

		return new Promise((resolve, reject) => {
			const request = store.clear();

			request.onsuccess = () => {
				log.log('All transcripts cleared');
				transcriptHistory.set([]);
				updateStats();
				resolve(true);
			};

			request.onerror = () => {
				log.error('Failed to clear transcripts:', request.error);
				reject(request.error);
			};
		});
	} catch (error) {
		log.error('Error clearing transcripts:', error);
		return false;
	}
}

/**
 * Update storage statistics
 */
async function updateStats() {
	try {
		const database = await initDB();
		const transaction = database.transaction([STORE_NAME], 'readonly');
		const store = transaction.objectStore(STORE_NAME);

		const countRequest = store.count();
		countRequest.onsuccess = () => {
			storageStats.update((stats) => ({
				...stats,
				count: countRequest.result
			}));
		};

		// Calculate total size
		const getAllRequest = store.getAll();
		getAllRequest.onsuccess = () => {
			const transcripts = getAllRequest.result;
			let totalSize = 0;

			transcripts.forEach((transcript) => {
				// Estimate size
				totalSize += transcript.text?.length || 0;
				if (transcript.audioBlob) {
					totalSize += transcript.audioBlob.size || 0;
				}
			});

			storageStats.update((stats) => ({
				...stats,
				totalSize: totalSize
			}));
		};
	} catch (error) {
		log.error('Error updating stats:', error);
	}
}

/**
 * Export all transcripts as JSON
 * @returns {Promise<Object>}
 */
export async function exportTranscriptsAsJSON() {
	const transcripts = await loadAllTranscripts();

	return {
		exported: new Date().toISOString(),
		count: transcripts.length,
		transcripts: transcripts.map((t) => ({
			id: t.id,
			text: t.text,
			duration: t.duration,
			timestamp: t.timestamp,
			date: new Date(t.timestamp).toISOString(),
			promptStyle: t.promptStyle,
			method: t.method,
			wordCount: t.wordCount,
			hasAudio: !!t.audioBlob,
			tags: cleanTranscriptTags(t.tags || [])
		}))
	};
}

/**
 * Batch download all transcripts as individual text files
 * @returns {Promise<number>} - Number of files downloaded
 */
export async function batchDownloadTranscripts() {
	const transcripts = await loadAllTranscripts();

	if (transcripts.length === 0) {
		return 0;
	}

	// Download each transcript as a text file
	transcripts.forEach((transcript, index) => {
		const date = new Date(transcript.timestamp).toISOString().slice(0, 10);
		const filename = `transcript-${date}-${index + 1}.txt`;

		// Create file content
		let content = `TalkType Transcript\n`;
		content += `Date: ${new Date(transcript.timestamp).toLocaleString()}\n`;
		content += `Duration: ${transcript.duration}s\n`;
		content += `Method: ${transcript.method}\n`;
		content += `Style: ${transcript.promptStyle}\n`;
		content += `Word Count: ${transcript.wordCount}\n`;
		if (transcript.tags?.length) {
			content += `Tags: ${cleanTranscriptTags(transcript.tags)
				.map((tag) => `#${tag}`)
				.join(' ')}\n`;
		}
		content += `\n${'='.repeat(50)}\n\n`;
		content += transcript.text;

		// Download file
		const blob = new Blob([content], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;

		// Small delay between downloads to avoid browser blocking
		setTimeout(() => {
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}, index * 200);
	});

	return transcripts.length;
}

/**
 * Export all transcripts as a single JSON file
 * @returns {Promise<boolean>}
 */
export async function exportAllTranscriptsJSON() {
	const data = await exportTranscriptsAsJSON();

	const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `talktype-transcripts-${new Date().toISOString().slice(0, 10)}.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);

	return true;
}

/**
 * Format size in bytes to human-readable format
 * @param {number} bytes
 * @returns {string}
 */
export function formatSize(bytes) {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Initialize on import
if (browser) {
	initDB().then(() => {
		loadAllTranscripts();
		updateStats();
	});
}
