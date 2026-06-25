# AGENTS.md — mssgs

## Project structure

- `packages/extension/` — VSCode extension host (TypeScript, Node).
- `packages/webview/` — React UI built with Rsbuild.
- Root is an npm workspace.

## Tooling

- **Lint / format:** Biome (`npm run lint`, `npm run lint:fix`).
- **Type check:** `npm run typecheck`.
- **Test:** `npm run test`.
- **Package:** `npm run package` produces a `.vsix`.

## Commits

Use Conventional Commits. Husky runs Biome on staged files.

## Spec workflow

Each spec is tracked in a GitHub Issue and developed in a branch `spec/NN-slug` using a git worktree under `.worktrees/`.
