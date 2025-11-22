import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine a suitable temporary directory for the rate limit store
// This could be enhanced to use a more robust temporary directory management
// For now, it will be in a '.tmp' directory relative to the current file.
const tempDir = path.join(__dirname, '.tmp');
const storeFilePath = path.join(tempDir, 'rate_limit_store.json');

let store = {};

// Ensure the temporary directory exists
async function ensureTempDir() {
    if (!existsSync(tempDir)) {
        await fs.mkdir(tempDir, { recursive: true });
    }
}

// Load the store from file
async function loadStore() {
    await ensureTempDir();
    if (existsSync(storeFilePath)) {
        const data = await fs.readFile(storeFilePath, 'utf8');
        store = JSON.parse(data);
    }
}

// Save the store to file
async function saveStore() {
    await ensureTempDir();
    await fs.writeFile(storeFilePath, JSON.stringify(store, null, 2), 'utf8');
}

// Initialize the store
// This is called once when the module is loaded
loadStore().catch(console.error);

export async function get(key) {
    await loadStore(); // Ensure the latest state is loaded before getting
    return store[key];
}

export async function set(key, value) {
    store[key] = value;
    await saveStore(); // Save state after setting
}

export async function clearExpired(ttl) {
    await loadStore();
    const now = Date.now();
    let changed = false;
    for (const key in store) {
        if (store[key].windowStart + ttl < now) {
            delete store[key];
            changed = true;
        }
    }
    if (changed) {
        await saveStore();
    }
}

// Periodically clean up expired entries
// This can be replaced by a more sophisticated cleanup mechanism
setInterval(() => clearExpired(3600 * 1000), 30 * 60 * 1000); // Clean up every 30 minutes for entries older than 1 hour
