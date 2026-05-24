# The TalkType Vault: Architecture & Philosophy

The Vault is the backstage storage layer for TalkType Passport. Users see a Passport; the app quietly uses your Raspberry Pi as an encrypted handoff point.

## 1. Core Philosophy

- **Local-First**: Data lives on the user's device.
- **Privacy**: The server (your Pi) never sees raw transcript data. Everything is encrypted client-side.
- **No Friction**: No traditional account/login. The Supporter Code IS the Passport.
- **Hardware-Centric**: Built on your physical infrastructure (Pi + hard drive).
- **Honest Shape**: The Vault is not a user-facing product. It is a current encrypted mirror used to help notes appear on another device.

## 2. The Vault Protocol

- **Storage**: An encrypted JSON payload (`{ data: encryptedPayload }`).
- **Addressing**: `/vault/[app_name]/[vault_hash]` where TalkType currently derives `vault_hash` as `sha256("talktype-vault-id:" + supporter_code)`.
- **Key derivation**: PBKDF2-SHA256 with a per-payload random salt.
- **Device trust boundary**: TalkType treats the supporter code as the user's Passport key. After unlock, it stores that code locally on the device so the card and notes check-in can work without repeated prompts. The vault hash is derived on demand from that stored code, not cached with a silent expiry. This is trusted-device convenience, not enterprise key custody; clearing site data forgets the Passport.
- **Local key naming**: Passport/Vault localStorage keys use the `pibulus:talktype:*` convention, with read-through migration from old `talktype_*` keys. Other apps should use the same pattern with their own app ID, e.g. `pibulus:ziplist:passport_code`.
- **Handshake**:
  1. Client derives a symmetric key from the `supporter_code`.
  2. Client encrypts the transcript history JSON blob with AES-GCM.
  3. Client `POST`s the encrypted blob to the Pi.
  4. Pi saves the blob to disk, keyed by app name and vault hash.

## 3. Product Shape

TalkType's settled shape is:

1. **Passport frontstage**: user-facing copy says Passport, notes, card, QR. It does not expose Vault URLs, backup panels, or sync theory.
2. **Automatic current mirror**: after a supporter transcript is saved, edited, deleted, or cleared, TalkType quietly mirrors the current history if this device already has a Passport code and notes endpoint.
3. **Quiet notes check-in**: on app open and history open, TalkType checks whether the local notes or encrypted mirror is newer. Remote newer pulls down as the current mirror; local newer pushes up.
4. **Passport handoff**: the membership card asks QRBuddy to render a QR stamp whose payload points to TalkType `/passport#code=...&vault=...`.
5. **Audio comes with the note**: if a saved history item has a recording, the mirror encrypts and stores that audio too.

This is not a shared live workspace and not a separate permanent archive. It is a simple current-state mirror: open the Passport on another device and the notes should settle into place. Deleted local notes are removed from the encrypted mirror on the next pass.

## 4. Current TalkType Flow

1. **Configured device**: the user has supporter mode, a remembered Passport code, and a configured notes endpoint.
2. **Save transcript**: TalkType saves the transcript to local IndexedDB.
3. **Best-effort mirror**: TalkType loads local history, encrypts the current transcript list, and uploads it to `/vault/talktype/[vault_hash]`. Backup failures do not block the recording flow.
4. **Audio media mirror**: audio blobs are encrypted separately under `/vault/talktype-media/[media_hash]`, with references tracked in an encrypted `talktype-media-index` manifest. Media that is no longer referenced by the current history is deleted from Vault on the next mirror pass.
5. **Another device**: the Passport QR/link opens `/passport`, imports the code and notes endpoint, and quietly checks for notes.

## 5. Audio Media Payloads

Supporter audio backs up as separate encrypted media payloads, not as base64 embedded inside the transcript list.

- Transcript history stores a media reference such as `{ mediaId, mediaHash, mimeType, size }`.
- Audio payloads live under the media namespace: `/vault/[app_name]-media/[media_hash]`.
- `media_hash` is `sha256("talktype-vault-media:" + supporter_code + ":" + media_id)`.
- The media body is encrypted client-side with the same AES-GCM/PBKDF2 envelope as JSON payloads, but over raw audio bytes.
- Audio backup is automatic for configured Passports because the Pi/hard-drive setup is the paid handoff surface.
- TalkType stores media references in an encrypted `app_name-media-index` manifest so stale media can be deleted without embedding large files in the transcript list.
- Deleting a transcript locally removes it from the encrypted transcript list on the next mirror pass. If that transcript's audio is no longer referenced, TalkType asks the Vault to delete the encrypted media blob too.

## 6. Cross-App Shape

The portable pieces are the supporter code, encryption envelope, Vault transport, app-name namespaces, Passport local-storage convention, and QRBuddy rendering. The TalkType-specific pieces are the `/passport` route, membership-card copy, transcript mirror format, and current `talktype-vault-id:` hash namespace.

For another app such as ZipList, the honest next step is to copy the small Passport/Vault helpers and adapt the app name, localStorage prefix, route, and merge format. Extract a shared package only after a second app proves the shape.

## 7. Integration Ecosystem

- **Passport QR**: QRBuddy renders the membership-card QR image. The QR points directly to TalkType `/passport#code=...&vault=...` so another device can import the Passport and check for notes. This deliberately treats QRBuddy/Pi as trusted Pablo-owned infrastructure.
- **Pretty Links**: A short `talktype.app` connect-link layer can sit in front later, but the working primitive is the direct Passport link.

## 8. Implementation Roadmap

1. [x] **Pi Drop-zone**: Minimal Node server for `GET`/`POST` encrypted files.
2. [x] **Encryption Service**: Client-side AES-GCM helpers for JSON payloads.
3. [x] **Quiet Check-In**: app open, history open, and Passport import compare local/remote timestamps and settle the current notes mirror.
4. [x] **Restore/Mirror Logic**: Passport route can pull encrypted history/audio into local IndexedDB without duplicating the same Vault source IDs, and remote-newer pulls replace stale local state.
5. [x] **Audio Media Helpers**: Encrypted audio blob upload/download helpers and media manifest.
6. [x] **Passport QR Handoff**: Render membership-card QR art through QRBuddy and point scans directly at TalkType Passport import.
7. [x] **Automatic History Mirror**: mirror current history and attached recordings after supporter transcripts when Passport and a notes endpoint are configured.
8. [x] **Vault Media Cleanup**: Delete stale encrypted audio blobs when local history no longer references them.
9. [ ] **Pretty Connect URLs**: Add short `talktype.app` links for phone-to-computer handoff.
10. [ ] **Long Silence Stop**: Investigate automatically ending a recording after an extended quiet stretch, without adding another visible setting.

## 9. Deployment Notes

- Keep the Vault behind HTTPS before using it outside the LAN.
- Set `VAULT_ALLOWED_ORIGIN` when browser mirror/import/delete happens from a different TalkType origin.
- The drop-zone stores encrypted blobs only; it does not make a weak supporter code safe. Codes used for Passport notes need enough entropy to resist offline guessing.
- `MAX_VAULT_BLOB_BYTES` defaults to 150MB so normal compressed recordings can fit while still avoiding reckless browser/server memory spikes.
- `/health` reports the Vault directory, max blob size, and disk-space figures when the host supports `statfs`.
