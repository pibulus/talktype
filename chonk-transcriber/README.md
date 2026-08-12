# Chonk Transcriber

In-house batch transcription for TalkType, running on the Chonk home server
(pibulus.local / 192.168.0.136). A zero-dependency Node HTTP wrapper around
[transcribe.cpp](https://github.com/handy-computer/transcribe.cpp) (ggml,
numerically validated + WER tested models, the engine behind Handy).

**Locked model: `parakeet-tdt-0.6b-v3` (Q8_0, 706MB)** — multilingual (25
languages), auto-detects language, no hint needed. Swap via `MODEL_URL` on
setup / `MODEL` env at runtime; any GGUF from the `handy-computer` HF org
works, so a per-user model picker later is just a parameter.

## Benchmarks (Chonk i5-8500T, 6 threads, CPU, Q8_0 — measured 2026-08-12)

| Model                    | 27s clip         | 2.8s clip | Spanish (no lang hint)                              |
| ------------------------ | ---------------- | --------- | --------------------------------------------------- |
| **parakeet-tdt-0.6b-v3** | **2.9s (9x RT)** | **0.43s** | perfect, accents intact                             |
| Qwen3-ASR-0.6B           | 7.1s (4x)        | 0.81s     | perfect (nicest punctuation)                        |
| canary-1b-v2             | 5.0s (5x)        | 0.57s     | FAILED — half-translated to English without `-l es` |
| whisper-large-v3-turbo   | 12.5s (2x)       | 11.5s (!) | perfect but fixed 30s window kills short clips      |

End-to-end wall time vs the cloud (same clips, measured 2026-08-13, LAN +
live APIs): Deepgram 0.3–1.7s (3s clip) / ~1.2s (27s clip); Chonk ~3s / ~9s;
Gemini styled 14–19s / ~11s. Deepgram is 3–8x faster than Chonk today —
Chonk's gap is mostly per-request model load + ffmpeg, so a resident-model
wrapper (TS bindings) would bring short clips near ~1s if it ever matters.

Long audio: Parakeet drops to ~4.6x RT (65s wall for a 5-min clip) — hence the
`CHONK_MAX_DURATION_SECONDS` gate in `/api/transcribe` (default 120s; longer
clips go straight to Deepgram). Model load is ~1s of every request (CLI spawn
per job; upgrade path = long-lived process via the TS bindings).

Bonus finding: Deepgram Nova-3 `standard` returns an EMPTY transcript for
Spanish batch audio (defaults to English) — the Chonk path is currently the
only thing serving Spanish batch users. Runner-up models remain downloaded in
`~/talktype-transcriber/models/` on chonk.

Vulkan on the UHD 630 iGPU: tested and rejected — slower than CPU on short
clips (6.9s vs 2.9s) and silently emits EMPTY output on 5-min clips. Chonk
runs the plain CPU build; `VULKAN=1` is only for future hardware with a real
GPU.

## Deploy (on chonk)

```bash
scp -r chonk-transcriber pibulus@pibulus.local:~/chonk-transcriber-setup
ssh pibulus@pibulus.local 'bash ~/chonk-transcriber-setup/setup.sh'
```

`setup.sh` installs deps (ffmpeg, OpenBLAS), builds transcribe.cpp, downloads
the model, and prints the systemd + fleet wiring steps. `VULKAN=1` adds the
UHD 630 iGPU backend (needs `spirv-headers glslang-tools` and the `render`
group — script handles both; re-login after).

## API

- `GET /health` -> `{ ok, model }`
- `POST /transcribe` (raw audio body, any ffmpeg-readable container) -> `{ text }`

Jobs run serially; 50MB body cap; 120s per-job kill timer. LAN-only — the
public trust boundary (auth, rate limits, size/duration caps) stays in
TalkType's `/api/transcribe`.

## Wiring TalkType

Set `CHONK_TRANSCRIBE_URL=http://192.168.0.136:7331` via `TALKTYPE_EXTRA_ENV`
in `~/.config/fleet/keys.env`, then `apikey sync talktype`. Unset = feature off,
everything routes to Deepgram exactly as before. Free-tier `standard` requests
≤ `CHONK_MAX_DURATION_SECONDS` go Chonk-first with Deepgram fallback;
supporters stay on Deepgram for diarization.
