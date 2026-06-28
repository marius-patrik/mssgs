# Design Doc: Replace node:sqlite with better-sqlite3

## Issue
#21

## Goal
Remove the Node-22-only `node:sqlite` dependency so the extension activates on current stable VS Code.

## Current State
- `SqliteCache` and `IMessageConnection` call `process.getBuiltinModule('node:sqlite')`.
- `engines.vscode` is `^1.90.0` (Node 20).

## Proposed Change
1. Add `better-sqlite3` as a runtime dependency.
2. Acquire platform-specific prebuilds during `npm install` / CI.
3. Replace `DatabaseSync` usage with `better-sqlite3` synchronous API.
4. Update `SqliteCache` constructor and all query methods.
5. Update iMessage backend to open `chat.db` via `better-sqlite3`.
6. Update CI to build/package for darwin/win/linux arm64/x64.

## Open Questions
- Minimum VS Code version after bundling native prebuilds?
- Do we bundle prebuilds for all platforms or download at install time?

## Acceptance Criteria
- No `node:sqlite` references.
- Tests pass.
- `.vsix` installs and activates on VS Code 1.90+.
