#!/usr/bin/env node
/**
 * Offline Whisper regression gate (standalone Playwright, uses GLOBAL install).
 *
 * Loads the real dev app, decodes a known speech clip, drives the actual
 * whisperService model-load + transcribe path via the dev-only window seam
 * (__ttWhisper), and asserts a non-empty transcript with recognizable words.
 *
 * This is the safety net for the @xenova → @huggingface/transformers migration:
 * GREEN before changes + GREEN after = offline transcription didn't regress.
 *
 * Run:  node tests/e2e/offline-whisper.mjs
 * Needs: dev server on http://localhost:5173, global `playwright`.
 */

// Playwright is installed GLOBALLY (not a project dep). ESM ignores NODE_PATH for
// bare specifiers, so resolve the global package path explicitly via PW_PATH.
const pw = await import(process.env.PW_PATH || 'playwright');
const { chromium } = pw;
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_URL = process.env.TT_APP_URL || 'http://localhost:5173';
const FIXTURE = resolve(__dirname, 'fixtures/spoken-phrase.wav');
// "the quick brown fox jumps over the lazy dog" — assert a couple distinctive words
const EXPECT_WORDS = ['quick', 'fox', 'lazy'];
const MODEL_LOAD_BUDGET_MS = 5 * 60 * 1000;

function fail(msg) {
	console.error(`\n❌ FAIL: ${msg}\n`);
	process.exit(1);
}
function pass(msg) {
	console.log(`\n✅ PASS: ${msg}\n`);
	process.exit(0);
}

const wavBase64 = readFileSync(FIXTURE).toString('base64');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', (m) => {
	const t = m.text();
	if (/Whisper|Deepgram|error|transcrib/i.test(t)) console.log(`  [page] ${t}`);
});

try {
	console.log(`→ loading ${APP_URL}`);
	await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });

	// Wait for the dev-only whisper seam to attach.
	await page.waitForFunction(() => !!globalThis.__ttWhisper, null, { timeout: 30_000 });
	console.log('→ __ttWhisper seam present');

	// Force the tiny model preference (baseline path), then run real transcribe.
	const result = await page.evaluate(
		async ({ wavB64, budget }) => {
			// localStorage pref the registry reads for model selection
			try {
				const raw = localStorage.getItem('userPreferences');
				const prefs = raw ? JSON.parse(raw) : {};
				prefs.whisperModel = 'tiny';
				prefs.modelManuallySelected = true;
				localStorage.setItem('userPreferences', JSON.stringify(prefs));
			} catch {
				// best-effort: pref defaults to tiny anyway
			}

			// Decode base64 WAV → AudioBuffer → Float32Array @ the clip's own rate,
			// then resample to 16kHz mono (what whisperService expects).
			const bin = atob(wavB64);
			const bytes = new Uint8Array(bin.length);
			for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

			const ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
				1,
				16000 * 6,
				16000
			);
			const decoded = await ctx.decodeAudioData(bytes.buffer.slice(0));
			// Render through offline ctx to force 16k mono
			const src = ctx.createBufferSource();
			src.buffer = decoded;
			src.connect(ctx.destination);
			src.start();
			const rendered = await ctx.startRendering();
			const float = rendered.getChannelData(0).slice();

			const started = performance.now();
			const text = await Promise.race([
				globalThis.__ttWhisper.transcribe(float),
				new Promise((_, rej) => setTimeout(() => rej(new Error('transcribe timeout')), budget))
			]);
			return { text, ms: Math.round(performance.now() - started) };
		},
		{ wavB64: wavBase64, budget: MODEL_LOAD_BUDGET_MS }
	);

	console.log(`→ transcript (${result.ms}ms): "${result.text}"`);

	const lower = (result.text || '').toLowerCase();
	if (!lower.trim()) fail('empty transcript');

	const hits = EXPECT_WORDS.filter((w) => lower.includes(w));
	if (hits.length < 2) {
		fail(`transcript missing expected words. got "${result.text}", matched [${hits.join(', ')}]`);
	}

	await browser.close();
	pass(`offline transcribe works — matched [${hits.join(', ')}] in "${result.text.trim()}"`);
} catch (err) {
	await browser.close().catch(() => {});
	fail(err?.message || String(err));
}
