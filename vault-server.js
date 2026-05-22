import fastify from 'fastify';
import fs from 'fs/promises';
import path from 'path';

// "The Vault" - A private, encrypted drop-zone for TalkType histories.
// Simple, lean, and runs on your own hardware.

const app = fastify({ logger: true });

// Ensure vaults directory exists
const VAULT_DIR = path.join(process.cwd(), 'vaults');
await fs.mkdir(VAULT_DIR, { recursive: true });

// Health check
app.get('/health', async () => ({ status: 'ok', vault: 'alive' }));

// POST: Upload encrypted vault blob
// Client provides the app name and vault_hash in the URL
app.post('/vault/:appName/:hash', async (request, reply) => {
	const { appName, hash } = request.params;
	const { data } = request.body; // Expecting { data: '...' }

	if (!data) {
		return reply.status(400).send({ error: 'Missing vault data' });
	}

	// Basic validation: ensure names are alphanumeric
	if (!/^[a-zA-Z0-9]+$/.test(appName) || !/^[a-zA-Z0-9]+$/.test(hash)) {
		return reply.status(400).send({ error: 'Invalid path parameters' });
	}

	const dir = path.join(VAULT_DIR, appName);
	await fs.mkdir(dir, { recursive: true });
	await fs.writeFile(path.join(dir, `${hash}.enc`), data);
	return { status: 'ok' };
});

// GET: Download encrypted vault blob
app.get('/vault/:appName/:hash', async (request, reply) => {
	const { appName, hash } = request.params;

	if (!/^[a-zA-Z0-9]+$/.test(appName) || !/^[a-zA-Z0-9]+$/.test(hash)) {
		return reply.status(400).send({ error: 'Invalid path parameters' });
	}

	try {
		const file = await fs.readFile(path.join(VAULT_DIR, appName, `${hash}.enc`), 'utf8');
		return { data: file };
	} catch (err) {
		return reply.status(404).send({ error: 'Vault not found' });
	}
});

const port = process.env.PORT || 3000;
await app.listen({ port: port, host: '0.0.0.0' });

console.log(`Vault Drop-zone alive on port ${port} 🎸`);
