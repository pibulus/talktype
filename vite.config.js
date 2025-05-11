import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 51732, // runs with localhost:51732
		host: true, // allows access from other devices on the network
		strictPort: true // exits if port is already taken (no fallback)
	}
});
