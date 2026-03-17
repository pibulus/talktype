/**
 * @module logger
 * @description Lightweight logging utility that silences non-error output in production.
 * - `log()` and `warn()` only output when `import.meta.env.DEV` is true.
 * - `error()` always outputs (errors should surface in production).
 *
 * Usage:
 *   import { createLogger } from '$lib/utils/logger';
 *   const log = createLogger('MyService');
 *   log.log('Starting up...');   // Silent in production
 *   log.error('Failed!', err);   // Always visible
 */

const isDev = import.meta.env.DEV;

/**
 * Creates a tagged logger instance.
 * @param {string} [tag] - Prefix for log messages (e.g., 'WhisperService')
 * @returns {{ log: (...args: any[]) => void, warn: (...args: any[]) => void, error: (...args: any[]) => void }}
 */
export function createLogger(tag) {
	const prefix = tag ? `[${tag}]` : '';
	return {
		log: isDev ? (...args) => console.log(prefix, ...args) : () => {},
		warn: isDev ? (...args) => console.warn(prefix, ...args) : () => {},
		error: (...args) => console.error(prefix, ...args)
	};
}
