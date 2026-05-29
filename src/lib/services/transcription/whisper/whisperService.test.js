import { describe, expect, it } from 'vitest';
import { configureTransformersEnv } from './whisperService.js';

describe('WhisperService environment configuration', () => {
	it('self-hosts ONNX WASM and avoids threaded worker runtime loading', () => {
		const env = {
			allowRemoteModels: false,
			allowLocalModels: true,
			useBrowserCache: false,
			backends: {
				onnx: {
					wasm: {
						wasmPaths: 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/',
						numThreads: 4,
						proxy: true
					},
					webgpu: {}
				}
			}
		};

		configureTransformersEnv(env);

		expect(env.allowRemoteModels).toBe(true);
		expect(env.allowLocalModels).toBe(false);
		expect(env.useBrowserCache).toBe(true);
		expect(env.backends.onnx.wasm.wasmPaths).toMatchObject({
			'ort-wasm-simd-threaded.wasm': expect.stringContaining('ort-wasm-simd-threaded'),
			'ort-wasm-threaded.wasm': expect.stringContaining('ort-wasm-threaded'),
			'ort-wasm-simd.wasm': expect.stringContaining('ort-wasm-simd'),
			'ort-wasm.wasm': expect.stringContaining('ort-wasm')
		});
		for (const wasmPath of Object.values(env.backends.onnx.wasm.wasmPaths)) {
			expect(wasmPath).not.toContain('cdn.jsdelivr.net');
		}
		expect(env.backends.onnx.wasm.numThreads).toBe(1);
		expect(env.backends.onnx.wasm.proxy).toBe(false);
		expect(env.backends.onnx.wasm.simd).toBe(true);
		expect(env.backends.onnx.webgpu).toEqual({});
	});
});
