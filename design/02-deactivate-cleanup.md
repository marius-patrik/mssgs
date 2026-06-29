# Design Doc: Proper `deactivate()` and Resource Cleanup

## Issue
#23

## Goal
Ensure the mssgs VS Code extension does not leak SQLite DB handles, bridge sockets, timers, or webview event listeners when the extension is reloaded or uninstalled.

## Current State
- `deactivate()` in `packages/extension/src/extension.ts` is a no-op.
- The SQLite cache is created during activation but never explicitly closed.
- Bridge connections (`BaileysConnection`, `TelegramConnection`, `InstagramConnection`, `IMessageConnection`) are stored in local `Map`s and never disconnected on shutdown.
- `BaileysConnection` schedules reconnect and history-sync timers that are not cancelled on `disconnect()`.
- `IMessageConnection` has a poll interval that is already cleared in `disconnect()`, but the connection is never asked to disconnect on deactivation.
- Console logging from backends and cache goes to the debug console instead of a dedicated `mssgs` output channel.

## Proposed Change
1. **Module-level extension state**
   - Track the cache, active connections, pending wizard connections, bridge event-listener unsubscribe handles, and the `mssgs` output channel so they are reachable from `deactivate()`.

2. **`mssgs` output channel**
   - Create `vscode.window.createOutputChannel('mssgs')` at activation.
   - Push the channel to `context.subscriptions` so VS Code disposes it automatically.
   - Provide a small `Logger` interface (`log`/`error`) to `SqliteCache` and each `BridgeConnection` so backend and cache diagnostics are visible in the channel.

3. **Cleanup disposable**
   - Add a single disposable to `context.subscriptions` that:
     - unsubscribes all bridge event listeners,
     - disconnects every active and pending bridge,
     - closes the SQLite cache.
   - Implement `deactivate()` to call the same cleanup routine, guarded by a flag so double-disposal is safe.

4. **Bridge cleanup improvements**
   - `BaileysConnection`: store reconnect and history-check `setTimeout` handles and clear them in `disconnect()`.
   - `IMessageConnection`: already clears its poll interval in `disconnect()`; ensure it is invoked.
   - All backends accept an optional logger and replace direct `console.log`/`console.error` calls with logger calls.

5. **Cache cleanup improvements**
   - `SqliteCache` accepts an optional logger.
   - `close()` is already present; make it safe to call more than once.

## Acceptance Criteria
- `deactivate()` closes the SQLite DB and disconnects all bridges.
- No leaked timers or file locks after extension reload.
- The `mssgs` output channel is visible in VS Code and shows bridge/cache log output.
- `npm run typecheck`, `npm run lint:fix`, `npm run test --workspaces`, and `npm run build` pass.
