#!/usr/bin/env node
/**
 * WS6 gate: requesting the WebGPU 'small' model either (a) loads on WebGPU and
 * transcribes, or (b) when no usable WebGPU adapter exists, falls back to the
 * tiny+WASM baseline and STILL transcribes. Offline Mode must never hard-fail.
 *
 * Headless Chromium usually lacks a real WebGPU adapter, so this primarily
 * exercises the fallback path — exactly the production risk we care about.
 *
 * Run:  PW_PATH=$(npm root -g)/playwright/index.mjs node tests/e2e/webgpu-fallback.mjs
 */

const pw = await import(process.env.PW_PATH || 'playwright');
const { chromium } = pw;
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_URL = process.env.TT_APP_URL || 'http://localhost:5173';
const FIXTURE = resolve(__dirname, 'fixtures/spoken-phrase.wav');
const EXPECT_WORDS = ['quick', 'fox', 'lazy'];
const BUDGET_MS = 5 * 60 * 1000;

const fail = (m) => {
	console.error(`\n❌ FAIL: ${m}\n`);
	process.exit(1);
};
const pass = (m) => {
	console.log(`\n✅ PASS: ${m}\n`);
	process.exit(0);
};

const wavBase64 = readFileSync(FIXTURE).toString('base64');
// Try to enable WebGPU in headless; many CI/headless envs still won't expose an
// adapter (or expose a SwiftShader software one, which the app now rejects).
// TT_HEADED=1 launches a visible browser with the machine's REAL GPU — the only
// way to exercise the actual WebGPU load path locally.
const browser = await chromium.launch({
	headless: !process.env.TT_HEADED,
	args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan']
});
const page = await browser.newPage();
page.on('console', (m) => {
	const t = m.text();
	if (/WebGPU|fallback|Whisper.*ready|Model ready/i.test(t)) console.log(`  [page] ${t}`);
});

try {
	await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await page.waitForFunction(() => !!globalThis.__ttWhisper, null, { timeout: 30_000 });

	const result = await page.evaluate(
		async ({ wavB64, budget }) => {
			// Force the WebGPU 'small' model selection.
			const { userPreferences } = await import('/src/lib/services/infrastructure/stores.js');
			userPreferences.update((p) => ({
				...p,
				whisperModel: 'small',
				modelManuallySelected: true
			}));

			const { status: whisperStatus } = globalThis.__ttWhisper;

			// Decode fixture → 16k mono Float32.
			const bin = atob(wavB64);
			const bytes = new Uint8Array(bin.length);
			for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
			const ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
				1,
				16000 * 6,
				16000
			);
			const decoded = await ctx.decodeAudioData(bytes.buffer.slice(0));
			const src = ctx.createBufferSource();
			src.buffer = decoded;
			src.connect(ctx.destination);
			src.start();
			const float = (await ctx.startRendering()).getChannelData(0).slice();

			const text = await Promise.race([
				globalThis.__ttWhisper.transcribe(float),
				new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), budget))
			]);

			// What model actually ended up loaded (fallback may have switched to tiny)?
			let finalModel = 'unknown';
			const unsub = whisperStatus.subscribe((s) => (finalModel = s.selectedModel));
			unsub();

			return { text, finalModel };
		},
		{ wavB64: wavBase64, budget: BUDGET_MS }
	);

	console.log(`→ finalModel=${result.finalModel}, transcript="${result.text}"`);

	const lower = (result.text || '').toLowerCase();
	const hits = EXPECT_WORDS.filter((w) => lower.includes(w));
	if (hits.length < 2) fail(`transcript missing words — got "${result.text}"`);

	await browser.close();
	pass(
		`WebGPU 'small' request resolved to '${result.finalModel}' and transcribed (matched [${hits.join(', ')}]). Fallback path is safe.`
	);
} catch (err) {
	await browser.close().catch(() => {});
	fail(err?.message || String(err));
}
