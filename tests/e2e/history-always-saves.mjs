#!/usr/bin/env node
/**
 * WS1 regression gate: transcripts ALWAYS save to local history, free or supporter,
 * offline or cloud — and the free tier is trimmed to the most recent N.
 *
 * Drives the real transcriptStorage in a real browser (real IndexedDB), with
 * isSupporter=false, asserting:
 *   1) a whisper-method transcript persists even for a non-supporter
 *   2) saving more than FREE_HISTORY_LIMIT trims to the cap (oldest dropped)
 *
 * Run:  PW_PATH=$(npm root -g)/playwright/index.mjs node tests/e2e/history-always-saves.mjs
 * Needs: dev server on http://localhost:5173, global playwright.
 */

const pw = await import(process.env.PW_PATH || 'playwright');
const { chromium } = pw;

const APP_URL = process.env.TT_APP_URL || 'http://localhost:5173';
const FREE_LIMIT = 15; // must match HISTORY.FREE_HISTORY_LIMIT

function fail(m) {
	console.error(`\n❌ FAIL: ${m}\n`);
	process.exit(1);
}
function pass(m) {
	console.log(`\n✅ PASS: ${m}\n`);
	process.exit(0);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('console', (m) => {
	if (/error|fail/i.test(m.text())) console.log(`  [page] ${m.text()}`);
});

try {
	await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });

	// Import the real storage module + stores from the app's module graph.
	const result = await page.evaluate(
		async ({ freeLimit }) => {
			// Force non-supporter.
			const { userPreferences } = await import('/src/lib/services/infrastructure/stores.js');
			userPreferences.update((p) => ({ ...p, isSupporter: false }));

			const storage = await import('/src/lib/services/storage/transcriptStorage.js');
			const { saveTranscript, loadAllTranscripts, transcriptHistory, clearAllTranscripts } =
				storage;

			// Clean slate
			if (typeof clearAllTranscripts === 'function') {
				await clearAllTranscripts();
			}

			// 1) a single offline (whisper) transcript persists for a non-supporter
			await saveTranscript({ text: 'offline non supporter one', method: 'whisper' });
			let all = await loadAllTranscripts();
			const savedOffline = all.some(
				(t) => t.text?.includes('offline non supporter one') && t.method === 'whisper'
			);

			// 2) saving more than the free limit trims to the cap
			for (let i = 0; i < freeLimit + 6; i++) {
				await saveTranscript({ text: `bulk ${i}`, method: 'whisper' });
			}
			all = await loadAllTranscripts();
			const count = all.length;
			// newest should be present, oldest 'bulk 0' should be trimmed out
			const hasNewest = all.some((t) => t.text === `bulk ${freeLimit + 5}`);
			const oldestGone = !all.some((t) => t.text === 'bulk 0');

			let storeLen = 0;
			const unsub = transcriptHistory.subscribe((v) => (storeLen = v.length));
			unsub();

			return { savedOffline, count, hasNewest, oldestGone, storeLen };
		},
		{ freeLimit: FREE_LIMIT }
	);

	console.log('→ result:', JSON.stringify(result));

	if (!result.savedOffline) fail('offline transcript was NOT saved for a non-supporter (WS1 core guarantee)');
	if (result.count > FREE_LIMIT) fail(`free tier not trimmed: ${result.count} > ${FREE_LIMIT}`);
	if (!result.hasNewest) fail('newest transcript missing after trim');
	if (!result.oldestGone) fail('oldest transcript should have been trimmed');

	await browser.close();
	pass(
		`offline saves for free users + trimmed to ${result.count}/${FREE_LIMIT} (newest kept, oldest dropped)`
	);
} catch (err) {
	await browser.close().catch(() => {});
	fail(err?.message || String(err));
}
