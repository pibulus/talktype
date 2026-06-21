import { describe, expect, it } from 'vitest';
import { configureTransformersEnv } from './whisperService.js';

describe('WhisperService environment configuration (v4)', () => {
	it('enables remote models + browser cache and forces single-threaded WASM', () => {
		const env = {
			allowRemoteModels: false,
			allowLocalModels: true,
			useBrowserCache: false,
			backends: {
				onnx: {
					wasm: {
						numThreads: 4,
						proxy: true
					},
					webgpu: {}
				}
			}
		};

		configureTransformersEnv(env);

		// v4 self-resolves its ONNX-runtime WASM from a versioned CDN; we no longer
		// hand-wire a wasmPaths file map (the v4 ort .wasm filenames changed).
		expect(env.allowRemoteModels).toBe(true);
		expect(env.allowLocalModels).toBe(false);
		expect(env.useBrowserCache).toBe(true);
		// Single-threaded for cross-browser stability (esp. iOS Safari).
		expect(env.backends.onnx.wasm.numThreads).toBe(1);
		// Self-hosted ort WASM (object with .wasm/.mjs keys is required by
		// transformers.js 4.x ensureWasmLoaded; a string base path skips the WASM cache).
		expect(env.backends.onnx.wasm.wasmPaths).toEqual({
			wasm: '/onnx/ort-wasm-simd-threaded.asyncify.wasm',
			mjs: '/onnx/ort-wasm-simd-threaded.asyncify.mjs'
		});
		// Other backends untouched.
		expect(env.backends.onnx.webgpu).toEqual({});
	});

	it('is a no-op on a second call (module-level guard)', () => {
		// configureTransformersEnv ran once above; a second call must not throw
		// and must leave a fresh env object untouched (already-configured guard).
		const env = { backends: { onnx: { wasm: { numThreads: 4 } } } };
		expect(() => configureTransformersEnv(env)).not.toThrow();
		expect(env.backends.onnx.wasm.numThreads).toBe(4);
	});
});
