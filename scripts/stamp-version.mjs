// ═══════════════════════════════════════════════════════════════════════════
// 🔖 stamp-version — write the commit being built into /version.json
// ═══════════════════════════════════════════════════════════════════════════
// WHY THIS EXISTS: every silent-stale-deploy incident in this fleet had the
// same shape — the host reported success and served an old build, and nothing
// could tell the difference from outside. `fleet-check --deployed` was written
// to catch exactly that and had to print `unknown` for the Netlify and Deno
// lanes, because neither host exposes the commit it is currently serving.
//
// The past attempt tried to ASK THE HOST and gave up. This inverts it: the
// build stamps itself, so the artifact answers for itself over plain HTTP on
// any host, in any lane, forever.
//
// This is strictly better than the host API even where one exists — a Netlify
// CLI artifact upload (`netlify deploy --prod`, the lane used whenever build
// credits are exhausted) has a NULL commit_ref in Netlify's own API. The host
// genuinely does not know. The stamp does.
//
// Runs from `prebuild`, so it cannot be forgotten on a build path.

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

function commit() {
	// Netlify/Vercel set this; on a shallow CI clone it is more reliable than git.
	const fromEnv = process.env.COMMIT_REF || process.env.VERCEL_GIT_COMMIT_SHA;
	if (fromEnv) return fromEnv.trim().slice(0, 7);

	try {
		return execSync('git rev-parse HEAD', {
			stdio: ['ignore', 'pipe', 'ignore']
		})
			.toString()
			.trim()
			.slice(0, 7);
	} catch {
		// A tarball build with no git and no CI env. Better to serve a known
		// "unknown" than to fail the build over a diagnostic file.
		return 'unknown';
	}
}

const stamp = {
	commit: commit(),
	built: new Date().toISOString()
};

mkdirSync('static', { recursive: true });
writeFileSync('static/version.json', `${JSON.stringify(stamp, null, 2)}\n`);

console.log(`🔖 version.json → ${stamp.commit} (${stamp.built})`);
