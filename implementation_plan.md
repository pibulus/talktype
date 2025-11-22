# Implementation Plan - Audit Fixes

**Goal:** Address critical issues identified in the audit report to prepare for Netlify deployment.

## User Review Required
> [!IMPORTANT]
> **Storage Strategy**: The current filesystem storage (`fs.writeFileSync`) is incompatible with Netlify.
> I will refactor `unlockCodeStore.js` and `campaignTracker.js` to use a **Storage Adapter** pattern.
> - **Dev**: Continue using Filesystem.
> - **Prod**: We need a persistent store. Do you have a preference? (e.g., Netlify Blobs, Redis, Supabase).
> *For now, I will implement the abstraction so it's easy to plug in a provider later.*

## Proposed Changes

### 🔐 Security Fixes

#### [MODIFY] [authService.js](file:///Users/pabloalvarado/Projects/active/apps/talktype/src/lib/server/authService.js)
- **Fail-Closed**: Throw error or deny access if `API_AUTH_TOKEN` is missing (instead of allowing).
- **Timing Attack Prevention**: Use `crypto.timingSafeEqual` for token comparison.

### ☁️ Serverless Compatibility (Storage Abstraction)

#### [NEW] [storage/index.js](file:///Users/pabloalvarado/Projects/active/apps/talktype/src/lib/server/storage/index.js)
- Export a singleton `storage` instance based on environment (FS for dev, Memory/Error for Prod until configured).

#### [NEW] [storage/FileSystemAdapter.js](file:///Users/pabloalvarado/Projects/active/apps/talktype/src/lib/server/storage/FileSystemAdapter.js)
- Move existing `fs` logic here.

#### [MODIFY] [unlockCodeStore.js](file:///Users/pabloalvarado/Projects/active/apps/talktype/src/lib/server/unlockCodeStore.js)
- Replace direct `fs` calls with `storage.get('unlock-codes')` and `storage.set('unlock-codes', data)`.

#### [MODIFY] [campaignTracker.js](file:///Users/pabloalvarado/Projects/active/apps/talktype/src/lib/server/campaignTracker.js)
- Replace direct `fs` calls with `storage.get('campaign-stats')` and `storage.set('campaign-stats', data)`.

### 🧹 Code Quality

#### [MODIFY] [simpleHybridService.js](file:///Users/pabloalvarado/Projects/active/apps/talktype/src/lib/services/transcription/simpleHybridService.js)
- Detect file extension from MIME type instead of hardcoding `.webm`.

## Verification Plan

### Automated Tests
- Verify `authService` rejects requests when token is missing/wrong.
- Verify `unlockCodeStore` still works locally (using the FS adapter).

### Manual Verification
- User to confirm storage backend preference for production.
