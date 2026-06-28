# Design Doc: Bundle Extension with esbuild

## Issue
#22

## Goal
Ship runtime dependencies inside a clean .vsix without manual node_modules injection.

## Current State
- `vsce package --no-dependencies` is used.
- `tsc` emits unbundled ESM that imports from node_modules.
- Manual `.vsix-staging/node_modules` copy step exists.

## Proposed Change
1. Add `esbuild` to extension dev dependencies.
2. Create `esbuild.config.js` that bundles `src/extension.ts` into `out/extension.js`.
3. Keep native modules (better-sqlite3, sharp, etc.) as external and include their prebuilds.
4. Inline pure JS deps (baileys, telegram, qrcode, zod) where possible.
5. Update `package` script to `vsce package` without `--no-dependencies`.
6. Clean `.vscodeignore` so node_modules/src/tests/source maps are excluded.

## Open Questions
- Which deps must stay external due to native code or dynamic requires?
- Target .vsix size budget (< 15 MB).

## Acceptance Criteria
- `.vsix` installs and runs out of the box.
- No manual node_modules injection.
- Size < 15 MB.
