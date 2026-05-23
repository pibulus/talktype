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

## 4. Integration Ecosystem

- **Auth/Link**: QuickCat can route users to the sync page without the Vault server knowing raw transcript data.
- **Access**: QR handoff should use a trusted local renderer before embedding supporter codes.

## 5. Implementation Roadmap

1. [x] **Pi Drop-zone**: Minimal Node server for `GET`/`POST` encrypted files.
2. [x] **Encryption Service**: Client-side AES-GCM helpers for JSON payloads.
3. [ ] **Sync UI**: "Sync" button in History Modal that triggers the handshake.
4. [ ] **Merge Logic**: Last-write-wins merge with IndexedDB transcript history.
5. [ ] **Trusted QR Integration**: Generate QR codes locally or through a trusted private renderer.

## 6. Deployment Notes

- Keep the Vault behind HTTPS before using it outside the LAN.
- Set `VAULT_ALLOWED_ORIGIN` when browser sync happens from a different TalkType origin.
- The drop-zone stores encrypted blobs only; it does not make a weak supporter code safe. Codes used for Vault sync need enough entropy to resist offline guessing.

---

_"The best code feels like magic but works like clockwork"_
