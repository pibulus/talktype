const DB_NAME = 'talktype-recordings';
const DB_VERSION = 2;
const STORE_NAME = 'pending-recordings';
const JOURNAL_STORE_NAME = 'recording-journal-chunks';
const STORE_KEY = 'latest';

let dbPromise = null;

function isBrowser() {
	return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function openDatabase() {
	if (!isBrowser()) {
		return Promise.resolve(null);
	}

	if (!dbPromise) {
		dbPromise = new Promise((resolve, reject) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION);

			request.onerror = () => {
				reject(request.error);
			};

			request.onupgradeneeded = (event) => {
				const db = event.target.result;
				if (!db.objectStoreNames.contains(STORE_NAME)) {
					const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
					store.createIndex('createdAt', 'createdAt');
				}
				if (!db.objectStoreNames.contains(JOURNAL_STORE_NAME)) {
					const journalStore = db.createObjectStore(JOURNAL_STORE_NAME, { keyPath: 'id' });
					journalStore.createIndex('sessionId', 'sessionId');
					journalStore.createIndex('sessionSequence', ['sessionId', 'sequence']);
					journalStore.createIndex('createdAt', 'createdAt');
				}
			};

			request.onsuccess = () => {
				const db = request.result;
				db.onversionchange = () => {
					db.close();
					dbPromise = null;
				};
				resolve(db);
			};
		});
	}

	return dbPromise;
}

function transactionDone(transaction) {
	return new Promise((resolve, reject) => {
		transaction.oncomplete = () => resolve(true);
		transaction.onerror = () => reject(transaction.error);
		transaction.onabort = () => reject(transaction.error);
	});
}

function requestResult(request) {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

function journalMetadata(sessionId, metadata = {}) {
	return {
		sessionId,
		chunkCount: metadata.chunkCount || 0,
		size: metadata.size || 0,
		mimeType: metadata.mimeType || 'audio/webm',
		updatedAt: metadata.updatedAt || Date.now()
	};
}

async function clearJournalStore(db) {
	if (!db.objectStoreNames.contains(JOURNAL_STORE_NAME)) return;

	const transaction = db.transaction(JOURNAL_STORE_NAME, 'readwrite');
	transaction.objectStore(JOURNAL_STORE_NAME).clear();
	await transactionDone(transaction);
}

export async function saveRecordingDraft(blob, metadata = {}, floatSamples = null) {
	const db = await openDatabase();
	if (!db || !blob) return null;

	const transaction = db.transaction([STORE_NAME, JOURNAL_STORE_NAME], 'readwrite');
	const store = transaction.objectStore(STORE_NAME);
	const record = {
		id: STORE_KEY,
		createdAt: Date.now(),
		blob,
		metadata,
		floatSamples: floatSamples instanceof Float32Array ? floatSamples : null
	};

	store.put(record);
	transaction.objectStore(JOURNAL_STORE_NAME).clear();
	await transactionDone(transaction);

	return {
		id: record.id,
		createdAt: record.createdAt,
		metadata: record.metadata
	};
}

export async function beginRecordingDraftJournal(sessionId, metadata = {}) {
	const db = await openDatabase();
	if (!db || !sessionId) return null;

	await clearJournalStore(db);

	const transaction = db.transaction(STORE_NAME, 'readwrite');
	const store = transaction.objectStore(STORE_NAME);
	store.delete(STORE_KEY);
	await transactionDone(transaction);

	return {
		id: STORE_KEY,
		createdAt: metadata.createdAt || Date.now(),
		metadata: {
			...metadata,
			recoveryJournal: journalMetadata(sessionId, metadata)
		}
	};
}

export async function appendRecordingDraftJournalChunk(sessionId, sequence, blob, metadata = {}) {
	const db = await openDatabase();
	if (!db || !sessionId || !blob || blob.size <= 0) return null;

	const transaction = db.transaction([STORE_NAME, JOURNAL_STORE_NAME], 'readwrite');
	const latestStore = transaction.objectStore(STORE_NAME);
	const journalStore = transaction.objectStore(JOURNAL_STORE_NAME);
	const currentRecord = (await requestResult(latestStore.get(STORE_KEY))) || {
		id: STORE_KEY,
		createdAt: metadata.createdAt || Date.now(),
		metadata: {},
		floatSamples: null
	};
	const nextMetadata = {
		...(currentRecord.metadata || {}),
		...metadata,
		size: metadata.size || blob.size,
		recoveryJournal: journalMetadata(sessionId, metadata)
	};
	const createdAt = currentRecord.createdAt || metadata.createdAt || Date.now();
	const updatedAt = metadata.updatedAt || Date.now();

	journalStore.put({
		id: `${sessionId}:${String(sequence).padStart(8, '0')}`,
		sessionId,
		sequence,
		createdAt: updatedAt,
		mimeType: metadata.mimeType || blob.type || 'audio/webm',
		size: blob.size,
		blob
	});

	latestStore.put({
		id: STORE_KEY,
		createdAt,
		blob: null,
		metadata: nextMetadata,
		floatSamples: null
	});

	await transactionDone(transaction);

	return {
		id: STORE_KEY,
		createdAt,
		metadata: nextMetadata
	};
}

export async function updateRecordingDraftJournalMetadata(sessionId, metadata = {}) {
	const db = await openDatabase();
	if (!db || !sessionId) return null;

	const transaction = db.transaction(STORE_NAME, 'readwrite');
	const store = transaction.objectStore(STORE_NAME);
	const currentRecord = (await requestResult(store.get(STORE_KEY))) || {
		id: STORE_KEY,
		createdAt: metadata.createdAt || Date.now(),
		metadata: {},
		floatSamples: null
	};
	const currentJournal = currentRecord.metadata?.recoveryJournal || {};
	const nextMetadata = {
		...(currentRecord.metadata || {}),
		...metadata,
		recoveryJournal: {
			...currentJournal,
			...journalMetadata(sessionId, {
				...currentJournal,
				...metadata
			})
		}
	};
	const createdAt = currentRecord.createdAt || metadata.createdAt || Date.now();

	store.put({
		id: STORE_KEY,
		createdAt,
		blob: null,
		metadata: nextMetadata,
		floatSamples: null
	});

	await transactionDone(transaction);

	return {
		id: STORE_KEY,
		createdAt,
		metadata: nextMetadata
	};
}

async function getJournalBlob(db, sessionId, mimeType) {
	if (!sessionId || !db.objectStoreNames.contains(JOURNAL_STORE_NAME)) return null;

	const transaction = db.transaction(JOURNAL_STORE_NAME, 'readonly');
	const store = transaction.objectStore(JOURNAL_STORE_NAME);
	const index = store.index('sessionId');
	const done = transactionDone(transaction);
	const chunks = (await requestResult(index.getAll(sessionId))) || [];
	await done;

	const blobs = chunks
		.sort((first, second) => first.sequence - second.sequence)
		.map((chunk) => chunk.blob)
		.filter((blob) => blob instanceof Blob && blob.size > 0);

	if (!blobs.length) return null;
	return new Blob(blobs, { type: mimeType || blobs[0].type || 'audio/webm' });
}

export async function getLatestRecordingDraft(
	options = { includeBlob: false, includeFloat: false }
) {
	const db = await openDatabase();
	if (!db) return null;

	const draft = await new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, 'readonly');
		const store = transaction.objectStore(STORE_NAME);
		const request = store.get(STORE_KEY);

		request.onsuccess = () => {
			const record = request.result;
			if (!record) {
				resolve(null);
				return;
			}

			const payload = { id: record.id, createdAt: record.createdAt, metadata: record.metadata };
			if (options.includeBlob) {
				if (record.blob instanceof Blob) {
					payload.blob = record.blob;
				}
			}
			if (options.includeFloat && record.floatSamples instanceof Float32Array) {
				payload.floatSamples = record.floatSamples;
			}

			resolve(payload);
		};

		request.onerror = () => {
			reject(request.error);
		};
	});

	if (options.includeBlob && !draft?.blob && draft?.metadata?.recoveryJournal?.sessionId) {
		draft.blob = await getJournalBlob(
			db,
			draft.metadata.recoveryJournal.sessionId,
			draft.metadata.mimeType || draft.metadata.recoveryJournal.mimeType
		);
	}

	return draft;
}

export async function deleteRecordingDraft() {
	const db = await openDatabase();
	if (!db) return false;

	const transaction = db.transaction([STORE_NAME, JOURNAL_STORE_NAME], 'readwrite');
	transaction.objectStore(STORE_NAME).delete(STORE_KEY);
	transaction.objectStore(JOURNAL_STORE_NAME).clear();
	await transactionDone(transaction);
	return true;
}
