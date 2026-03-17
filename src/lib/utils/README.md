# TalkType Utilities

Shared utility functions used across components and services.

## Files

| File | Purpose |
|------|---------|
| `logger.js` | Dev-only logging via `createLogger(tag)` — silences `log`/`warn` in production, always shows `error` |
| `performanceUtils.js` | `createAnimationController()` for RAF loops with auto-pause on tab hide, `memoize()`, `throttle()`, `createLazyObserver()` for intersection-based lazy loading |
| `scrollUtils.js` | Smooth scroll helpers and scroll position management |
