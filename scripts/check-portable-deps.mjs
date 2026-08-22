#!/usr/bin/env node
// Fail the build if package.json declares a dependency that only resolves on
// one machine.
//
// Why this exists: on 2026-08-19 a `"softstack-sync": "file:../softstack-sync"`
// entry landed, pointing at a sibling directory that existed only on Pablo's
// laptop and was in no git repo. Local builds kept working, so nothing looked
// wrong — but every clean clone failed, which meant `deploy_app.sh` could not
// build TalkType at all. The live site sat frozen for three days and the only
// symptom was a Rollup error nobody was watching for.
//
// A `file:` or `link:` dep is not portable by definition: the deploy builds
// from a fresh `git clone`, where siblings do not exist. Vendor the code or
// give it a real repo.

import { readFileSync } from "node:fs";

const BAD_PREFIXES = ["file:", "link:"];

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));
const offenders = [];

for (const field of ["dependencies", "devDependencies", "optionalDependencies"]) {
  for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
    if (typeof spec === "string" && BAD_PREFIXES.some((p) => spec.startsWith(p))) {
      offenders.push({ field, name, spec });
    }
  }
}

if (offenders.length > 0) {
  console.error("\n✗ Non-portable dependencies found in package.json:\n");
  for (const o of offenders) {
    console.error(`    ${o.field}.${o.name} = "${o.spec}"`);
  }
  console.error(
    "\n  These resolve only on the machine that has the sibling directory.\n" +
      "  A deploy builds from a fresh clone, so this WILL fail there while\n" +
      "  still working locally — the worst kind of break.\n\n" +
      "  Fix: vendor the code into src/lib/, or publish it / give it a git\n" +
      "  repo and depend on that URL.\n",
  );
  process.exit(1);
}

console.log("✓ all dependencies are portable (no file:/link: specs)");
