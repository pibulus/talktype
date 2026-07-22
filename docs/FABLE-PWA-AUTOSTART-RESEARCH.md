# PWA Auto-Start Recording — Research + POC (2026-07-18)

**Question:** Can an installed PWA (TalkType/ZipList/RiffRap/DaySay) auto-start recording
or trigger an action WITHOUT the user tapping a button inside the app first?

**Short answer:** True zero-interaction mic capture is not possible in any browser, by
design, and that will not change — getUserMedia is gated on a _permission grant_, and on
iOS that grant does not reliably persist. But "one OS-level tap → already recording" IS
possible today on Android/desktop Chromium, and **TalkType already ships most of the
wiring for it** (manifest shortcut + `?action=record` auto-start, added in commit
`2e4349c "Improve PWA install and auto-start flows"`). This session verified the
mechanism, researched the 2026 support landscape, and added a notification-click launch
path as a POC on branch `fable-pwa-autostart-2026-07-18`.

Research date: 2026-07-18. Sources checked live (support tables shift; do not trust
training-data vintage claims about PWA capabilities).

---

## Verdicts per angle

### 1. Manifest `shortcuts` → deep link that auto-starts on load

**POSSIBLE (Android/Chromium) / NOT POSSIBLE (iOS).**
Long-press app icon → "Record" → app opens at `/?action=record` → `getUserMedia` fires on
mount. Crucially, `getUserMedia` does **not** require transient activation (kept
gesture-free for web compat — confirmed via [w3c/mediacapture-extensions#11](https://github.com/w3c/mediacapture-extensions/issues/11)
and [addpipe's 2026 getUserMedia guide](https://blog.addpipe.com/getusermedia-getting-started/)),
so if the mic permission was previously granted with "Allow" (persistent), recording
starts with zero in-app taps. Supported on Chrome/Edge/Samsung on Android (WebAPK) and
desktop Chromium. **iOS: the `shortcuts` member is still not supported in iOS 26** — no
long-press menu for home-screen web apps ([firt.dev iOS PWA compat](https://firt.dev/notes/pwa-ios/),
[MagicBell iOS PWA guide 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)).
iOS 26's big change is that _every_ Add-to-Home-Screen site opens as a web app by default
([mjtsai on Web Apps in iOS 26](https://mjtsai.com/blog/2025/10/03/web-apps-in-ios-26/)) —
nice, but it adds no shortcut/menu surface.
**Status in TalkType: ALREADY SHIPPED on main** (manifest shortcut "Start Recording" →
`/?action=record&source=shortcut`, handled by `getAutoStartSource()` in
`src/lib/components/page/MainContainer.svelte`).

### 2. Web Share Target (share TO TalkType)

**POSSIBLE WITH CAVEATS (Android/Chromium only).**
`share_target` in the manifest can register TalkType in the OS share sheet — including
receiving **audio files** via `method: POST` + `enctype: multipart/form-data` + a service
worker fetch handler ([MDN share_target](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target)).
"Share a voice memo → TalkType transcribes it" is a real, buildable feature on Android.
**Not Baseline**: no Safari/iOS support (open WebKit bug [#194593](https://bugs.webkit.org/show_bug.cgi?id=194593)
since 2019), no Firefox. Different use case than auto-record (receiving, not capturing) —
worth building later as an Android-only enhancement, NOT built in this POC (kept minimal).

### 3. Badging / Periodic Background Sync / Background Fetch

**NOT POSSIBLE for mic; POSSIBLE as "re-engage then one-tap" glue.**
None of these grant mic access — `getUserMedia` needs a window client, never a service
worker. Current support: Badging works on iOS/iPadOS 16.4+ but only for installed web
apps **with notification permission granted** ([WebKit badging post](https://webkit.org/blog/14112/badging-for-home-screen-web-apps/));
Periodic Background Sync is Chromium-only (no Safari/Firefox, unlikely soon —
[MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Periodic_Background_Synchronization_API)).
The useful pattern here is angle 6's: a notification whose tap lands the user in an
already-arming app.

### 4. iOS PWA mic reality (2026)

**POSSIBLE WITH CAVEATS — the caveat is permission persistence, not the API.**
`getUserMedia` works in installed home-screen web apps (since the iOS 13.x era;
[WebKit bug #185448](https://bugs.webkit.org/show_bug.cgi?id=185448) long fixed). But
iOS/WebKit treats mic grants as per-session by default: Safari 18+ offers one-time vs
persistent grants, and in practice WebKit **re-prompts per session** for camera/mic, and
standalone web apps have been observed re-prompting even on hash changes
([WebKit bug #215884](https://bugs.webkit.org/show_bug.cgi?id=215884),
[Scandit FAQ on iOS re-prompting](https://support.scandit.com/hc/en-us/articles/360008443011-Why-does-iOS-keep-asking-for-camera-permissions)).
Installed-PWA vs Safari-tab makes no meaningful difference to mic persistence. Net: on
iOS the floor is "tap icon → tap Allow (most sessions) → recording". TalkType's existing
auto-start already handles this gracefully — when the silent attempt can't complete, it
arms a **first-tap-anywhere starts recording** listener, which is the correct iOS
fallback (one generous tap target instead of a small button).

### 5. OS-level widgets / iOS Shortcuts app / Android App Actions

**NOT POSSIBLE for a pure PWA (needs a native wrapper), with one honest partial.**

- iOS: home-screen web apps are not exposed to the Shortcuts app's "Open App" action, get
  no widgets, no Siri, no Quick Actions. A Shortcuts "Open URL" automation opens the URL
  in the **browser**, not the installed web app — with `?autostart=1` that still
  auto-arms/starts in the Safari tab, which is a usable consolation trick, but it is not
  "opens the installed app". Real widgets/Quick Actions/Siri need a native (or
  store-published PWABuilder-style) wrapper — that's the honest boundary.
- Android: App Actions/widgets are native-app surfaces (require an APK/TWA). But Android
  doesn't need them for this use case — angle 1's long-press shortcut already gives
  one-tap record. (You can also pin a _browser-created_ home-screen shortcut directly to
  the deep-link URL.)
- Desktop: PWA widgets exist only as an experimental Edge/Windows 11 Widgets Board thing
  ([Microsoft Edge docs](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/widgets)) — irrelevant here.

### 6. Notification tap → open app → recording (persisted permission + SW)

**POSSIBLE (Chromium, zero in-app taps) / POSSIBLE WITH ONE EXTRA TAP (iOS).**
A `notificationclick` handler can focus/open the app on `/?action=record`. Since
`getUserMedia` needs no gesture (angle 1) and Chromium persists "Allow", the tap on the
notification is the only tap. On iOS 16.4+ notification taps do open the installed web
app ([WebKit web push post](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)),
but the per-session mic prompt (angle 4) usually adds one "Allow" tap. **Built in this
POC** — see below. Caveat: to fire notifications while the app is _closed_ you need Web
Push (server-sent); a locally-scheduled `showNotification` only works while the SW can
run. The handler covers both trigger types identically.

---

## What the POC on this branch does

Branch: `fable-pwa-autostart-2026-07-18` (main untouched). Build verified green
(`npm run build`, adapter-node).

1. **`src/service-worker.js`** — new `notificationclick` handler: closes the
   notification, focuses an existing TalkType window and navigates it to
   `/?action=record&source=notification`, or opens a new one. Reuses the existing
   auto-start wiring; no app-side changes needed.
2. **`src/lib/components/page/MainContainer.svelte`** — `?autostart=1` accepted as an
   alias for `?action=record` (friendlier for hand-built deep links / iOS Shortcuts
   automations), and `source=notification` reported distinctly for future analytics.

Pre-existing on main (verified, not re-built): manifest `shortcuts` entry, the
`getAutoStartSource()` / `attemptAutoStart()` machinery with its gesture-retry and
visibility-retry fallbacks, and the settings-level "auto-record on every launch" toggle
(`talktype_auto_record`).

### How to test

**Android (Chrome) — the headline flow:**

1. Visit talktype.app (or a deployed build of this branch), tap ⋮ → _Add to Home screen_
   → _Install_.
2. Open it once, start a recording manually, choose **"Allow" (While using / every
   visit)** — not "Only this time" — at the mic prompt.
3. Close the app. **Long-press the home-screen icon → tap "Record".**
4. Expected: app opens and is already recording. One OS tap, zero in-app taps.

**Notification path (this branch's POC, Android/desktop Chromium):**

1. In the installed app, grant notification permission (DevTools console is fine for the
   POC): `Notification.requestPermission()`.
2. Fire a test notification:
   `navigator.serviceWorker.ready.then(r => r.showNotification('TalkType', { body: 'Tap to start recording' }))`
3. Background/close the app, tap the notification.
4. Expected: app focuses/opens on `/?action=record` and starts recording (given step 2 of
   the Android flow above was done once).

**iOS (installed web app):**

1. Safari → Share → Add to Home Screen (iOS 26 installs it as a web app by default).
2. There is no long-press shortcut menu (expected — unsupported). Open the app with the
   auto-record setting on, or via a deep link `https://talktype.app/?autostart=1`.
3. Expected: mic permission prompt most sessions; after "Allow", recording starts. If the
   silent attempt is blocked, the first tap anywhere on the page starts recording (the
   existing gesture-retry fallback).

### Real limitations (unhyped)

- Zero-tap-from-cold-start does not exist and will not: mic capture is permission-gated
  precisely so a page can never silently record. That privacy model is the product's
  friend — lean into "one tap and you're live", don't fight the sandbox.
- The Chromium zero-in-app-tap flow depends on the user having picked persistent "Allow"
  once; "Only this time" users get a prompt again (Chrome M116+ one-time permissions).
- iOS: no shortcuts member, no share target, no widgets/Siri/Shortcuts-app integration
  for web apps; per-session mic prompts are the norm. A native wrapper (Capacitor or
  similar) is the only route to iOS lock-screen/widget/Action-button "record now".
- Notification-triggered record while the app is fully closed requires real Web Push
  (server involvement); the POC proves the tap→record mechanism with a local
  notification.

---

## Final recommendation

**Ship the Android story now; it's already 95% built.** The best achievable "auto-start"
is: _long-press TalkType's icon → "Record" → app opens already recording_ (plus the
existing auto-record-on-open setting for people who want every open to start listening).
That's on main today — the remaining work is not code, it's (a) an on-device pass on a
real Android phone to confirm the persisted-permission flow end-to-end, and (b) telling
users it exists (an install-flow hint: "Pro move: long-press the icon").

On iOS, be honest in-product: auto-record-on-open + first-tap-anywhere is the ceiling for
a web app, and that's still a good experience — icon tap, one "Allow", talking. If Pablo
ever wants the literal Action-button/widget/Siri "record now" on iPhone, that's a
Capacitor-wrapper project (Kit's territory), not a PWA tweak.

Merge-worthy from this branch: the `notificationclick` handler + `?autostart=1` alias are
small, harmless, and open the door to a later "remind me to journal → tap → recording"
feature. The share-target (angle 2) is the best _next_ research-to-feature candidate:
"share any voice memo to TalkType to transcribe it" on Android.
