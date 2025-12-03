import { dev, building } from '$app/environment';
import path from 'path';
import { FileSystemAdapter } from './FileSystemAdapter.js';
import { NetlifyBlobsAdapter } from './NetlifyBlobsAdapter.js';

// Factory to get the appropriate storage adapter
function createStorage() {
	if (dev || building) {
		const dataDir = path.join(process.cwd(), 'src/lib/server/data');
		console.log(`📂 [Storage] Using FileSystemAdapter (${dev ? 'Dev' : 'Build'})`);
		return new FileSystemAdapter(dataDir);
	} else {
		// Production: Use Netlify Blobs for persistent storage
		console.log('📦 [Storage] Using NetlifyBlobsAdapter (Production)');
		return new NetlifyBlobsAdapter();
	}
}

export const storage = createStorage();
