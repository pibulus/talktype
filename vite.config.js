import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 50001, // runs with localhost:50001
		host: true, // allows access from other devices on the network
		strictPort: true // exits if port is already taken (no fallback)
	},
	optimizeDeps: {
		exclude: ['@google/generative-ai'] // Never bundle AI package client-side
	},
	ssr: {
		noExternal: process.env.NODE_ENV === 'production' ? ['@google/generative-ai'] : []
	}
});
