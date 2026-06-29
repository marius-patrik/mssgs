# Design Doc: Harden WhatsApp (Baileys) Backend

## Issue
#31

## Goal
Make WhatsApp reliable for public users.

## Changes
- Listen to `messaging-history.set` so history-synced chats appear on fresh pairing.
- Preserve existing auto-repair behavior when no rooms are received after 45 seconds.
- Keep reconnection logic but suppress automatic reconnect after `loggedOut`.
- Ensure `logout()` wipes the encrypted auth state.

## Acceptance Criteria
- Fresh pairing shows conversations after the history sync.
- Reconnect with existing session does not require a new QR scan.
- Device-disconnected / logged-out errors are surfaced gracefully.
