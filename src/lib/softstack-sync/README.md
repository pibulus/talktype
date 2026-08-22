# softstack-sync (vendored)

Live-sync helpers: sync phrases, room derivation, PartySocket connection,
presence. Five files, ~20K.

**Vendored on purpose (2026-08-22).** This used to be a sibling directory
consumed via `"softstack-sync": "file:../softstack-sync"`. That path only ever
resolved on Pablo's laptop, so every clean clone — including the one
`deploy_app.sh` builds from — failed at:

    [vite]: Rollup failed to resolve import "softstack-sync"

TalkType could not deploy anywhere for three days and nothing reported it,
because the laptop build kept working.

If a second app ever needs these helpers, extract this directory into a real
git repo and depend on that — do NOT recreate a `file:` sibling. See
`scripts/check-portable-deps.mjs`, which now fails the build on any
`file:`/`link:` dependency.
