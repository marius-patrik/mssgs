# Design: Replace `node:sqlite` with `better-sqlite3`

## Problem

`node:sqlite` is only available in Node.js ≥ 22. VS Code 1.90+ ships with Node 20 / Electron, so the `mssgs` extension fails to activate on current stable VS Code when any code path touches SQLite.

## Goal

Replace every usage of `process.getBuiltinModule('node:sqlite')` with the `better-sqlite3` package so the extension runs on VS Code 1.90+ without requiring Node 22.

## Scope

- `packages/extension/src/cache/SqliteCache.ts`
- `packages/extension/src/cache/migrations.ts`
- `packages/extension/src/backend/imessage/IMessageConnection.ts`

Out of scope: webview, other backends, CI release pipeline (bundler work is PR #26).

## Concrete implementation plan

1. Add `better-sqlite3` to `packages/extension/package.json` dependencies.
2. Add `@types/better-sqlite3` to `packages/extension/package.json` devDependencies.
3. Update root `package.json` `allowScripts` to permit the `better-sqlite3` install script (already present for `better-sqlite3@11.10.0`).
4. Replace `DatabaseSync` type with `Database` from `better-sqlite3`.
5. Replace `process.getBuiltinModule('node:sqlite')` dynamic import with a static `import Database from 'better-sqlite3'`.
6. Keep SQL schemas, table names, triggers, migrations, and public method signatures unchanged.
7. Keep the transaction/savepoint helper in `SqliteCache` unchanged; `better-sqlite3` `Database#exec` accepts the same SQL.
8. Run `npm install`, verify the prebuild downloads for the host platform.
9. Run `npm run typecheck`, `npm run lint:fix`, `npm run test --workspaces`.
10. Build a `.vsix` and install it into VS Code with `--extensions-dir /Users/user/.vscode/extensions` to verify activation.
11. Commit and push to `origin/feat/21-better-sqlite3`.
12. Update PR #25 description with the changes and test results.

## Packaging note

`.vscodeignore` currently excludes `node_modules/**`. Because `better-sqlite3` contains a native binding, it cannot be bundled as pure JS. PR #26 is expected to introduce a bundler that handles native modules / prebuilds. For this PR we focus on correctness: the host `npm install` must resolve and download the correct `better-sqlite3` prebuild so development and local testing work. If the packaged `.vsix` cannot load `better-sqlite3` without the bundler change, that blocker will be documented in the PR description.

## Acceptance criteria

- No `node:sqlite` or `process.getBuiltinModule('node:sqlite')` references remain in the repository.
- `SqliteCache` and the iMessage backend compile and all workspace tests pass.
- Extension activates without `node:sqlite` errors on VS Code 1.90+.
