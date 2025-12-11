import { env } from '$env/dynamic/private';

// This endpoint creates a WebSocket proxy to Deepgram
// Because browsers cannot connect directly to Deepgram due to CORS

export function GET({ request }) {
	const apiKey = env.DEEPGRAM_API_KEY;
	
	if (!apiKey) {
		return new Response('Missing API key', { status: 500 });
	}

	// Check if this is a WebSocket upgrade request
	const upgradeHeader = request.headers.get('upgrade');
	if (upgradeHeader?.toLowerCase() !== 'websocket') {
		return new Response('Expected WebSocket upgrade', { status: 426 });
	}

	// Note: SvelteKit doesn't natively support WebSocket handling
	// For production, you'd use a proper WebSocket server or adapter
	// For now, we'll return the configuration for client-side handling
	
	return new Response(JSON.stringify({
		error: 'WebSocket proxy requires custom server setup',
		suggestion: 'Use Deepgram SDK on server-side or set up a proper WebSocket proxy'
	}), {
		status: 501,
		headers: { 'Content-Type': 'application/json' }
	});
}
