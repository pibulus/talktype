import { dev } from '$app/environment';
import path from 'path';
import { FileSystemAdapter } from './FileSystemAdapter.js';
import { MemoryAdapter } from './MemoryAdapter.js';

// Factory to get the appropriate storage adapter
function createStorage() {
	if (dev) {
		const dataDir = path.join(process.cwd(), 'src/lib/server/data');
		console.log('📂 [Storage] Using FileSystemAdapter (Dev)');
		return new FileSystemAdapter(dataDir);
	} else {
		// TODO: Replace with persistent storage (Redis, Blob, DB) for production
		console.log('🧠 [Storage] Using MemoryAdapter (Prod - Ephemeral)');
		return new MemoryAdapter();
	}
}

export const storage = createStorage();
