# The TalkType Vault: Architecture & Philosophy

The Vault is a local-first, private-cloud sync system powered by your Raspberry Pi. It prioritizes privacy, ownership, and simplicity.

## 1. Core Philosophy
- **Local-First**: Data lives on the user's device.
- **Privacy**: The server (your Pi) never sees raw transcript data. Everything is encrypted client-side.
- **No Friction**: No traditional account/login. The Supporter Code IS the account.
- **Hardware-Centric**: Built on your physical infrastructure (Pi + hard drive).

## 2. The Vault Protocol
- **Storage**: An encrypted JSON blob (`{encrypted_data}`).
- **Addressing**: `/vault/[vault_hash]` where `vault_hash` is `sha256(supporter_code)`.
- **Handshake**:
    1. Client derives a symmetric key from the `supporter_code`.
    2. Client encrypts the transcript history JSON blob (using AES-GCM).
    3. Client `POST`s the encrypted blob to the Pi.
    4. Pi saves the blob to disk, keyed by the hash.

## 3. Sync Flow
1. **Sync Trigger**: User clicks "Sync Vault."
2. **Download**: Client `GET`s `/vault/[vault_hash]`.
3. **Decrypt**: Client decrypts with the `supporter_code`.
4. **Merge**: Client merges remote data with local IndexedDB (Last-Write-Wins based on `timestamp`).
5. **Upload**: Client encrypts the merged state and `POST`s back to the Pi.

## 4. Integration Ecosystem
- **Auth/Link**: QuickCat handles the `quickcat.club/talktype/[code]` redirect to the sync page.
- **Access**: QRBuddy generates a stylized QR code containing the `supporter_code` for one-tap device onboarding.

## 5. Implementation Roadmap
1. [ ] **Pi Drop-zone**: Minimal Node/Fastify server on the Pi to handle `GET`/`POST` for encrypted files.
2. [ ] **Encryption Service**: Extend `licenseCrypto.js` with `encryptData` and `decryptData` (AES-GCM).
3. [ ] **Sync UI**: "Sync" button in History Modal that triggers the handshake.
4. [ ] **QuickCat/QR Integration**: Hooking in the external APIs.

---
*"The best code feels like magic but works like clockwork"*
