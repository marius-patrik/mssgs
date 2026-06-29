# Design Doc: Harden Telegram (GramJS) Backend

## Issue
#32

## Goal
Make Telegram reliable for public users.

## Changes
- Persist encrypted StringSession across VS Code reloads (already in #29).
- Add a `NewMessage` event handler so incoming messages update the webview in real time.
- Add a 2FA/password callback during login.
- Surface rate-limit errors as bridge errors without crashing.

## Acceptance Criteria
- Phone + API id/hash login works.
- Session persists across reloads.
- Real-time message updates work.
- Rate-limit errors are surfaced.
- Account removal deletes the encrypted session file.
