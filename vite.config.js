import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5173, // Vite default - avoids macOS ControlCenter on 5000
		host: true, // allows access from other devices on the network
		strictPort: true, // exits if port is already taken (no fallback)
		// Enable SharedArrayBuffer and multi-threading for Whisper WASM
		// These headers enable 4-8x faster transcription via parallel processing
		headers: {
			'Cross-Origin-Embedder-Policy': 'require-corp',
			'Cross-Origin-Opener-Policy': 'same-origin'
		}
	},
	optimizeDeps: {
		exclude: ['@google/generative-ai', 'sharp'] // Never bundle AI package client-side, exclude sharp
	},
	resolve: {
		alias: {
			// Use stubbed sharp for browser builds (transformers.js v3 added sharp for image processing)
			sharp: process.env.NODE_ENV === 'production' ? './stubs/sharp/index.js' : './stubs/sharp/index.js'
		}
	},
	ssr: {
		noExternal: process.env.NODE_ENV === 'production' ? ['@google/generative-ai'] : [],
		external: ['sharp'] // Don't try to bundle sharp in SSR
	}
});
