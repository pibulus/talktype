# 🔧 TINKER.md - TalkType Quick Reference

_For when you haven't touched this in 6 months and need to change something NOW_

**ADHD MODE**: Jump to [QUICK WINS](#-quick-wins---80-of-what-youll-change) or [WHEN SHIT BREAKS](#-when-shit-breaks---top-3-fixes)

---

## 🚀 START HERE - RUN THE DAMN THING

### Dev Mode

```bash
# STACK: SVELTEKIT + VITE + TAILWIND + DAISYUI
npm run dev
# Opens: http://localhost:5173 (default Vite port)
```

### Production Build

```bash
npm run build
npm run preview
```

### Run Tests

```bash
npm test              # Run tests once
npm run test:watch    # Watch mode
npm run test:ui       # Visual test UI
npm run test:coverage # Coverage report
```

### Health Check

```bash
npm run lint        # Check code quality
npm run format      # Auto-format code
npm run lighthouse  # Performance audit
```

### Dev Scripts

```bash
npm run list        # List dev script commands
npm run generate    # Generate code/components
npm run parse-prd   # Parse PRD documents
```

---

## 📁 FILE MAP - WHERE SHIT LIVES

```
talktype/
├── src/
│   ├── routes/
│   │   ├── +page.svelte         # Homepage/main view
│   │   └── +layout.svelte       # App wrapper/layout
│   ├── lib/
│   │   ├── components/          # Reusable Svelte components
│   │   ├── transcription/       # Whisper offline transcription
│   │   └── styles/              # Global CSS, Tailwind
│   └── app.html                 # HTML template
├── static/                      # Images, manifest, etc.
├── scripts/                     # Dev scripts (dev.js)
├── docs/                        # Documentation
└── tailwind.config.js          # Tailwind + DaisyUI config
```

### The Files You'll Actually Touch:

1. **src/routes/+page.svelte** - Main app page
2. **src/lib/components/ghost/** - Ghost character (personality + animations)
3. **src/lib/components/whisper/** - **Offline Whisper transcription (THE MAGIC)**
4. **src/lib/components/audio/** - Recording controls
5. **src/lib/components/settings/** - Pro mode, language selection
6. **src/lib/services/** - transcription, theme, PWA logic
7. **tailwind.config.js** - Colors and DaisyUI themes (4 themes: peach/mint/bubblegum/rainbow)
8. **scripts/dev.js** - Dev automation scripts

---

## 🎯 QUICK WINS - 80% OF WHAT YOU'LL CHANGE

### 1. Change the Main Text/Copy

```
File: src/routes/+page.svelte
Look for: <h1> and <p> tags with app title/description
What: Main page copy, headers, button labels
```

### 2. Change Colors/Theme

```
File: tailwind.config.js
Look for: theme: { extend: { colors: {...} } }
Current: Using DaisyUI + Tailwind plugins
Options: Add custom colors or use DaisyUI themes
DaisyUI docs: https://daisyui.com/docs/themes/
```

### 3. Modify Transcription Settings

```
File: src/lib/components/whisper/ (Whisper implementation)
Progressive system:
1. Web Speech API (instant, online-only)
2. distil-tiny (20MB, loads in 2-3s)
3. Auto-selected target:
   - <3GB RAM: distil-small (83MB)
   - ≥3GB RAM: distil-medium (166MB)
   - Pro mode: distil-large-v3 (750MB, 9+ languages)

Key files:
- Whisper component/service files
- Settings.svelte - Pro mode toggle, language selection
- WebGPU support: 10-100x speed boost when available
```

### 4. Change App Name/Title

```
File: src/app.html
Look for: <title>TalkType</title>
Change: Your new app name

Also check: package.json (name field)
And: static/manifest.json (for PWA if exists)
```

---

## 🔧 COMMON TWEAKS

### Add a New Page/Route

```bash
# SvelteKit routing:
Create: src/routes/newpage/+page.svelte
Visit: http://localhost:5173/newpage

# With layout:
Create: src/routes/newpage/+layout.svelte
```

### Change Port

```bash
# Vite default is 5173
# To change, add to package.json dev script:
"dev": "vite dev --port 3000"
```

### Use Dev Scripts

```bash
# Scripts are in scripts/dev.js
npm run list       # See available commands
npm run generate   # Generate boilerplate
npm run parse-prd  # Parse PRD docs
```

### Run Tests

```bash
npm test                # Run all tests
npm run test:ui         # Visual test interface
npm run test:watch      # Auto-rerun on changes
npm run test:coverage   # Check code coverage
```

---

## 💥 WHEN SHIT BREAKS - TOP 3 FIXES

### 1. Port Already in Use

```bash
# Find what's using port 5173:
lsof -i :5173

# Kill it:
kill -9 PID_NUMBER

# Or change port (see "Change Port" above)
```

### 2. Dependencies Fucked

```bash
# Nuclear option:
rm -rf node_modules package-lock.json
npm install

# Try again:
npm run dev
```

### 3. Build Fails

```bash
# Clean everything:
rm -rf dist .svelte-kit node_modules

# Reinstall:
npm install

# Try build:
npm run build
```

---

## 🚦 DEPLOYMENT - SHIP IT

### One-Liner Deploy (Vercel)

```bash
# Install Vercel CLI:
npm i -g vercel

# Deploy:
vercel --prod
```

### Manual Deploy Steps

1. Build it: `npm run build`
2. Test it: `npm test`
3. Preview: `npm run preview`
4. Audit: `npm run lighthouse`
5. Push it: `git push origin main`
6. Deploy: Vercel auto-deploys from GitHub (if connected)

**Note**: Using @sveltejs/adapter-vercel (see package.json)

---

## 🎤 OFFLINE TRANSCRIPTION NOTES

**IMPORTANT**: TalkType has working offline Whisper transcription!

This is the reference implementation that ZipList needs:

- Location: `src/lib/transcription/`
- Working offline AI transcription
- No cloud API required
- Privacy-focused (audio never leaves device)

To port to another app:

1. Copy `src/lib/transcription/` folder
2. Install Whisper dependencies (check package.json)
3. Import transcription service
4. Hook up to voice input component

---

## 📝 NOTES FOR FUTURE PABLO

- **THE REFERENCE APP**: Working offline Whisper - copy this to ZipList!
- **Progressive transcription**:
  - Layer 1: Web Speech API (0ms start, online)
  - Layer 2: distil-tiny (20MB, invisible 2-3s load)
  - Layer 3: Auto-selected distil-small/medium based on RAM
  - Pro mode: distil-large-v3 (750MB, 9+ languages)
- **WebGPU**: 10-100x speed boost when available
- **Distil-Whisper**: 6x faster, 50% smaller than regular Whisper
- **Components to port to ZipList**:
  - src/lib/components/whisper/ = Complete implementation
  - Copy entire folder to ZipList
  - Replace geminiService.js with whisper service
- **Ghost system**:
  - 4 themes: peach, mint, bubblegum, rainbow
  - State animations: idle breathing, recording wobble, processing pulse
  - Eye tracking: Follows cursor subtly
  - See: src/lib/components/ghost/README.md
- **PWA features**:
  - Install prompt after 5 transcriptions
  - Offline support with cached models
  - Full functionality without network
- **Vitest**: Complete test suite (UI, watch, coverage)
- **Dev scripts**: scripts/dev.js (list, generate, parse-prd)
- **Lighthouse**: Performance auditing built-in
- **DaisyUI**: Tailwind component library
- **Svelte 5**: Using latest (check for runes syntax)
- **Vercel adapter**: Production-ready
- **Positioning**: $9 one-time vs competitors' $10+/month subscriptions

### Pablo's Project Quirks:

- **Copy this to ZipList**: src/lib/components/whisper/ folder
- Pro mode toggle: One-time $9 unlock (no subscription BS)
- Multi-language support: 9+ languages in Pro mode
- Privacy-first: All processing local, models cached
- Ghost personality: Companion, not just tool
- Progressive enhancement: Quality improves invisibly as models load
- Smart caching: Models persist across sessions
- RAM detection: Auto-selects optimal model for device

---

## 🎸 TLDR - COPY PASTE ZONE

```bash
# Start working
npm run dev

# Run tests
npm test

# Use dev scripts
npm run list

# Ship it
npm run build
npm run lighthouse
vercel --prod

# When broken
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Quick paths:**

- Main page: `src/routes/+page.svelte`
- Components: `src/lib/components/`
- **Transcription**: `src/lib/transcription/` (THE MAGIC)
- Colors: `tailwind.config.js`
- Dev scripts: `scripts/dev.js`
- Tests: Run `npm run test:ui`

**Key feature:**

- **Offline Whisper transcription** - This is the reference implementation!

---

_Generated for TalkType - The app with working offline transcription 🎤_
