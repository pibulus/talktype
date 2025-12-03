import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
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
});
