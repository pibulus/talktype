# 🔑 API Keys for this app — DO NOT hand-edit keys

This app's Gemini key is managed by the **fleet key system**, not by editing files here.

## The one law
The key lives in **`~/.config/fleet/keys.env`** on the Mac (as `TALKTYPE_GEMINI_KEY`).
That is the ONLY place you edit it.

## To change/rotate this app's key
```
# 1. edit the source of truth
$EDITOR ~/.config/fleet/keys.env
# 2. push it (writes /etc/talktype.env on the Pi, restarts the service)
~/.claude/scripts/fleet/keys-sync talktype
# 3. prove it's live (real audio → the deployed endpoint)
~/.claude/scripts/fleet/key-doctor
```

## Never do these (they caused months of silent breakage)
- ❌ Don't put a key in this repo's `.env` and expect it on the Pi — the deploy no longer
  carries `.env` forward (on purpose). Prod reads `/etc/talktype.env` (systemd EnvironmentFile).
- ❌ Don't `sudo nano` the systemd unit or `/etc/talktype.env` by hand — `keys-sync` owns them.
- ❌ Don't set `GOOGLE_API_KEY` anywhere (shell or unit) — the `@google/genai` SDK prefers it
  and it silently shadows this app's real key, even one passed explicitly.

## Local dev
`npm run dev` uses THIS repo's own `.env` `GEMINI_API_KEY` (== production). No shell shadow.

Model: rolling alias `gemini-flash-lite-latest` (anti-drift). Key format: `AQ.` only.
Full system: `~/.claude/scripts/fleet/README.md`. Pi ops: `~/pibulus-os/APP_DEPLOYMENT_MAP.md`.
