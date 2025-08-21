/**
 * Model Sharing Service - Share models between tabs for instant loading
 * Uses BroadcastChannel API for cross-tab communication
 */

import { get } from 'svelte/store';

export class ModelShareService {
	constructor() {
		this.channel = null;
		this.pendingRequests = new Map();
		this.modelCache = new Map();
		this.isSupported = typeof BroadcastChannel !== 'undefined';

		if (this.isSupported) {
			this.initialize();
		}
	}

	initialize() {
		this.channel = new BroadcastChannel('talktype-models');
		this.setupListeners();

		// Announce ourselves
		this.channel.postMessage({
			type: 'TAB_READY',
			tabId: this.getTabId(),
			timestamp: Date.now()
		});
	}

	/**
	 * Request a model from other tabs
	 */
	async requestModel(modelName, timeout = 1000) {
		if (!this.isSupported) {
			return null;
		}

		return new Promise((resolve) => {
			const requestId = Math.random().toString(36).substring(7);

			// Set up timeout
			const timeoutHandle = setTimeout(() => {
				this.pendingRequests.delete(requestId);
				console.log(`No response for model ${modelName} from other tabs`);
				resolve(null);
			}, timeout);

			// Store the pending request
			this.pendingRequests.set(requestId, {
				resolve,
				timeoutHandle,
				modelName
			});

			// Broadcast request
			console.log(`Requesting model ${modelName} from other tabs...`);
			this.channel.postMessage({
				type: 'REQUEST_MODEL',
				modelName,
				requestId,
				tabId: this.getTabId()
			});
		});
	}

	/**
	 * Share a model with other tabs
	 */
	async shareModel(modelName, modelData) {
		if (!this.isSupported) {
			return;
		}

		// Store in our cache
		this.modelCache.set(modelName, modelData);

		// Announce availability
		this.channel.postMessage({
			type: 'MODEL_AVAILABLE',
			modelName,
			size: modelData.size || modelData.byteLength,
			tabId: this.getTabId()
		});
	}

	/**
	 * Set up message listeners
	 */
	setupListeners() {
		this.channel.addEventListener('message', async (event) => {
			const { type, requestId, modelName, tabId } = event.data;

			// Ignore our own messages
			if (tabId === this.getTabId()) {
				return;
			}

			switch (type) {
				case 'REQUEST_MODEL':
					await this.handleModelRequest(event.data);
					break;

				case 'MODEL_DATA':
					this.handleModelResponse(event.data);
					break;

				case 'MODEL_AVAILABLE':
					console.log(`Tab ${tabId} has model ${modelName} available`);
					break;

				case 'TAB_READY':
					console.log(`New tab ${tabId} joined the network`);
					// Announce our available models
					for (const [name, data] of this.modelCache) {
						this.channel.postMessage({
							type: 'MODEL_AVAILABLE',
							modelName: name,
							size: data.size || data.byteLength,
							tabId: this.getTabId()
						});
					}
					break;
			}
		});
	}

	/**
	 * Handle incoming model request
	 */
	async handleModelRequest({ modelName, requestId, tabId }) {
		// Check if we have this model
		const modelData = await this.getModelFromCache(modelName);

		if (modelData) {
			console.log(`Sharing model ${modelName} with tab ${tabId}`);

			// Convert to transferable format if needed
			let transferData;
			if (modelData instanceof Blob) {
				transferData = await modelData.arrayBuffer();
			} else {
				transferData = modelData;
			}

			// Send the model data
			this.channel.postMessage({
				type: 'MODEL_DATA',
				requestId,
				modelName,
				modelData: transferData,
				tabId: this.getTabId()
			});
		}
	}

	/**
	 * Handle incoming model response
	 */
	handleModelResponse({ requestId, modelData, modelName }) {
		const pending = this.pendingRequests.get(requestId);

		if (pending) {
			clearTimeout(pending.timeoutHandle);
			this.pendingRequests.delete(requestId);

			// Convert ArrayBuffer back to Blob if needed
			const blob = modelData instanceof ArrayBuffer ? new Blob([modelData]) : modelData;

			console.log(`Received model ${modelName} from another tab!`);
			pending.resolve(blob);

			// Cache it for future use
			this.modelCache.set(modelName, blob);
		}
	}

	/**
	 * Get model from local cache or IndexedDB
	 */
	async getModelFromCache(modelName) {
		// Check memory cache first
		if (this.modelCache.has(modelName)) {
			return this.modelCache.get(modelName);
		}

		// Check IndexedDB
		return this.getModelFromIndexedDB(modelName);
	}

	/**
	 * Get model from IndexedDB
	 */
	async getModelFromIndexedDB(modelName) {
		return new Promise((resolve) => {
			const request = indexedDB.open('TalkTypeModels', 1);

			request.onupgradeneeded = (event) => {
				const db = event.target.result;
				if (!db.objectStoreNames.contains('models')) {
					db.createObjectStore('models');
				}
			};

			request.onsuccess = (event) => {
				const db = event.target.result;

				if (!db.objectStoreNames.contains('models')) {
					resolve(null);
					return;
				}

				const transaction = db.transaction(['models'], 'readonly');
				const store = transaction.objectStore('models');
				const getRequest = store.get(modelName);

				getRequest.onsuccess = () => {
					const data = getRequest.result;
					if (data) {
						// Cache in memory for next time
						this.modelCache.set(modelName, data);
						console.log(`Loaded model ${modelName} from IndexedDB`);
					}
					resolve(data || null);
				};

				getRequest.onerror = () => resolve(null);
			};

			request.onerror = () => resolve(null);
		});
	}

	/**
	 * Save model to IndexedDB
	 */
	async saveModelToIndexedDB(modelName, modelData) {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open('TalkTypeModels', 1);

			request.onupgradeneeded = (event) => {
				const db = event.target.result;
				if (!db.objectStoreNames.contains('models')) {
					db.createObjectStore('models');
				}
			};

			request.onsuccess = (event) => {
				const db = event.target.result;
				const transaction = db.transaction(['models'], 'readwrite');
				const store = transaction.objectStore('models');

				store.put(modelData, modelName);

				transaction.oncomplete = () => {
					console.log(`Saved model ${modelName} to IndexedDB`);
					resolve();
				};

				transaction.onerror = () => reject(transaction.error);
			};

			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Get unique tab identifier
	 */
	getTabId() {
		if (!this.tabId) {
			this.tabId = `tab-${Date.now()}-${Math.random().toString(36).substring(7)}`;
		}
		return this.tabId;
	}

	/**
	 * Clean up when tab closes
	 */
	destroy() {
		if (this.channel) {
			this.channel.postMessage({
				type: 'TAB_CLOSING',
				tabId: this.getTabId()
			});
			this.channel.close();
		}
	}

	/**
	 * Get statistics about cached models
	 */
	getStats() {
		const stats = {
			supported: this.isSupported,
			modelsInMemory: this.modelCache.size,
			tabId: this.getTabId()
		};

		// Calculate total size
		let totalSize = 0;
		for (const [name, data] of this.modelCache) {
			totalSize += data.size || data.byteLength || 0;
		}
		stats.totalSizeInMemory = totalSize;

		return stats;
	}
}

// Export singleton instance
export const modelShareService = new ModelShareService();

// Clean up on page unload
if (typeof window !== 'undefined') {
	window.addEventListener('beforeunload', () => {
		modelShareService.destroy();
	});
}
