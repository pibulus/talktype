/**
 * Transcript Storage Service - IndexedDB storage for transcripts + audio
 * Premium feature: Save and manage transcript history
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

const DB_NAME = 'TalkTypeTranscripts';
const DB_VERSION = 1;
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
			console.error('Failed to open IndexedDB:', request.error);
			reject(request.error);
		};

		request.onsuccess = () => {
			db = request.result;
			console.log('📚 Transcript storage initialized');
			resolve(db);
		};

		request.onupgradeneeded = (event) => {
			const database = event.target.result;

			// Create object store with auto-incrementing key
			if (!database.objectStoreNames.contains(STORE_NAME)) {
				const objectStore = database.createObjectStore(STORE_NAME, {
					keyPath: 'id',
					autoIncrement: true
				});

				// Create indexes for queries
				objectStore.createIndex('timestamp', 'timestamp', { unique: false });
				objectStore.createIndex('promptStyle', 'promptStyle', { unique: false });
				objectStore.createIndex('method', 'method', { unique: false });

				console.log('📦 Transcript storage schema created');
			}
		};
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
			wordCount: transcript.text ? transcript.text.split(/\s+/).length : 0
		};

		return new Promise((resolve, reject) => {
			const request = store.add(transcriptData);

			request.onsuccess = () => {
				console.log('💾 Transcript saved:', request.result);
				updateStats();
				loadAllTranscripts(); // Refresh the list
				resolve(request.result);
			};

			request.onerror = () => {
				console.error('Failed to save transcript:', request.error);
				reject(request.error);
			};
		});
	} catch (error) {
		console.error('Error saving transcript:', error);
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
					transcripts.push({
						id: cursor.value.id,
						...cursor.value
					});
					cursor.continue();
				} else {
					// Done iterating
					transcriptHistory.set(transcripts);
					console.log(`📚 Loaded ${transcripts.length} transcripts from history`);
					resolve(transcripts);
				}
			};

			request.onerror = () => {
				console.error('Failed to load transcripts:', request.error);
				reject(request.error);
			};
		});
	} catch (error) {
		console.error('Error loading transcripts:', error);
		return [];
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
				console.log('🗑️ Transcript deleted:', id);
				updateStats();
				loadAllTranscripts(); // Refresh the list
				resolve(true);
			};

			request.onerror = () => {
				console.error('Failed to delete transcript:', request.error);
				reject(request.error);
			};
		});
	} catch (error) {
		console.error('Error deleting transcript:', error);
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
				console.log('🗑️ All transcripts cleared');
				transcriptHistory.set([]);
				updateStats();
				resolve(true);
			};

			request.onerror = () => {
				console.error('Failed to clear transcripts:', request.error);
				reject(request.error);
			};
		});
	} catch (error) {
		console.error('Error clearing transcripts:', error);
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
		console.error('Error updating stats:', error);
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
			hasAudio: !!t.audioBlob
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
