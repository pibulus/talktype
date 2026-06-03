import { sveltekit } from '@sveltejs/kit/vite';
import { createRequire } from 'node:module';
import path from 'node:path';
import { defineConfig } from 'vite';

const require = createRequire(import.meta.url);
const transformersPackageDir = path.dirname(require.resolve('@xenova/transformers/package.json'));
const onnxWasmEntry = require.resolve('onnxruntime-web/dist/ort.wasm.min.js', {
	paths: [transformersPackageDir]
});

export default defineConfig(({ command }) => {
	if (command === 'build' && process.env.PUBLIC_FORCE_SUPPORTER_MODE === 'true') {
		throw new Error('PUBLIC_FORCE_SUPPORTER_MODE=true is not allowed in production builds.');
	}

	return {
		envPrefix: 'PUBLIC_',
		plugins: [sveltekit()],
		resolve: {
			alias: [{ find: /^onnxruntime-web$/, replacement: onnxWasmEntry }]
		},
		server: {
			port: 5173, // Vite default - avoids macOS ControlCenter on 5000
			host: true, // allows access from other devices on the network
			strictPort: true // exits if port is already taken (no fallback)
		},
		optimizeDeps: {
			exclude: ['@google/generative-ai'] // Never bundle AI package client-side
		},
		ssr: {
			noExternal: process.env.NODE_ENV === 'production' ? ['@google/generative-ai'] : [],
			external: ['@xenova/transformers'] // Exclude from SSR - browser-only transcription
		}
	};
});
