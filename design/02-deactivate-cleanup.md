# Design Doc: Proper deactivate() and Resource Cleanup

## Issue
#23

## Goal
Stop leaking SQLite DB handles, bridge sockets, timers, and webview listeners on reload/uninstall.

## Current State
- `deactivate()` is a no-op.
- `SqliteCache.close()` exists but is never called.
- Bridge connections and poll timers are not disposed.
- Errors go only to `console.error`.

## Proposed Change
1. Implement `deactivate()`: close cache, disconnect all connections, stop scheduler/poll timers.
2. Add bridge connections and cache to `context.subscriptions`.
3. Fix webview listener disposal in `WebviewManager` and `MessengerViewProvider`.
4. Create an `mssgs` OutputChannel at activation and route errors/logs through it.
5. Add request-error handling so unhandled bus errors are logged.

## Acceptance Criteria
- Reloading/disabling does not leak processes or file handles.
- mssgs OutputChannel shows bridge/cache logs.
