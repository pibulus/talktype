# TalkType Branch Recovery Notes

> Created 2026-03-30 during cleanup of broken merge commits on feature/deepgram-streaming

## What Happened

4 local merge commits (`284c842`, `0b226ed`, `f298ab6`, `9a8bd63`) tried to merge side branches into `feature/deepgram-streaming` but committed unresolved `<<<<<<< HEAD` conflict markers into 8+ source files. The source branches were then deleted, hiding the evidence.

**Remote was never affected.** `origin/feature/deepgram-streaming` at `e9eab51` and `origin/main` at `ffb2237` are both clean.

Branch was reset to `origin/feature/deepgram-streaming` (e9eab51).

## Valuable Commits Worth Cherry-Picking

### Tier 1: Real bug fixes (apply these)

| Commit    | Description                                                                                                                                                                                                                                           | Files                          |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `e9af6cd` | Race conditions, memory leaks, SSR safety. Fixes stopRecording race, AudioVisualizer stream leak, RAF/setTimeout ID mixing, model switching memory leak, 5min Whisper download timeout, promptStyle circular sync. Deletes dead modelCacheService.js. | 8 files                        |
| `6bb31d4` | UI polish: duplicate CSS cleanup, SSR-safe userAgent guard, fixed translateZ overwriting translateY in AnimatedTitle stagger-in, removed dead startWobbleAnimation call, removed production console.logs                                              | 6 files                        |
| `9aabfdb` | Whisper amplitude calculation: replaced stack-unsafe spread with iterative sweep, fixes RangeError crash on recordings >10s in Privacy Mode                                                                                                           | 1 file (whisperService.js:407) |
| `c0b3313` | Ghost icon flash elimination: pre-initializes CSS vars in +layout.svelte before Ghost mounts, consolidates ghostInitialized+componentsLoaded into single fullyReady flag, adds inline color fallbacks                                                 | 4 files                        |
| `ce29d18` | Button min-width (280px) on DownloadingState + TranscribingState to prevent collapse on narrow screens, service-worker try/catch for Umami analytics fetch                                                                                            | 4 files                        |

### Tier 2: UX/copy improvements (nice to have)

| Commit    | Description                                                                                                                                                                    | Files   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| `bcbf08b` | Rebrand premium from "unlock" to "support the ghost/get goodies", pink/purple theme, cozy friend energy copy throughout Settings + PremiumUnlockModal + TranscriptHistoryModal | 3 files |

### Tier 3: Big cleanup (apply when ready for a dedicated cleanup session)

| Commit                                     | Description                                                                                                                                                                                                                                                                                                                                                                | Impact    |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `039c653` (branch: `claude/focused-morse`) | Comprehensive audit: privacy+live mode mutual exclusion, live transcript reset on disconnect, live mode completion flow (auto-copy/save/confetti), Deepgram scoped tokens, service worker skipWaiting+clients.claim, **-3,336 lines net** including deleting authModalService, 7 duplicate SVGs, vercel.json, 12 historical markdown files, Settings.svelte 653->319 lines | 30+ files |

## Branches Status

| Branch                       | Status                               | Action                                                                                                                                             |
| ---------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `feature/deepgram-streaming` | Reset to clean remote (e9eab51)      | DONE                                                                                                                                               |
| `main` (local + remote)      | Clean at ffb2237                     | No action needed                                                                                                                                   |
| `claude/focused-morse`       | Local only, at 039c653               | KEEP - has the big audit cleanup                                                                                                                   |
| `whisper-infra-diagnostics`  | Local only, 10K+ line rearchitecture | KEEP but don't merge - different direction entirely (Vosk, parallel downloader, removes premium). Cherry-pick specific components if needed later. |

## Stashes

| Stash       | Branch                     | Content                                     | Worth Keeping?                        |
| ----------- | -------------------------- | ------------------------------------------- | ------------------------------------- |
| stash@{0}   | feat/best-of-ghost-whisper | Settings.svelte simplification (-166 lines) | Maybe - removes inline code entry     |
| stash@{1}   | fix/ghost-icon-stability-2 | Ghost themeStore cleanup                    | Minor                                 |
| stash@{2}   | feat/ghost-simplification  | Ghost.svelte rewrite (1113 lines)           | Review later - animation improvements |
| stash@{3-8} | Various                    | Dependency drift, minor experiments         | No                                    |

## Cherry-Pick Order (when ready)

```bash
# From clean e9eab51 base:
git cherry-pick e9af6cd   # race conditions + memory leaks
git cherry-pick 6bb31d4   # UI polish
git cherry-pick ce29d18   # button sizing + Umami
git cherry-pick bcbf08b   # support copy rewrite (optional)
# These need manual application (were on side branches):
# - 9aabfdb (whisper amplitude fix)
# - c0b3313 (ghost flash fix)
# - 039c653 (big audit) — or merge claude/focused-morse branch
```

## Adapter Change

Switched from `@sveltejs/adapter-netlify` to `@sveltejs/adapter-node` for Pi deployment. This change is on the working tree but not committed yet. The app has server-side API routes (auth, Deepgram tokens, payments) that require a real server runtime.

## AudioToText.svelte Bug

There's a pre-existing bug at the end of `src/lib/components/audio/AudioToText.svelte` — a duplicated CSS fragment (`ign: center;` + duplicate `</style>` tag). This exists even in `e9eab51`. Needs fixing on any branch.
