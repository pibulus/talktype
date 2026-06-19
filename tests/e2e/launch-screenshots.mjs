#!/usr/bin/env node
/**
 * Capture launch screenshots of TalkType IN ACTION (the two the launch review
 * flagged as the real blocker): (1) live mode mid-transcription with text
 * appearing, and (2) clean editable output. Drives the LIVE site and injects
 * realistic transcript state via the app's own stores.
 *
 * Run: PW_PATH=$(npm root -g)/playwright/index.mjs node tests/e2e/launch-screenshots.mjs
 * Output: tests/e2e/launch-shots/*.png (mobile + wide for each state)
 */

const pw = await import(process.env.PW_PATH || 'playwright');
const { chromium } = pw;
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const URL = process.env.TT_URL || 'https://talktype.app';
const OUT = resolve(__dirname, 'launch-shots');
mkdirSync(OUT, { recursive: true });

const SAMPLE =
  "Okay so the idea is a voice note app that actually feels good to use. You tap the ghost, you talk, and it just types. Clean editable text, nothing weird. I want it fast and a little bit fun.";

const browser = await chromium.launch({ headless: true });

async function shot(name, { width, height }, state) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 2 // crisp retina captures for launch assets
  });
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60_000 });
  // Let the ghost + first-paint animations settle.
  await page.waitForTimeout(1500);
  // Make sure the full header (TalkType.app) is in frame, not scrolled out.
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});

  // Dismiss any intro modal so the main screen is clean.
  await page
    .evaluate(() => {
      document.querySelectorAll('dialog[open]').forEach((d) => {
        try {
          d.close();
        } catch {}
      });
    })
    .catch(() => {});

  // Inject the requested transcript/recording state via the app's own stores.
  await page
    .evaluate(async ({ text, mode }) => {
      const stores = await import('/src/lib/services/infrastructure/stores.js');
      const { transcriptionState, recordingState, uiState } = stores;
      transcriptionState?.update?.((s) => ({
        ...s,
        text,
        interim: mode === 'live' ? '' : '',
        inProgress: false
      }));
      if (mode === 'live') {
        // mid-recording look: recording active, live text streaming in
        recordingState?.update?.((s) => ({ ...s, isRecording: true }));
      }
      uiState?.update?.((s) => ({ ...s }));
    }, state)
    .catch(() => {});

  await page.waitForTimeout(1200); // let the transcript box render the text
  await page.screenshot({ path: resolve(OUT, name) });
  console.log(`  captured ${name}`);
  await page.close();
}

try {
  // TalkType's recording and finished-output screens render the transcript the
  // same way, so one clean hero set (transcript on screen — the magic moment)
  // serves both. Mobile is the primary launch asset (PWA, IG); wide for OG/PH.
  await shot('hero-mobile.png', { width: 430, height: 932 }, { text: SAMPLE, mode: 'done' });
  await shot('hero-wide.png', { width: 1280, height: 900 }, { text: SAMPLE, mode: 'done' });

  await browser.close();
  console.log(`\n✅ Launch screenshots in ${OUT}`);
} catch (err) {
  await browser.close().catch(() => {});
  console.error(`\n❌ ${err?.message || err}`);
  process.exit(1);
}
