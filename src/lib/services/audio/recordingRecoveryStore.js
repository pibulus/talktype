const DB_NAME = 'talktype-recordings';
const STORE_NAME = 'pending-recordings';
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
			const request = indexedDB.open(DB_NAME, 1);

			request.onerror = () => {
				reject(request.error);
			};

			request.onupgradeneeded = (event) => {
				const db = event.target.result;
				if (!db.objectStoreNames.contains(STORE_NAME)) {
					const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
					store.createIndex('createdAt', 'createdAt');
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

export async function saveRecordingDraft(blob, metadata = {}, floatSamples = null) {
	const db = await openDatabase();
	if (!db || !blob) return null;

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);

		const record = {
			id: STORE_KEY,
			createdAt: Date.now(),
			blob,
			metadata,
			floatSamples: floatSamples instanceof Float32Array ? floatSamples : null
		};

		const request = store.put(record);

		request.onsuccess = () => {
			resolve({
				id: record.id,
				createdAt: record.createdAt,
				metadata: record.metadata
			});
		};

		request.onerror = () => {
			reject(request.error);
		};
	});
}

export async function getLatestRecordingDraft(options = { includeBlob: false, includeFloat: false }) {
	const db = await openDatabase();
	if (!db) return null;

	return new Promise((resolve, reject) => {
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
				payload.blob = record.blob;
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
}

export async function deleteRecordingDraft() {
	const db = await openDatabase();
	if (!db) return false;

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		const request = store.delete(STORE_KEY);

		request.onsuccess = () => resolve(true);
		request.onerror = () => reject(request.error);
	});
}
