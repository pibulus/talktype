# Ghost Icon Reference

This is the current TalkType ghost implementation. The old three-image
`.icon-bg` / `/talktype-icon-bg-gradient*.svg` stack is no longer the runtime
architecture and should not be reintroduced.

## Current Components

- `src/lib/components/ghost/Ghost.svelte`: interactive runtime ghost on the main
  app screen. It handles click-to-record, blinking, eye tracking, recording
  state, processing state, and theme updates.
- `src/lib/components/ghost/DisplayGhost.svelte`: static display ghost for
  settings previews and small decorative instances.
- `src/lib/components/ghost/ghost-paths.svg`: shared SVG symbol/path source for
  body, outline, and eyes.
- `src/lib/components/ghost/gradients.js`: canonical gradient definitions and
  theme-to-gradient mapping.
- `src/lib/components/ghost/GradientDefs.svelte`: reusable runtime gradient
  definitions for the interactive ghost.
- `src/lib/components/ghost/themeStore.js`: theme color configuration and global
  CSS-variable generation.
- `src/lib/components/ghost/personality.js`: tiny deterministic daily motion
  settings and rare special-animation selection.

## Theme Flow

1. `ThemeSelector.svelte` renders each option with `DisplayGhost`.
2. `Settings.svelte` calls `applyTheme(vibeId)`.
3. `src/lib/index.js` stores the selected theme in `talktype-vibe`.
4. `GhostContainer.svelte` passes the `theme` store to `Ghost.svelte` as
   `externalTheme`.
5. `Ghost.svelte` subscribes to the store, validates the value, and updates the
   active gradient id.

`DisplayGhost.svelte` does not subscribe to the app theme store. It receives a
direct `theme` prop and generates instance-specific gradient ids from `seed` so
multiple preview ghosts can render on the same page without SVG id collisions.

## Layering

The ghost SVG is built from three layers:

1. Body fill: `#ghost-background`, filled with `url(#...gradient)`.
2. Outline: `#ghost-body-path`, filled black.
3. Eyes: `#ghost-eye-left-path` and `#ghost-eye-right-path`, filled black.

Black fills are correct for outline and eyes only. If the whole ghost appears
black, the body gradient is not resolving.

## Rules For Future Changes

- Do not use `.icon-bg`.
- Do not swap `/talktype-icon-bg-gradient*.svg` image files.
- Do not manually query and mutate ghost DOM to change themes.
- Do not reuse static SVG gradient ids across several preview ghosts.
- Keep `currentTheme` initialized to `peach` in `Ghost.svelte`; this prevents a
  black fallback flash before subscriptions settle.
- Use `DisplayGhost.svelte` for settings, modals, and previews.
- Use `Ghost.svelte` only for the interactive mascot.
- If adding a theme, update `gradients.js`, `themeStore.js`, and the settings
  theme list together.

## Recording State

The main ghost emits `talktype:toggle-recording` when clicked. `MainContainer`
handles that event and calls the recording controls through `ContentContainer`.

Recording visuals are state-driven:

- `GhostContainer.svelte` passes `isRecording` and `isProcessing`.
- `Ghost.svelte` syncs those props into `ghostStateStore`.
- Recording glow is applied through the ghost recording class and the wrapper
  CSS in `GhostContainer.svelte`.

Avoid direct imperative calls for recording glow or wobble unless a component is
already part of the ghost animation service.

## Personality Motion

The interactive ghost gets small daily motion differences from the local
calendar date plus the component `seed`. These values only set CSS variables for
the idle float: horizontal drift, vertical lift, tilt, scale, speed, and phase.
They must stay subtle.

Rare special animations are selected in `animationService.js` through
`personality.js`. The normal spin remains the primary special; the extras are a
quick one-eye peek and a tiny shimmy. Keep new specials transform/opacity only,
short, and compatible with `prefers-reduced-motion`.

## Troubleshooting

**Theme changes only after reload**

- Verify `GhostContainer.svelte` still passes `externalTheme={appTheme}`.
- Verify `Ghost.svelte` is subscribing to store-like `externalTheme` values.
- Check that no code is trying to change old image `src` values.

**Settings previews are black silhouettes**

- Check `DisplayGhost.svelte` has a direct `theme` prop.
- Check `resolvedGradientId` points at a gradient declared in the same SVG.
- Check that `seed` values produce unique but valid SVG ids.

**Runtime ghost is all black**

- The outline and eyes are expected to be black, but the body should use
  `fill="url(#{gradientId})"`.
- Confirm `GradientDefs.svelte` is present inside the runtime SVG defs.
- Confirm the selected theme maps to a known gradient id in `gradients.js`.

**Blink affects the whole ghost**

- Blink transforms should target only the eye path refs.
- Do not apply blink classes or transforms to the whole SVG or body group.

## Quick File Map

- Main screen wrapper: `src/lib/components/page/GhostContainer.svelte`
- Interactive ghost: `src/lib/components/ghost/Ghost.svelte`
- Settings preview ghost: `src/lib/components/ghost/DisplayGhost.svelte`
- Settings option list: `src/lib/components/settings/ThemeSelector.svelte`
- Theme store and persistence: `src/lib/index.js`
- Gradient definitions: `src/lib/components/ghost/gradients.js`
- Daily motion/personality helpers: `src/lib/components/ghost/personality.js`
