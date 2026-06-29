# Design Doc: Harden iMessage Backend

## Issue
#34

## Goal
Make iMessage work on macOS for public users.

## Changes
- Gate iMessage on macOS only; show a clear error on other platforms.
- Detect locked `chat.db` (Messages app open) and retry with exponential backoff.
- Detect group chats vs DMs by counting handles per chat via `chat_handle_join`.
- Surface Full Disk Access failures with an actionable message.
- Sender names fall back to the handle; full Contacts.app resolution is future work.

## Acceptance Criteria
- macOS-only gating.
- Locked DB handled gracefully.
- Group chats are detected.
- Full Disk Access errors explain what to do.
