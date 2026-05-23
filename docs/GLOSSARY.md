# TalkType Glossary

## Components

- `MainContainer`: top-level app orchestration, dialogs, PWA auto-start, ghost events.
- `GhostContainer`: wraps the interactive ghost.
- `Ghost`: interactive runtime mascot used on the main app screen.
- `DisplayGhost`: static/decorative ghost used in modals, previews, and secondary screens.
- `ContentContainer`: main content wrapper between page shell and audio feature.
- `AudioToText`: audio/transcript feature shell.
- `RecordingControls`: recording button, timer, status copy, and visual feedback.
- `RecordButtonWithTimer`: compressed button UI used by recording controls.
- `TranscriptDisplay`: transcript output/editor surface.
- `Settings`: options modal for theme, auto-record, transcription mode, supporter features, and output style presets.
- `TranscriptionStyleSelector`: three-preset output style control; plain transcription is the default when no style is selected.
- `SupporterModal`: supporter code entry and supporter feature explanation.
- `TranscriptHistoryModal`: supporter transcript history, editing, deletion, Vault backup, and audio playback surface.
- `MembershipCard`: deterministic supporter Passport card with QRBuddy-rendered Passport QR stamp.

## Services And Stores

- `AudioService`: browser microphone and `MediaRecorder` owner.
- `RecordingControlsService`: high-level recording workflow owner.
- `TranscriptionService`: post-recording transcription workflow owner.
- `simpleHybridService`: chooses Offline Whisper or cloud batch transcription.
- `offlineModelController`: controls background Whisper load/release.
- `transcriptionStore`: Deepgram live WebSocket store.
- `recordingRecoveryStore`: IndexedDB persistence for recovery drafts and active recording journal chunks.
- `transcriptHistory`: IndexedDB-backed supporter transcript history store.
- `transcriptTags`: local smart-tag generation and cleanup helpers for saved transcripts.
- `vaultAutoBackup`: best-effort text history backup after supporter transcripts when Passport and Vault URL are configured.
- `vaultTranscriptBackup`: encrypted History-to-Vault backup and `/passport` restore orchestration.
- `syncService`: low-level encrypted Vault JSON/audio transport helpers.
- `encryptionService`: AES-GCM/PBKDF2 envelope helpers for JSON and Blob payloads.
- `vaultHashStorage`: trusted-device Passport code storage and legacy vault-hash cleanup.
- `qrHandshakeService`: builds Passport import URLs and QRBuddy render URLs.
- `pwaService`: install prompt, installed-state, and PWA engagement helper.
- `userPreferences`: local preference store for mode, supporter, style, and recording settings.
- `whisperStatus`: local Whisper loading/loaded status store.
- `audioState`: current low-level audio lifecycle state.
- `transcriptionState`: current transcript/progress/error state.

## Modes

- **Live Mode**: Deepgram realtime transcription while recording. Default on.
- **Offline Mode**: local Whisper transcription in browser. Overrides Live Mode.
- **Batch cloud**: post-recording transcription via `/api/transcribe`.
- **Standard style**: routes cloud batch to Deepgram.
- **Styled/custom style**: routes cloud batch to Gemini.

## Platform Terms

- **Installed PWA**: app launched from home screen/dock/standalone display mode.
- **Auto-record**: user preference that tries to start recording on app open.
- **Launch shortcut**: PWA shortcut with `?action=record`.
- **Warm stream**: short-lived iOS installed-PWA microphone stream kept after stop to reduce stream churn.
- **Recovery draft**: saved local audio blob used to retry transcription after failure.
- **Recovery journal**: append-only IndexedDB chunks written while recording so interrupted long notes can be reconstructed.

## Supporter And Vault Terms

- **Supporter mode**: unlocked state that enables history, exports, style presets, longer recordings, Passport, and Vault features.
- **Supporter code**: purchased or manually issued code that unlocks supporter features and acts as the trusted-device Passport key.
- **Supporter token**: signed local entitlement token used by API calls to unlock supporter-only server features.
- **Passport**: local supporter identity/key concept. In TalkType it powers the membership card, QR import, and Vault access.
- **Vault hash**: deterministic SHA-256 identifier derived from the supporter code when needed; it is not stored as durable app state.
- **Vault**: Pi-backed encrypted blob drop-zone addressed by app name and vault hash.
- **Vault backup**: automatic text-history upload when configured, plus a manual snapshot button in History.
- **Vault restore**: manual encrypted download/import through `/passport`; not automatic two-way sync.
- **QRBuddy**: Pablo-owned QR renderer used for the membership-card Passport stamp.
- **Smart tags**: local lightweight hashtags generated from transcript text for filtering saved history.
- **History audio**: optional saved recording audio attached to a history entry and optionally encrypted to Vault as media when recording backup is enabled.
