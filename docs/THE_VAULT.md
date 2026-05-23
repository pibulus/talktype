# The TalkType Vault: Architecture & Philosophy

The Vault is a local-first, private-cloud sync system powered by your Raspberry Pi. It prioritizes privacy, ownership, and simplicity.

## 1. Core Philosophy

- **Local-First**: Data lives on the user's device.
- **Privacy**: The server (your Pi) never sees raw transcript data. Everything is encrypted client-side.
- **No Friction**: No traditional account/login. The Supporter Code IS the account.
- **Hardware-Centric**: Built on your physical infrastructure (Pi + hard drive).

## 2. The Vault Protocol

- **Storage**: An encrypted JSON payload (`{ data: encryptedPayload }`).
- **Addressing**: `/vault/[app_name]/[vault_hash]` where `vault_hash` is `sha256("talktype-vault-id:" + supporter_code)`.
- **Key derivation**: PBKDF2-SHA256 with a per-payload random salt.
- **Device trust boundary**: TalkType treats the supporter code as the user's Passport key. After unlock, it stores that code locally on the device so the card, history, and Vault backup can work without repeated prompts. This is trusted-device convenience, not enterprise key custody; clearing site data forgets the Passport.
- **Handshake**:
  1. Client derives a symmetric key from the `supporter_code`.
  2. Client encrypts the transcript history JSON blob with AES-GCM.
  3. Client `POST`s the encrypted blob to the Pi.
  4. Pi saves the blob to disk, keyed by app name and vault hash.

## 3. Sync Flow

1. **Sync Trigger**: User clicks "Sync Vault."
2. **Download**: Client `GET`s `/vault/[app_name]/[vault_hash]`.
3. **Decrypt**: Client decrypts with the `supporter_code`.
4. **Merge**: Client merges remote data with local IndexedDB (Last-Write-Wins based on `timestamp`).
5. **Upload**: Client encrypts the merged state and `POST`s back to the Pi.

The current History modal implements a deliberate one-way **Back up to Vault** action. The user enters the Vault URL, TalkType uses the locally remembered Passport key to encrypt, then uploads the encrypted history payload. If the Passport key is missing because site data was cleared, the modal asks for the supporter code once and remembers it again. Full bidirectional merge remains a follow-up.

## 3.1 Audio Media Payloads

Supporter audio should sync as separate encrypted media payloads, not as base64 embedded inside the transcript list.

- Transcript history stores a media reference such as `{ mediaId, mediaHash, mimeType, size }`.
- Audio payloads live under the media namespace: `/vault/[app_name]-media/[media_hash]`.
- `media_hash` is `sha256("talktype-vault-media:" + supporter_code + ":" + media_id)`.
- The media body is encrypted client-side with the same AES-GCM/PBKDF2 envelope as JSON payloads, but over raw audio bytes.
- Audio sync should remain opt-in because audio is larger and more sensitive than text.
- TalkType stores media references in an encrypted `app_name-media-index` manifest so missing/orphaned media can be detected without embedding large files in the transcript list.
- The app preference model supports `30 days` and `Forever`; retention pruning happens at the manifest layer before the next upload.

## 4. Integration Ecosystem

- **Auth/Link**: QuickCat can route users to the sync page without the Vault server knowing raw transcript data.
- **Access**: QR handoff should use a trusted local renderer before embedding supporter codes.

## 5. Implementation Roadmap

1. [x] **Pi Drop-zone**: Minimal Node server for `GET`/`POST` encrypted files.
2. [x] **Encryption Service**: Client-side AES-GCM helpers for JSON payloads.
3. [x] **Backup UI**: "Back up" action in History Modal for encrypted one-way backup.
4. [ ] **Merge Logic**: Last-write-wins merge with IndexedDB transcript history.
5. [x] **Audio Media Helpers**: Encrypted audio blob upload/download helpers and media manifest.
6. [ ] **Trusted QR Integration**: Generate QR codes locally or through a trusted private renderer.

## 6. Deployment Notes

- Keep the Vault behind HTTPS before using it outside the LAN.
- Set `VAULT_ALLOWED_ORIGIN` when browser sync happens from a different TalkType origin.
- The drop-zone stores encrypted blobs only; it does not make a weak supporter code safe. Codes used for Vault sync need enough entropy to resist offline guessing.
- `MAX_VAULT_BLOB_BYTES` defaults to 50MB so short encrypted audio clips can fit. Lower it for text-only vaults or raise it deliberately for long-form audio.
- `/health` reports the Vault directory, max blob size, and disk-space figures when the host supports `statfs`.

---

_"The best code feels like magic but works like clockwork"_
