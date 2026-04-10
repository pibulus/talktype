const isDev = import.meta.env.DEV;

/**
 * Lightweight tagged logger.
 * `log()` and `warn()` are dev-only; `error()` always reports.
 */
export function createLogger(tag = '') {
	const prefix = tag ? `[${tag}]` : '';

	return {
		log: isDev ? (...args) => console.log(prefix, ...args) : () => {},
		warn: isDev ? (...args) => console.warn(prefix, ...args) : () => {},
		error: (...args) => console.error(prefix, ...args)
	};
}
