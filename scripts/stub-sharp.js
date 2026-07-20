#!/usr/bin/env node
// TalkType never uses @huggingface/transformers's image pipeline (only its
// audio/Whisper path) but transformers.js does an eager top-level
// `require("sharp")` regardless, AND checks `if (sharp.default)` at
// module-load time — if that's falsy it throws "Unable to load image
// processing library" immediately, before any of our code even runs. So
// the stub's default export must be a truthy function (never actually
// called, since we never touch the image path), not `undefined`. The real
// `sharp` package needs a platform-specific compiled binary, which breaks
// the moment build and deploy happen on different OSes (macOS locally,
// Linux on Netlify/most hosts) — this stub sidesteps that entirely since
// nothing here calls it. Runs as `postinstall` so it self-heals on every
// fresh `npm install`, in any environment.
import { mkdirSync, writeFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// npm can hoist sharp to the top level AND leave nested copies inside any
// dependency's own node_modules (no dedupe) — walk every node_modules dir
// at any depth and stub every "sharp" directory found, not just the
// top-level one, or a nested copy still crashes.
function findSharpDirs(dir, found = [], depth = 0) {
	if (depth > 6) return found; // safety bound, node_modules trees are deep but not infinite
	let entries;
	try {
		entries = readdirSync(dir);
	} catch {
		return found;
	}
	for (const entry of entries) {
		const full = join(dir, entry);
		let stat;
		try {
			stat = statSync(full);
		} catch {
			continue;
		}
		if (!stat.isDirectory()) continue;
		if (entry === 'sharp') {
			found.push(full);
			continue; // don't recurse into the stub itself
		}
		// descend into scoped packages (@scope/pkg) and any nested node_modules
		findSharpDirs(full, found, depth + 1);
	}
	return found;
}

const nodeModules = join(root, 'node_modules');
const sharpDirs = findSharpDirs(nodeModules);

for (const dir of sharpDirs) {
	rmSync(dir, { recursive: true, force: true });
	mkdirSync(dir, { recursive: true });
	writeFileSync(
		join(dir, 'package.json'),
		JSON.stringify(
			{
				name: 'sharp',
				version: '0.0.0-stub',
				description: 'No-op stub — talktype never calls sharp, see scripts/stub-sharp.js',
				main: 'index.js'
			},
			null,
			2
		)
	);
	writeFileSync(
		join(dir, 'index.js'),
		[
			'// Truthy stub — transformers.js only checks `if (sharp.default)` at',
			'// module load; talktype never actually calls the image pipeline, so this',
			'// function is never invoked. If it ever IS called, fail loudly rather',
			'// than silently produce wrong output.',
			'function unusedSharpStub() {',
			"\tthrow new Error('sharp is stubbed out — talktype has no image pipeline, this should never be called');",
			'}',
			'module.exports = unusedSharpStub;',
			'module.exports.default = unusedSharpStub;',
			''
		].join('\n')
	);
}

console.log(`✓ stubbed sharp in ${sharpDirs.length} location(s) (unused native dep of @huggingface/transformers)`);
