# Ghost Components

This folder contains the runtime ghost implementation used by TalkType.

The current source of truth is [docs/ghost-icon-reference.md](../../../../docs/ghost-icon-reference.md). Keep implementation details there so theme, SVG, recording-state, and settings-preview guidance stays in one place.

## Runtime Files

- `Ghost.svelte`: interactive main mascot and click-to-record affordance.
- `DisplayGhost.svelte`: display-only ghost for settings previews, modals, and transcript decoration.
- `ghost-paths.svg`: shared body, outline, and eye paths.
- `gradients.js` and `GradientDefs.svelte`: runtime gradient definitions.
- `themeStore.js`: persisted theme state and CSS-variable generation.
- `ghostStateStore.js`: animation state, recording state, wobble, sleep, and wake behavior.

Do not reintroduce old static icon-image theme swapping. The ghost is SVG-path based and should resolve its fill through the current gradient flow.
