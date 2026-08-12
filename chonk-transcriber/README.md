# Chonk Transcriber

In-house batch transcription for TalkType, running on the Chonk home server
(pibulus.local / 192.168.0.136). A zero-dependency Node HTTP wrapper around
[transcribe.cpp](https://github.com/handy-computer/transcribe.cpp) (ggml,
numerically validated + WER tested models, the engine behind Handy).

**Default model: `parakeet-tdt-0.6b-v3` (Q8_0)** — multilingual (25 languages,
Spanish included), near-Whisper-large accuracy, faster than realtime on modest
CPUs. Swap via `MODEL_URL` on setup / `MODEL` env at runtime; any GGUF from the
`handy-computer` HF org works, so a per-user model picker later is just a
parameter.

## Deploy (on chonk)

```bash
scp -r chonk-transcriber pibulus@pibulus.local:~/chonk-transcriber-setup
ssh pibulus@pibulus.local 'bash ~/chonk-transcriber-setup/setup.sh'
```

`setup.sh` installs deps (ffmpeg, OpenBLAS), builds transcribe.cpp, downloads
the model, runs the wrapper's selftest, and prints the systemd + fleet wiring
steps. `VULKAN=1` builds for the UHD 630 iGPU.

> If the v3 model URL 404s, check https://huggingface.co/handy-computer for the
> exact repo/file name and rerun with `MODEL_URL=...`. `parakeet-tdt-0.6b-v2`
> (English-only) is the confirmed-published fallback.

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
go Chonk-first with Deepgram fallback; supporters stay on Deepgram for
diarization.
