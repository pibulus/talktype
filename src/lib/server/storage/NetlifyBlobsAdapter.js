import { getStore } from '@netlify/blobs';

export class NetlifyBlobsAdapter {
	constructor() {
		// Netlify Blobs store - automatically configured in Netlify environment
		this.store = getStore('talktype-data');
		console.log('📦 [NetlifyBlobsAdapter] Using Netlify Blobs for persistent storage');
	}

	async get(key) {
		try {
			const data = await this.store.get(key, { type: 'json' });
			return data || null;
		} catch (error) {
			console.error(`[NetlifyBlobsAdapter] Error reading ${key}:`, error);
			return null;
		}
	}

	async set(key, value) {
		try {
			await this.store.setJSON(key, value);
			return true;
		} catch (error) {
			console.error(`[NetlifyBlobsAdapter] Error writing ${key}:`, error);
			return false;
		}
	}
}
