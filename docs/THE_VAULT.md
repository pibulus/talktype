# The TalkType Vault: Architecture & Philosophy

The Vault is a local-first backup and handoff system powered by your Raspberry Pi. It prioritizes privacy, ownership, and simplicity.

## 1. Core Philosophy

- **Local-First**: Data lives on the user's device.
- **Privacy**: The server (your Pi) never sees raw transcript data. Everything is encrypted client-side.
- **No Friction**: No traditional account/login. The Supporter Code IS the account.
- **Hardware-Centric**: Built on your physical infrastructure (Pi + hard drive).
- **Honest Shape**: The Vault is backup and handoff, not a live multi-device workspace.

## 2. The Vault Protocol

- **Storage**: An encrypted JSON payload (`{ data: encryptedPayload }`).
- **Addressing**: `/vault/[app_name]/[vault_hash]` where TalkType currently derives `vault_hash` as `sha256("talktype-vault-id:" + supporter_code)`.
- **Key derivation**: PBKDF2-SHA256 with a per-payload random salt.
- **Device trust boundary**: TalkType treats the supporter code as the user's Passport key. After unlock, it stores that code locally on the device so the card, history, and Vault backup can work without repeated prompts. The vault hash is derived on demand from that stored code, not cached with a silent expiry. This is trusted-device convenience, not enterprise key custody; clearing site data forgets the Passport.
- **Local key naming**: Passport/Vault localStorage keys use the `pibulus:talktype:*` convention, with read-through migration from old `talktype_*` keys. Other apps should use the same pattern with their own app ID, e.g. `pibulus:ziplist:passport_code`.
- **Handshake**:
  1. Client derives a symmetric key from the `supporter_code`.
  2. Client encrypts the transcript history JSON blob with AES-GCM.
  3. Client `POST`s the encrypted blob to the Pi.
  4. Pi saves the blob to disk, keyed by app name and vault hash.

## 3. Product Shape

TalkType's settled Vault shape is:

1. **Automatic text backup**: after a successful supporter transcript is saved, TalkType quietly backs up text history if this device already has a Passport code and Vault URL.
2. **Manual snapshot button**: the History modal still has a **Back up** button so the user can save a snapshot on purpose.
3. **Passport handoff**: the membership card asks QRBuddy to render a QR stamp whose payload points to TalkType `/passport#code=...&vault=...`.
4. **Manual restore**: `/passport` imports the supporter code, remembers the Vault URL, derives the vault hash, downloads the encrypted backup, decrypts locally, and merges into IndexedDB without duplicating the same Vault source IDs.
5. **Audio is a choice**: audio blobs are only backed up when the user turns on **Back Up Recordings**, because audio uses real Pi disk space.

This is backup/restore and device handoff, not automatic two-way sync. That is a product decision, not a temporary gap. It gives people the important utility: "my notes are backed up" and "I can move them to another device" without creating a shared live workspace.

## 4. Current TalkType Flow

1. **Configured device**: the user has supporter mode, a remembered Passport code, and a saved Vault URL.
2. **Save transcript**: TalkType saves the transcript to local IndexedDB.
3. **Best-effort backup**: TalkType loads local history, encrypts the transcript list, and uploads it to `/vault/talktype/[vault_hash]`. Backup failures do not block the recording flow.
4. **Optional audio backup**: when audio backup is enabled, audio blobs are encrypted separately under `/vault/talktype-media/[media_hash]`, with references tracked in an encrypted `talktype-media-index` manifest.
5. **Another device**: the Passport QR/link opens `/passport`, imports the code and Vault URL, and offers **Restore from Vault**.

## 5. Audio Media Payloads

Supporter audio backs up as separate encrypted media payloads, not as base64 embedded inside the transcript list.

- Transcript history stores a media reference such as `{ mediaId, mediaHash, mimeType, size }`.
- Audio payloads live under the media namespace: `/vault/[app_name]-media/[media_hash]`.
- `media_hash` is `sha256("talktype-vault-media:" + supporter_code + ":" + media_id)`.
- The media body is encrypted client-side with the same AES-GCM/PBKDF2 envelope as JSON payloads, but over raw audio bytes.
- Audio backup is opt-in because audio is larger, more sensitive, and uses real disk space.
- TalkType stores media references in an encrypted `app_name-media-index` manifest so missing/orphaned media can be detected without embedding large files in the transcript list.
- The app preference model supports `30 days` and `Forever`; retention pruning happens at the manifest layer before the next upload.

## 6. Cross-App Shape

The portable pieces are the supporter code, encryption envelope, Vault transport, app-name namespaces, and QRBuddy rendering. The TalkType-specific pieces are the `/passport` route, membership-card copy, transcript merge format, and current `talktype-vault-id:` hash namespace.

For another app such as ZipList, the honest next step is to copy the small Passport/Vault helpers and adapt the app name, localStorage prefix, route, and merge format. Extract a shared package only after a second app proves the shape.

## 7. Integration Ecosystem

- **Passport QR**: QRBuddy renders the membership-card QR image. The QR points directly to TalkType `/passport#code=...&vault=...` so another device can import the Passport and restore from Vault. This deliberately treats QRBuddy/Pi as trusted Pablo-owned infrastructure.
- **Pretty Links**: A short `talktype.app` connect-link layer can sit in front later, but the working primitive is the direct Passport link.

## 8. Implementation Roadmap

1. [x] **Pi Drop-zone**: Minimal Node server for `GET`/`POST` encrypted files.
2. [x] **Encryption Service**: Client-side AES-GCM helpers for JSON payloads.
3. [x] **Backup UI**: "Back up" action in History Modal for encrypted one-way backup.
4. [x] **Restore/Merge Logic**: Passport route can restore Vault history/audio into local IndexedDB without duplicating the same Vault source IDs.
5. [x] **Audio Media Helpers**: Encrypted audio blob upload/download helpers and media manifest.
6. [x] **Passport QR Handoff**: Render membership-card QR art through QRBuddy and point scans directly at TalkType Passport import.
7. [x] **Automatic Text Backup**: Back up text history after supporter transcripts when Passport and Vault URL are configured.
8. [ ] **Pretty Connect URLs**: Add short `talktype.app` links for phone-to-computer handoff.

## 9. Deployment Notes

- Keep the Vault behind HTTPS before using it outside the LAN.
- Set `VAULT_ALLOWED_ORIGIN` when browser backup/restore happens from a different TalkType origin.
- The drop-zone stores encrypted blobs only; it does not make a weak supporter code safe. Codes used for Vault backup need enough entropy to resist offline guessing.
- `MAX_VAULT_BLOB_BYTES` defaults to 50MB so short encrypted audio clips can fit. Lower it for text-only vaults or raise it deliberately for long-form audio.
- `/health` reports the Vault directory, max blob size, and disk-space figures when the host supports `statfs`.
