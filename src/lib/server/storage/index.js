import { dev, building } from '$app/environment';
import { env } from '$env/dynamic/private';
import path from 'path';
import { FileSystemAdapter } from './FileSystemAdapter.js';
import { MemoryAdapter } from './MemoryAdapter.js';
import { NetlifyBlobsAdapter } from './NetlifyBlobsAdapter.js';

// Factory to get the appropriate storage adapter
function createStorage() {
	const requestedAdapter = env.TALKTYPE_STORAGE_ADAPTER?.trim();

	if (requestedAdapter === 'memory') {
		return new MemoryAdapter();
	}

	if (requestedAdapter === 'netlify-blobs' || (!dev && !building && env.NETLIFY === 'true')) {
		console.log('📦 [Storage] Using NetlifyBlobsAdapter (Production)');
		return new NetlifyBlobsAdapter();
	}

	const dataDir =
		env.TALKTYPE_DATA_DIR?.trim() ||
		path.join(process.cwd(), dev || building ? 'src/lib/server/data' : 'data');
	console.log(`📂 [Storage] Using FileSystemAdapter (${dataDir})`);
	return new FileSystemAdapter(dataDir);
}

export const storage = createStorage();
