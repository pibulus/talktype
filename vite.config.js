import { sveltekit } from '@sveltejs/kit/vite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Redirect @huggingface/transformers v4's `onnxruntime-web/webgpu` import to the
 * EXTERN-WASM build (ort.webgpu.min.mjs) instead of the default bundled build
 * (ort.webgpu.bundle.min.mjs). The bundled build inlines its WASM glue via
 * dynamic blob imports Vite can't serve ("no available backend found / Failed to
 * fetch ... blob:"); the extern-wasm build fetches WASM from a real URL
 * (env.backends.onnx.wasm.wasmPaths → /onnx/, served from static/onnx).
 * Implemented as a narrow resolveId rewrite (client builds only) so it never
 * touches global/SSR resolve.conditions — which clobbers SvelteKit's own server
 * build ("An impossible situation occurred").
 */
function ortExternWasmPlugin() {
	let externWasmPath = null;
	return {
		name: 'tt-ort-extern-wasm',
		enforce: 'pre',
		resolveId(source, _importer, options) {
			if (source !== 'onnxruntime-web/webgpu') return null;
			if (options?.ssr) return null; // leave SSR resolution untouched
			if (!externWasmPath) {
				// Absolute filesystem path — the nested ort dist isn't exposed via the
				// transformers package `exports`, so require.resolve can't reach it.
				externWasmPath = join(
					__dirname,
					'node_modules/@huggingface/transformers/node_modules/onnxruntime-web/dist/ort.webgpu.min.mjs'
				);
			}
			return externWasmPath;
		}
	};
}

export default defineConfig(({ command }) => {
	if (command === 'build' && process.env.PUBLIC_FORCE_SUPPORTER_MODE === 'true') {
		throw new Error('PUBLIC_FORCE_SUPPORTER_MODE=true is not allowed in production builds.');
	}

	return {
		envPrefix: 'PUBLIC_',
		plugins: [
			// Force @huggingface/transformers v4 to use the EXTERN-WASM onnxruntime
			// build. By default it imports `onnxruntime-web/webgpu` → the *bundled*
			// build (ort.webgpu.bundle.min.mjs) which inlines WASM glue via dynamic
			// blob imports Vite can't serve ("no available backend found / Failed to
			// fetch ... blob:"). We rewrite that specifier to the extern-wasm .mjs
			// build, which fetches WASM by URL (env.backends.onnx.wasm.wasmPaths →
			// /onnx/). Doing it as a narrow id-rewrite avoids touching global/SSR
			// resolve.conditions, which clobbers SvelteKit's own server build.
			ortExternWasmPlugin(),
			sveltekit()
		],
		server: {
			port: 5173, // Vite default - avoids macOS ControlCenter on 5000
			host: true, // allows access from other devices on the network
			strictPort: true, // exits if port is already taken (no fallback)
			// Allow cloudflared quick tunnels (*.trycloudflare.com) so Square can
			// webhook into local dev during payment testing. Dev-only.
			allowedHosts: ['.trycloudflare.com']
		},
		optimizeDeps: {
			// Never bundle AI package client-side. Exclude @huggingface/transformers
			// too: its onnxruntime-web backend uses dynamic blob imports for the WASM
			// runtime that Vite's dep pre-bundler mangles ("no available backend
			// found / Failed to fetch dynamically imported module: blob:").
			exclude: ['@google/generative-ai', '@huggingface/transformers']
		},
		ssr: {
			noExternal: process.env.NODE_ENV === 'production' ? ['@google/generative-ai'] : [],
			external: ['@huggingface/transformers'] // Exclude from SSR - browser-only transcription
		}
	};
});
