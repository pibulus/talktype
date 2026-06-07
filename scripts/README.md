# Scripts

This directory holds the project scripts that are still maintained.

## Current Scripts

- `deploy-pi.sh`: builds the app, stages it on the Raspberry Pi target, runs a smoke check, and swaps the staged build into place.
- `package-extension.sh`: packages the sibling `../talktype_extension/src` folder into `static/downloads/talktype-extension.zip` for the manual install page.
- `codex/init.sh`: local Codex setup helper.

## npm Entry Points

- `npm run deploy:pi`: runs `scripts/deploy-pi.sh`.
- `npm run build`: production build used by deploy and local verification.
- `npm run lint`: Prettier check plus ESLint.
- `npm test -- --run`: one-shot Vitest run.
