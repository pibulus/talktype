import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		environment: 'happy-dom',
		setupFiles: ['./src/test-setup.js'],
		include: ['src/**/*.{test,spec}.{js,ts}'],
		globals: true
	}
});