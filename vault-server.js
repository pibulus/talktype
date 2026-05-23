import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const PORT = Number(process.env.PORT || 3000);
const MAX_BODY_BYTES = Number(process.env.MAX_VAULT_BLOB_BYTES || 50 * 1024 * 1024);
const VAULT_DIR = path.resolve(process.env.VAULT_DIR || path.join(process.cwd(), 'vaults'));
const APP_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/i;
const HASH_PATTERN = /^[a-f0-9]{64}$/;

await fs.mkdir(VAULT_DIR, { recursive: true });

function sendJson(response, status, payload) {
	response.writeHead(status, { 'Content-Type': 'application/json' });
	response.end(JSON.stringify(payload));
}

function applyCors(request, response) {
	const allowedOrigin = process.env.VAULT_ALLOWED_ORIGIN;
	const requestOrigin = request.headers.origin;
	if (!allowedOrigin || !requestOrigin) return;

	const allowedOrigins = allowedOrigin.split(',').map((origin) => origin.trim());
	if (allowedOrigin === '*' || allowedOrigins.includes(requestOrigin)) {
		response.setHeader('Access-Control-Allow-Origin', allowedOrigin === '*' ? '*' : requestOrigin);
		response.setHeader('Vary', 'Origin');
		response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
	}
}

function parseVaultPath(requestUrl) {
	const url = new URL(requestUrl, 'http://vault.local');
	const [root, appName, hash] = url.pathname.split('/').filter(Boolean);

	if (root !== 'vault' || !appName || !hash) return null;
	if (!APP_NAME_PATTERN.test(appName) || !HASH_PATTERN.test(hash)) {
		const error = new Error('Invalid path parameters');
		error.statusCode = 400;
		throw error;
	}

	return { appName, hash };
}

async function readJsonBody(request) {
	const chunks = [];
	let size = 0;

	for await (const chunk of request) {
		size += chunk.length;
		if (size > MAX_BODY_BYTES) {
			const error = new Error('Vault data is too large');
			error.statusCode = 413;
			throw error;
		}
		chunks.push(chunk);
	}

	try {
		return JSON.parse(Buffer.concat(chunks).toString('utf8'));
	} catch {
		const error = new Error('Invalid JSON body');
		error.statusCode = 400;
		throw error;
	}
}

function getVaultFile(appName, hash) {
	const appDir = path.join(VAULT_DIR, appName);
	return {
		appDir,
		filePath: path.join(appDir, `${hash}.enc`)
	};
}

async function saveVaultBlob(appName, hash, data) {
	if (typeof data !== 'string' || data.length === 0) {
		const error = new Error('Missing vault data');
		error.statusCode = 400;
		throw error;
	}

	const { appDir, filePath } = getVaultFile(appName, hash);
	await fs.mkdir(appDir, { recursive: true });

	const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
	await fs.writeFile(tempPath, data, { mode: 0o600 });
	await fs.rename(tempPath, filePath);
}

async function getStorageHealth() {
	const storage = {
		dir: VAULT_DIR,
		maxBlobBytes: MAX_BODY_BYTES
	};

	if (typeof fs.statfs !== 'function') {
		return storage;
	}

	try {
		const stats = await fs.statfs(VAULT_DIR);
		const totalBytes = stats.blocks * stats.bsize;
		const freeBytes = stats.bfree * stats.bsize;
		const availableBytes = stats.bavail * stats.bsize;

		return {
			...storage,
			totalBytes,
			freeBytes,
			availableBytes,
			usedBytes: totalBytes - freeBytes,
			freeRatio: totalBytes > 0 ? freeBytes / totalBytes : null
		};
	} catch (error) {
		return {
			...storage,
			error: error.message
		};
	}
}

const server = createServer(async (request, response) => {
	applyCors(request, response);

	if (request.method === 'OPTIONS') {
		response.writeHead(204);
		response.end();
		return;
	}

	if (request.method === 'GET' && request.url === '/health') {
		sendJson(response, 200, {
			status: 'ok',
			vault: 'alive',
			storage: await getStorageHealth()
		});
		return;
	}

	try {
		const params = parseVaultPath(request.url);
		if (!params) {
			sendJson(response, 404, { error: 'Not found' });
			return;
		}

		const { appName, hash } = params;

		if (request.method === 'POST') {
			const { data } = await readJsonBody(request);
			await saveVaultBlob(appName, hash, data);
			sendJson(response, 200, { status: 'ok' });
			return;
		}

		if (request.method === 'GET') {
			const { filePath } = getVaultFile(appName, hash);
			const data = await fs.readFile(filePath, 'utf8');
			sendJson(response, 200, { data });
			return;
		}

		sendJson(response, 405, { error: 'Method not allowed' });
	} catch (error) {
		if (error.code === 'ENOENT') {
			sendJson(response, 404, { error: 'Vault not found' });
			return;
		}

		sendJson(response, error.statusCode || 500, {
			error: error.statusCode ? error.message : 'Vault server error'
		});
	}
});

server.listen(PORT, '0.0.0.0', () => {
	console.log(`Vault drop-zone alive on port ${PORT}`);
});
