const store = new Map();

// Hard ceiling so a flood of unique client keys (e.g. spoofed forwarding
// headers) cannot grow this in-process Map without bound on the Pi.
const MAX_ENTRIES = 10_000;

export async function get(key) {
	return store.get(key);
}

export async function set(key, value) {
	if (!store.has(key) && store.size >= MAX_ENTRIES) {
		const oldestKey = store.keys().next().value;
		store.delete(oldestKey);
	}
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
