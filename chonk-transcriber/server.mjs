#!/usr/bin/env node
// ===================================================================
// TalkType Chonk transcriber
// Zero-dependency HTTP wrapper around transcribe.cpp (ggml) running on
// the home server. POST raw audio -> ffmpeg to 16k mono wav ->
// transcribe-cli -> { text }. See README.md for setup.
// ===================================================================
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

const PORT = Number(process.env.PORT || 7331);
const HOME = process.env.HOME || '/home/pibulus';
const MODEL =
	process.env.MODEL || join(HOME, 'talktype-transcriber/models/parakeet-tdt-0.6b-v3-Q8_0.gguf');
const CLI =
	process.env.TRANSCRIBE_CLI ||
	join(HOME, 'talktype-transcriber/transcribe.cpp/build/bin/transcribe-cli');
const MAX_BYTES = 50 * 1024 * 1024; // mirrors the TalkType upload cap
const JOB_TIMEOUT_MS = 120_000; // a wedged ffmpeg/cli must not jam the queue

/**
 * transcribe-cli is "more or less a drop-in whisper.cpp replacement", so its
 * stdout may carry whisper-style "[00:00:00.000 --> 00:00:02.000] text"
 * segment lines. Strip timestamps if present, pass plain output through.
 */
export function cleanCliOutput(raw) {
	const lines = (raw || '').split('\n');
	const cleaned = lines
		.map((line) => {
			const match = line.match(/^\s*\[[\d:.,]+\s*-->\s*[\d:.,]+\]\s*(.*)$/);
			return match ? match[1] : line;
		})
		.join('\n')
		.replace(/\n{2,}/g, '\n')
		.trim();
	return cleaned;
}

function run(cmd, args) {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
		let stdout = '';
		let stderr = '';
		const killer = setTimeout(() => {
			child.kill('SIGKILL');
			reject(new Error(`${basename(cmd)} timed out after ${JOB_TIMEOUT_MS / 1000}s`));
		}, JOB_TIMEOUT_MS);
		child.stdout.on('data', (d) => (stdout += d));
		child.stderr.on('data', (d) => (stderr += d));
		child.on('error', (err) => {
			clearTimeout(killer);
			reject(err);
		});
		child.on('close', (code) => {
			clearTimeout(killer);
			if (code === 0) resolve({ stdout, stderr });
			else reject(new Error(`${basename(cmd)} exited ${code}: ${stderr.slice(-500)}`));
		});
	});
}

async function transcribe(buffer) {
	const dir = await mkdtemp(join(tmpdir(), 'tt-chonk-'));
	try {
		const input = join(dir, 'input');
		const wav = join(dir, 'audio.wav');
		await writeFile(input, buffer);
		await run('ffmpeg', [
			'-y',
			'-hide_banner',
			'-loglevel',
			'error',
			'-i',
			input,
			'-ar',
			'16000',
			'-ac',
			'1',
			wav
		]);
		const { stdout } = await run(CLI, ['-m', MODEL, wav]);
		return cleanCliOutput(stdout);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

// ponytail: serial job queue + model loaded per request (CLI spawn) — a few
// extra seconds of latency under load. Upgrade path: long-lived process via
// the transcribe.cpp TS bindings if it ever feels slow.
let queue = Promise.resolve();
function enqueue(job) {
	const next = queue.catch(() => {}).then(job);
	queue = next;
	return next;
}

function readBody(req, res) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let size = 0;
		req.on('data', (chunk) => {
			size += chunk.length;
			if (size > MAX_BYTES) {
				res.writeHead(413, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: 'Audio too large' }));
				req.destroy();
				reject(new Error('body too large'));
				return;
			}
			chunks.push(chunk);
		});
		req.on('end', () => resolve(Buffer.concat(chunks)));
		req.on('error', reject);
	});
}

if (process.argv[2] === '--selftest') {
	const assert = (cond, msg) => {
		if (!cond) {
			console.error(`FAIL: ${msg}`);
			process.exit(1);
		}
	};
	assert(cleanCliOutput('plain text out\n') === 'plain text out', 'plain passthrough');
	assert(
		cleanCliOutput(
			'[00:00:00.000 --> 00:00:02.500]   Hello there.\n[00:00:02.500 --> 00:00:04.000]  General Kenobi.'
		) === 'Hello there.\nGeneral Kenobi.',
		'whisper timestamps stripped'
	);
	assert(cleanCliOutput('') === '', 'empty ok');
	console.log('selftest ok');
	process.exit(0);
}

createServer(async (req, res) => {
	res.setHeader('Content-Type', 'application/json');
	if (req.method === 'GET' && req.url === '/health') {
		res.end(JSON.stringify({ ok: true, model: basename(MODEL) }));
		return;
	}
	if (req.method === 'POST' && req.url === '/transcribe') {
		try {
			const buffer = await readBody(req, res);
			if (res.writableEnded) return; // 413 already sent
			if (!buffer.length) {
				res.writeHead(400);
				res.end(JSON.stringify({ error: 'Empty audio body' }));
				return;
			}
			const started = Date.now();
			const text = await enqueue(() => transcribe(buffer));
			console.log(
				`[chonk-transcriber] ${(buffer.length / 1024).toFixed(0)}KB -> ${text.length} chars in ${((Date.now() - started) / 1000).toFixed(1)}s`
			);
			res.end(JSON.stringify({ text }));
		} catch (error) {
			if (res.writableEnded) return;
			console.error('[chonk-transcriber] error:', error.message);
			res.writeHead(500);
			res.end(JSON.stringify({ error: error.message }));
		}
		return;
	}
	res.writeHead(404);
	res.end(JSON.stringify({ error: 'Not found' }));
}).listen(PORT, () => {
	console.log(
		`[chonk-transcriber] listening on :${PORT} | model: ${basename(MODEL)} | cli: ${CLI}`
	);
});
