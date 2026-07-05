import prettier from 'eslint-config-prettier';
import js from '@eslint/js';
import { includeIgnoreFile } from '@eslint/compat';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

/** @type {import('eslint').Linter.Config[]} */
export default [
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		// Catches temporal-dead-zone bugs (reading a let/const before its
		// declaration) that only explode at runtime. Scoped to plain JS —
		// Svelte components declare state in idiomatic non-linear order.
		files: ['**/*.js', '**/*.mjs'],
		rules: {
			'no-use-before-define': ['error', { functions: false, classes: false, variables: true }]
		}
	}
];
