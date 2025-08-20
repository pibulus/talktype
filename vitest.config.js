import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
	plugins: [svelte({ hot: !process.env.VITEST })],
	test: {
		environment: 'happy-dom',
		setupFiles: ['./src/test-setup.js'],
		include: ['src/**/*.{test,spec}.{js,ts}'],
		globals: true
	},
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib'),
			$app: path.resolve('./src/app')
		}
	}
});