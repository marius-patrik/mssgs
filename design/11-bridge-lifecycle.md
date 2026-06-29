# Design Doc: Refactor Bridge Lifecycle

## Issue
#30

## Goal
Make every backend reliable, leak-free, and safe to remove.

## Changes

### logout()
- Added `logout()` to the `BridgeConnection` interface.
- Implementations:
  - WhatsApp: calls `socket.logout()` and deletes the encrypted auth state file.
  - Telegram: invokes `auth.LogOut` and deletes the encrypted session file.
  - Instagram: calls `account.logout()` and clears in-memory credentials.
  - iMessage: stops polling and clears cached rooms.

### Safe Account Removal
- `removeAccount` handler now awaits `connection.logout()` instead of only disconnecting.
- Encrypted session files are deleted for WhatsApp and Telegram.
- Cache rows for the account are deleted.

### Deterministic IDs
- Replaced the 32-bit `stableUuid` implementation with a SHA-256-based deterministic UUID.
- Conversation, contact, and message IDs are derived from the service-side IDs, avoiding collisions.

## Future Work
- Centralize reconnection with exponential backoff and a max retry ceiling.
- Add a per-account reconnect supervisor that monitors `statusChanged` events.
