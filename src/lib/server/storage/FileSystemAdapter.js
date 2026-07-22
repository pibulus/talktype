import fs from 'fs';
import path from 'path';

export class FileSystemAdapter {
	constructor(baseDir) {
		this.baseDir = baseDir;
		if (!fs.existsSync(this.baseDir)) {
			// Owner-only dir so the supporter stores inside aren't traversable by
			// other local users. recursive mode only applies to the leaf dir.
			fs.mkdirSync(this.baseDir, { recursive: true, mode: 0o700 });
		}
	}

	async get(key) {
		try {
			const filePath = path.join(this.baseDir, `${key}.json`);
			if (!fs.existsSync(filePath)) {
				return null;
			}
			const data = fs.readFileSync(filePath, 'utf-8');
			return JSON.parse(data);
		} catch (error) {
			console.error(`[FileSystemAdapter] Error reading ${key}:`, error);
			return null;
		}
	}

	async set(key, value) {
		try {
			const filePath = path.join(this.baseDir, `${key}.json`);
			// 0o600 — license/checkout stores hold supporter metadata (keyed HMAC
			// hashes, payment amounts). Owner-only so another local process or web
			// user on the box can't read them. mode on write only applies at create
			// time, so chmod after to also fix perms on a pre-existing file.
			fs.writeFileSync(filePath, JSON.stringify(value, null, 2), { mode: 0o600 });
			fs.chmodSync(filePath, 0o600);
			return true;
		} catch (error) {
			console.error(`[FileSystemAdapter] Error writing ${key}:`, error);
			return false;
		}
	}
}
