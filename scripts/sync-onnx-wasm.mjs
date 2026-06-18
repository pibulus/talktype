#!/usr/bin/env node
/**
 * Copies the ONNX-runtime WASM files that @huggingface/transformers v4 bundles
 * into static/onnx/ so they're self-hosted (served same-origin at /onnx/).
 *
 * WHY: v4 bundles a dev build of onnxruntime-web (1.26.0-dev.*) that isn't on any
 * CDN, and its default loader fetches WASM via dynamic blob imports Vite can't
 * serve. We point env.backends.onnx.wasm.wasmPaths at /onnx/ (see whisperService.js)
 * and the Vite `onnxruntime-web-use-extern-wasm` resolve condition makes ort fetch
 * these by URL. Self-hosting also keeps Offline Mode genuinely offline (no CDN).
 *
 * Runs on `npm install` via the `prepare` script, so the WASM always matches the
 * installed v4 version — and we don't commit ~22MB of binaries to git.
 */
import { existsSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// v4 nests its own onnxruntime-web; fall back to a top-level install just in case.
const ORT_DIST_CANDIDATES = [
	join(ROOT, 'node_modules/@huggingface/transformers/node_modules/onnxruntime-web/dist'),
	join(ROOT, 'node_modules/onnxruntime-web/dist')
];

// asyncify pair → the WASM device (tiny baseline, all devices).
// jsep pair → the WebGPU device (distil-small on capable desktops, WS6).
const FILES = [
	'ort-wasm-simd-threaded.asyncify.wasm',
	'ort-wasm-simd-threaded.asyncify.mjs',
	'ort-wasm-simd-threaded.jsep.wasm',
	'ort-wasm-simd-threaded.jsep.mjs'
];

const srcDir = ORT_DIST_CANDIDATES.find((d) => existsSync(d));
if (!srcDir) {
	console.warn(
		'[sync-onnx-wasm] onnxruntime-web dist not found — skipping (offline Whisper unavailable until deps install).'
	);
	process.exit(0);
}

const destDir = join(ROOT, 'static/onnx');
mkdirSync(destDir, { recursive: true });

let copied = 0;
for (const file of FILES) {
	const src = join(srcDir, file);
	if (!existsSync(src)) {
		console.warn(`[sync-onnx-wasm] missing ${file} in ${srcDir} — skipping`);
		continue;
	}
	const dest = join(destDir, file);
	// Skip if already present and same size (cheap idempotency).
	if (existsSync(dest) && statSync(dest).size === statSync(src).size) continue;
	copyFileSync(src, dest);
	copied++;
}

console.log(
	`[sync-onnx-wasm] ${copied ? `synced ${copied} file(s) to static/onnx/` : 'static/onnx/ already up to date'}`
);
