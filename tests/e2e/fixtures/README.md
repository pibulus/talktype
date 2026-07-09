# E2E fixtures

- `spoken-phrase.wav` — "the quick brown fox jumps over the lazy dog", 16kHz mono PCM16. Used by the offline-whisper/webgpu gates (decoded in-page; whisper wants 16kHz).
- `spoken-phrase-48k.wav` — same clip at 48kHz mono PCM16. Use THIS for Chromium `--use-file-for-fake-audio-capture` (fake mic): Chromium rejects 16kHz capture files with NotSupportedError on getUserMedia.
