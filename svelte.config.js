import adapterNode from '@sveltejs/adapter-node';
import adapterNetlify from '@sveltejs/adapter-netlify';

// Pi deploy (deploy:pi) stays on adapter-node, unchanged. Netlify build sets
// DEPLOY_TARGET=netlify so the same repo can ship to either host.
const adapter =
	process.env.DEPLOY_TARGET === 'netlify' ? adapterNetlify() : adapterNode({ out: 'build' });

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter
	}
};

export default config;
