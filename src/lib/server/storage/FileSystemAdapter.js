import fs from 'fs';
import path from 'path';

export class FileSystemAdapter {
	constructor(baseDir) {
		this.baseDir = baseDir;
		if (!fs.existsSync(this.baseDir)) {
			fs.mkdirSync(this.baseDir, { recursive: true });
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
			fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
			return true;
		} catch (error) {
			console.error(`[FileSystemAdapter] Error writing ${key}:`, error);
			return false;
		}
	}
}
