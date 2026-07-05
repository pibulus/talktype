// hooks.server.js — SSR security headers for TalkType
// Every response that comes through the Node adapter gets these headers.
// The CSP is intentionally permissive on connect-src / script-src to avoid
// breaking the voice/WASM/analytics stack. Tighten once you have a smoke-test
// baseline (see NEEDS BROWSER SMOKE TEST note in audit report).

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const response = await resolve(event);

	// HSTS — force HTTPS for a year, including subdomains
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

	// Don't send full Referer to cross-origin destinations (e.g. Square, Deepgram)
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	// Prevent clickjacking
	response.headers.set('X-Frame-Options', 'DENY');

	// Block MIME-type sniffing
	response.headers.set('X-Content-Type-Options', 'nosniff');

	// Content-Security-Policy
	// Each directive is annotated with WHY a given origin or keyword is required.
	const csp = [
		// default — self only; everything else is explicit below
		"default-src 'self'",

		// SvelteKit inline scripts + Umami analytics inline snippet
		// 'unsafe-inline' needed because SvelteKit injects inline <script> blocks
		// for hydration data and env vars. Removing this white-screens the app.
		// TODO: replace with a nonce-based approach once SvelteKit supports it stably.
		"script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://cloud.umami.is https://static.cloudflareinsights.com",
		//   'wasm-unsafe-eval' — required for @huggingface/transformers onnxruntime-web (Whisper WASM)
		//   blob: — onnxruntime-web's JSPI loader (Chrome 137+) wraps its fetched
		//   .mjs glue in a blob and dynamic-imports it; without blob: here Offline
		//   Mode dies with "no available backend found" on modern Chrome.
		//   https://cloud.umami.is — Umami analytics script (PUBLIC_UMAMI_SCRIPT_URL default)

		// Styles — SvelteKit also inlines critical CSS
		"style-src 'self' 'unsafe-inline'",

		// Images: self + data URIs (QR stamps, base64 avatars)
		"img-src 'self' data: blob:",

		// Fonts served locally
		"font-src 'self'",

		// Workers: service worker lives on same origin; WASM runs in worker blobs
		"worker-src 'self' blob:",

		// connect-src — every external API the client-side code hits:
		[
			'connect-src',
			"'self'",
			'https://api.deepgram.com', // Deepgram STT (live + batch)
			'wss://api.deepgram.com', // Deepgram WebSocket streaming
			'https://generativelanguage.googleapis.com', // Gemini API (style presets)
			'https://connect.squareup.com', // Square payments (production)
			'https://connect.squareupsandbox.com', // Square sandbox (dev/testing)
			'https://cloud.umami.is', // Umami analytics beacon
			'https://huggingface.co', // Whisper model metadata (transformers.js)
			'https://*.cdn.hf.co', // HF Xet CDN — model files redirect here (regional: us.aws.cdn.hf.co/xet-bridge-us/...). Scoped to the cdn subdomain, NOT all of *.hf.co (which would cover user spaces).
			'https://cdn-lfs.huggingface.co', // HF legacy LFS large-file host
			'https://cas-bridge.xethub.hf.co', // HF Xet bridge (alt host)
			'https://cdn.jsdelivr.net' // transformers.js CDN fallback path (WASM + model fallback)
		].join(' '),

		// Media: microphone recordings are blob: URLs
		"media-src 'self' blob:",

		// manifest.json lives on same origin
		"manifest-src 'self'",

		// No embedding of this app in frames elsewhere
		"frame-ancestors 'none'",

		// Lock <base href> to self so injected <base> tags can't hijack relative URLs
		"base-uri 'self'",

		// Restrict form submission targets. Square checkout is a window.location
		// redirect (not a form POST), so 'self' is enough — defense-in-depth.
		"form-action 'self'",

		// Block mixed content
		'upgrade-insecure-requests'
	].join('; ');

	response.headers.set('Content-Security-Policy', csp);

	return response;
}
