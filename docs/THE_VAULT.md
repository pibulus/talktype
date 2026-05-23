# The TalkType Vault: Architecture & Philosophy

The Vault is a local-first, private-cloud sync system powered by your Raspberry Pi. It prioritizes privacy, ownership, and simplicity.

## 1. Core Philosophy

- **Local-First**: Data lives on the user's device.
- **Privacy**: The server (your Pi) never sees raw transcript data. Everything is encrypted client-side.
- **No Friction**: No traditional account/login. The Supporter Code IS the account.
- **Hardware-Centric**: Built on your physical infrastructure (Pi + hard drive).

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

## 3. Current TalkType Flow

TalkType currently ships a deliberately simple one-way backup plus manual restore flow:

1. **Backup from History**: the History modal encrypts the local transcript list and uploads it to `/vault/talktype/[vault_hash]`.
2. **Optional audio backup**: when audio sync is enabled, audio blobs are encrypted separately under `/vault/talktype-media/[media_hash]`, with references tracked in an encrypted `talktype-media-index` manifest.
3. **Passport handoff**: the membership card asks QRBuddy to render a QR stamp whose payload points to TalkType `/passport#code=...&vault=...`.
4. **Restore on another device**: `/passport` imports the supporter code, remembers the Vault URL, derives the vault hash, downloads the encrypted backup, decrypts locally, and merges into IndexedDB without duplicating the same Vault source IDs.

This is backup/restore, not automatic background sync. That is intentional for now: fewer moving pieces, clearer failure modes, and enough utility for phone-to-computer handoff.

## 4. Future Two-Way Shape

1. **Sync Trigger**: User clicks "Sync Vault."
2. **Download**: Client `GET`s `/vault/[app_name]/[vault_hash]`.
3. **Decrypt**: Client decrypts with the `supporter_code`.
4. **Merge**: Client merges remote data with local IndexedDB (Last-Write-Wins based on `timestamp`).
5. **Upload**: Client encrypts the merged state and `POST`s back to the Pi.

This is the later fully automatic shape. Do not build it until the manual backup/restore path has had real use.

## 5. Audio Media Payloads

Supporter audio should sync as separate encrypted media payloads, not as base64 embedded inside the transcript list.

- Transcript history stores a media reference such as `{ mediaId, mediaHash, mimeType, size }`.
- Audio payloads live under the media namespace: `/vault/[app_name]-media/[media_hash]`.
- `media_hash` is `sha256("talktype-vault-media:" + supporter_code + ":" + media_id)`.
- The media body is encrypted client-side with the same AES-GCM/PBKDF2 envelope as JSON payloads, but over raw audio bytes.
- Audio sync should remain opt-in because audio is larger and more sensitive than text.
- TalkType stores media references in an encrypted `app_name-media-index` manifest so missing/orphaned media can be detected without embedding large files in the transcript list.
- The app preference model supports `30 days` and `Forever`; retention pruning happens at the manifest layer before the next upload.

## 6. Cross-App Shape

The portable pieces are the supporter code, encryption envelope, Vault transport, app-name namespaces, and QRBuddy rendering. The TalkType-specific pieces are the `/passport` route, membership-card copy, transcript merge format, and current `talktype-vault-id:` hash namespace.

For another app such as ZipList, the honest next step is to copy the small Passport/Vault helpers and adapt the app name, localStorage prefix, route, and merge format. Extract a shared package only after a second app proves the shape.

## 7. Integration Ecosystem

- **Passport QR**: QRBuddy renders the membership-card QR image. The QR points directly to TalkType `/passport#code=...&vault=...` so another device can import the Passport and sync. This deliberately treats QRBuddy/Pi as trusted Pablo-owned infrastructure.
- **Pretty Links**: A short `talktype.app` connect-link layer can sit in front later, but the working primitive is the direct Passport link.

## 8. Implementation Roadmap

1. [x] **Pi Drop-zone**: Minimal Node server for `GET`/`POST` encrypted files.
2. [x] **Encryption Service**: Client-side AES-GCM helpers for JSON payloads.
3. [x] **Backup UI**: "Back up" action in History Modal for encrypted one-way backup.
4. [x] **Restore/Merge Logic**: Passport route can restore Vault history/audio into local IndexedDB without duplicating the same Vault source IDs.
5. [x] **Audio Media Helpers**: Encrypted audio blob upload/download helpers and media manifest.
6. [x] **Passport QR Sync**: Render membership-card QR art through QRBuddy and point scans directly at TalkType Passport import.
7. [ ] **Pretty Connect URLs**: Add short `talktype.app` links for phone-to-computer handoff.

## 9. Deployment Notes

- Keep the Vault behind HTTPS before using it outside the LAN.
- Set `VAULT_ALLOWED_ORIGIN` when browser sync happens from a different TalkType origin.
- The drop-zone stores encrypted blobs only; it does not make a weak supporter code safe. Codes used for Vault sync need enough entropy to resist offline guessing.
- `MAX_VAULT_BLOB_BYTES` defaults to 50MB so short encrypted audio clips can fit. Lower it for text-only vaults or raise it deliberately for long-form audio.
- `/health` reports the Vault directory, max blob size, and disk-space figures when the host supports `statfs`.
