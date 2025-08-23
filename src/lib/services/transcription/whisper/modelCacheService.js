/**
 * Model Cache Service
 * Manages model caching, validation, and offline access
 */

import { writable, get } from 'svelte/store';

// Cache status store
export const cacheStatus = writable({
	initialized: false,
	available: false,
	cachedModels: [],
	totalSize: 0,
	error: null
});

class ModelCacheService {
	constructor() {
		this.dbName = 'TalkTypeModelCache';
		this.dbVersion = 1;
		this.storeName = 'models';
		this.db = null;
		this.initialized = false;
	}

	/**
	 * Initialize the cache service
	 */
	async initialize() {
		if (this.initialized) return true;

		try {
			// Check if IndexedDB is available
			if (!('indexedDB' in window)) {
				throw new Error('IndexedDB not available');
			}

			// Open database
			await this.openDatabase();

			// Get cached models info
			const models = await this.getCachedModels();

			cacheStatus.update((s) => ({
				...s,
				initialized: true,
				available: true,
				cachedModels: models,
				totalSize: models.reduce((sum, m) => sum + (m.size || 0), 0)
			}));

			this.initialized = true;
			console.log('✅ Model cache service initialized', { models });
			return true;
		} catch (error) {
			console.error('Failed to initialize cache service:', error);
			cacheStatus.update((s) => ({
				...s,
				initialized: true,
				available: false,
				error: error.message
			}));
			return false;
		}
	}

	/**
	 * Open IndexedDB database
	 */
	async openDatabase() {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, this.dbVersion);

			request.onerror = () => {
				reject(new Error('Failed to open database'));
			};

			request.onsuccess = () => {
				this.db = request.result;
				resolve(this.db);
			};

			request.onupgradeneeded = (event) => {
				const db = event.target.result;

				// Create object store if it doesn't exist
				if (!db.objectStoreNames.contains(this.storeName)) {
					const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
					store.createIndex('modelId', 'modelId', { unique: false });
					store.createIndex('timestamp', 'timestamp', { unique: false });
				}
			};
		});
	}

	/**
	 * Save model to cache
	 */
	async saveModel(modelId, modelData, metadata = {}) {
		if (!this.db) await this.openDatabase();

		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction([this.storeName], 'readwrite');
			const store = transaction.objectStore(this.storeName);

			const data = {
				id: modelId,
				modelId: modelId,
				data: modelData,
				metadata: {
					...metadata,
					timestamp: Date.now(),
					size: modelData.size || modelData.byteLength || 0
				}
			};

			const request = store.put(data);

			request.onsuccess = () => {
				console.log(`✅ Model ${modelId} saved to cache`);
				this.updateCacheStatus();
				resolve(true);
			};

			request.onerror = () => {
				console.error(`Failed to save model ${modelId}:`, request.error);
				reject(request.error);
			};
		});
	}

	/**
	 * Get model from cache
	 */
	async getModel(modelId) {
		if (!this.db) await this.openDatabase();

		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction([this.storeName], 'readonly');
			const store = transaction.objectStore(this.storeName);
			const request = store.get(modelId);

			request.onsuccess = () => {
				const result = request.result;
				if (result) {
					console.log(`✅ Model ${modelId} loaded from cache`);
					resolve(result.data);
				} else {
					resolve(null);
				}
			};

			request.onerror = () => {
				console.error(`Failed to get model ${modelId}:`, request.error);
				reject(request.error);
			};
		});
	}

	/**
	 * Check if model exists in cache
	 */
	async hasModel(modelId) {
		if (!this.db) await this.openDatabase();

		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction([this.storeName], 'readonly');
			const store = transaction.objectStore(this.storeName);
			const request = store.count(modelId);

			request.onsuccess = () => {
				resolve(request.result > 0);
			};

			request.onerror = () => {
				reject(request.error);
			};
		});
	}

	/**
	 * Get all cached models info
	 */
	async getCachedModels() {
		if (!this.db) await this.openDatabase();

		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction([this.storeName], 'readonly');
			const store = transaction.objectStore(this.storeName);
			const request = store.getAll();

			request.onsuccess = () => {
				const models = request.result.map((m) => ({
					id: m.id,
					modelId: m.modelId,
					size: m.metadata?.size || 0,
					timestamp: m.metadata?.timestamp || 0,
					...m.metadata
				}));
				resolve(models);
			};

			request.onerror = () => {
				reject(request.error);
			};
		});
	}

	/**
	 * Delete model from cache
	 */
	async deleteModel(modelId) {
		if (!this.db) await this.openDatabase();

		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction([this.storeName], 'readwrite');
			const store = transaction.objectStore(this.storeName);
			const request = store.delete(modelId);

			request.onsuccess = () => {
				console.log(`✅ Model ${modelId} deleted from cache`);
				this.updateCacheStatus();
				resolve(true);
			};

			request.onerror = () => {
				reject(request.error);
			};
		});
	}

	/**
	 * Clear all cached models
	 */
	async clearCache() {
		if (!this.db) await this.openDatabase();

		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction([this.storeName], 'readwrite');
			const store = transaction.objectStore(this.storeName);
			const request = store.clear();

			request.onsuccess = () => {
				console.log('✅ Model cache cleared');
				this.updateCacheStatus();
				resolve(true);
			};

			request.onerror = () => {
				reject(request.error);
			};
		});
	}

	/**
	 * Update cache status store
	 */
	async updateCacheStatus() {
		const models = await this.getCachedModels();
		cacheStatus.update((s) => ({
			...s,
			cachedModels: models,
			totalSize: models.reduce((sum, m) => sum + (m.size || 0), 0)
		}));
	}

	/**
	 * Get cache size in MB
	 */
	async getCacheSize() {
		const models = await this.getCachedModels();
		const bytes = models.reduce((sum, m) => sum + (m.size || 0), 0);
		return (bytes / (1024 * 1024)).toFixed(2);
	}

	/**
	 * Validate cached model
	 */
	async validateModel(modelId) {
		try {
			const model = await this.getModel(modelId);
			if (!model) return false;

			// Basic validation - check if data exists and has content
			return model && (model.size > 0 || model.byteLength > 0);
		} catch (error) {
			console.error(`Failed to validate model ${modelId}:`, error);
			return false;
		}
	}
}

// Export singleton instance
export const modelCacheService = new ModelCacheService();

// Initialize on import
if (typeof window !== 'undefined') {
	modelCacheService.initialize().catch(console.error);
}
