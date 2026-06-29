# Design Doc: Bundle Extension with esbuild

## Issue
#22

## Goal
Ship runtime dependencies inside a clean .vsix without manual node_modules injection.

## Current State
- `vsce package --no-dependencies` is used.
- `tsc` emits unbundled ESM that imports from node_modules.
- A manual `.vsix-staging/node_modules` copy step is used to inject runtime deps after packaging.

## Concrete Plan
1. Add `esbuild` (`^0.21.5`) to `packages/extension` devDependencies.
2. Create `packages/extension/esbuild.config.mjs` that bundles `src/extension.ts` and its full dependency tree into a single `out/extension.js`.
   - `platform: 'node'`, `target: 'ES2022'`, `format: 'esm'`.
   - External: `vscode` and Node.js built-ins (`node:*`) only.
   - Pure-JS runtime deps (`@whiskeysockets/baileys`, `telegram`, `instagram-private-api`, `qrcode`, `zod`) are inlined.
   - Source maps are disabled for the shipped bundle.
3. Update `packages/extension/package.json` scripts:
   - `build`: `rm -rf out && node esbuild.config.mjs`
   - `watch`: `node esbuild.config.mjs --watch`
   - `package`: `vsce package` (no `--no-dependencies`)
   - `publish`: `vsce publish` (no `--no-dependencies`)
   - Keep `typecheck` using `tsc --noEmit`.
4. Update `packages/extension/.vscodeignore`:
   - Exclude `src/**`, `**/*.ts`, `**/*.map`, test output, dev configs, and `.vsix-staging/**`.
   - Exclude the entire `node_modules/**` tree; because pure-JS deps are bundled, no runtime node_modules need to be packaged.
   - Include `out/**` and static assets (`media/**`, `icon.png`, `LICENSE`).
5. Validate with `npm install`, `npm run typecheck`, `npm run lint:fix`, `npm run test --workspaces`, `npm run build`, and `npm run package`.
6. Verify the `.vsix` contains `extension/out/extension.js`, installs cleanly, and activates without node_modules injection.

## External vs Bundled Dependencies
- **External**: `vscode` (provided by the extension host) and Node.js built-ins (`node:*`).
- **Bundled**: all direct runtime dependencies are pure JS and will be inlined into `out/extension.js`.
- **Native modules**: the extension currently uses `node:sqlite` (a Node.js built-in), so no native database module needs to be packaged. Any future native dependency must be added to the esbuild `external` list and shipped under `node_modules`.

## Target .vsix Size Budget
< 15 MB. Bundling all pure-JS deps into a single file should keep the package well under this limit.

## Acceptance Criteria
- `vsce package --no-dependencies` is no longer used.
- `.vsix` installs and activates out of the box.
- No manual node_modules injection.
- Size < 15 MB.
- Runtime imports of native/built-in modules remain functional.
