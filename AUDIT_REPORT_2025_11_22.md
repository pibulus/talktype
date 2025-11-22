# Project Audit Report

**Date:** 2025-11-22
**Focus:** Recent commits, Tech Debt, Security, Duplication

## 🚨 Critical Issues (Serverless Compatibility)

The project is being prepared for Netlify ("prep netlify-ready release"), but several core components rely on local filesystem writes, which **will not work** in a serverless environment like Netlify Functions.

### 1. Filesystem Dependency
- **File:** `src/lib/server/unlockCodeStore.js`
- **File:** `src/lib/server/campaignTracker.js`
- **Issue:** These modules use `fs.writeFileSync` to store data in `src/lib/server/data`.
- **Impact:** On Netlify, the filesystem is read-only (except `/tmp`). Writes will fail, or if they succeed in `/tmp`, data will be lost immediately after the function finishes. **Unlock codes and campaign sales will not be saved.**
- **Recommendation:** Move to a persistent data store (Supabase, Firebase, Redis, or even a simple KV store like Vercel KV or Netlify Blobs).

### 2. In-Memory Rate Limiting
- **File:** `src/lib/server/rateLimiter.js`
- **File:** `src/lib/server/fileStore.js`
- **Issue:** `fileStore.js` implements an in-memory `Map`, not a file store. `rateLimiter.js` uses this for tracking requests.
- **Impact:** In serverless, memory is not shared between function instances and is recycled frequently. Rate limiting will be effectively disabled or highly inconsistent.
- **Recommendation:** Use a shared store (Redis/KV) for rate limiting, or accept that it's only "per-instance" protection.

## 🔐 Security Findings

### 1. Fail-Open Authentication
- **File:** `src/lib/server/authService.js`
- **Issue:** If `API_AUTH_TOKEN` is not set in the environment, `guardRequest` returns `null` (allowing the request).
- **Risk:** If the environment variable is accidentally omitted in production, the API becomes public without warning.
- **Recommendation:** Change to "Fail-Closed". If auth is expected but config is missing, deny the request or log a critical warning.

### 2. Token Comparison
- **File:** `src/lib/server/authService.js`
- **Issue:** Uses simple string comparison (`token !== authToken`).
- **Risk:** Theoretically vulnerable to timing attacks.
- **Recommendation:** Use `crypto.timingSafeEqual` for token verification.

## ♻️ Duplication & Code Quality

### 1. Storage Logic Duplication
- **Files:** `unlockCodeStore.js` vs `campaignTracker.js`
- **Issue:** Both implement nearly identical logic for checking directories, reading JSON, and writing JSON.
- **Recommendation:** Extract a shared `JsonStore` adapter (though this should be replaced by a DB adapter anyway).

### 2. Misleading Naming
- **File:** `src/lib/server/fileStore.js`
- **Issue:** Named `fileStore` but implements an in-memory `Map`.
- **Recommendation:** Rename to `memoryStore.js` or implement actual persistence.

### 3. Hardcoded Extensions
- **File:** `src/lib/services/transcription/simpleHybridService.js`
- **Issue:** `formData.append('audio_file', audioBlob, ...)` hardcodes `.webm` extension.
- **Impact:** If the browser sends MP4 or WAV, the filename will be misleading.

## 📝 Summary
The most urgent issue is the **filesystem usage**. The app will likely break or lose data immediately upon deployment to Netlify. The "Netlify-ready" goal is currently blocked by this architecture.
