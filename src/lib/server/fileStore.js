const store = new Map();

export async function get(key) {
	return store.get(key);
}

export async function set(key, value) {
	store.set(key, value);
}

export async function clearExpired(ttl) {
	const now = Date.now();
	for (const [key, entry] of store.entries()) {
		if (entry.windowStart + ttl < now) {
			store.delete(key);
		}
	}
}
