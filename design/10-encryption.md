# Design Doc: Encrypt SQLite Cache and Bridge Sessions

## Issue
#29

## Goal
Protect local chat history, contacts, and service credentials at rest using an encryption key stored in vscode.SecretStorage.

## Threat Model
- The extension stores chat history, contacts, and session tokens in VS Code global storage.
- An attacker with filesystem access to the user's home directory could read this data.
- We encrypt data before it is written to disk and decrypt it when read.

## Approach
1. Generate or retrieve a single 256-bit master key from vscode.SecretStorage.
2. Use AES-256-GCM via Node crypto for all encryption.
3. Store per-row ciphertext + IV + auth tag for sensitive columns (text, names, titles, usernames, tokens).
4. Encrypt service session files (WhatsApp auth state, Telegram session string, Instagram credentials, iMessage state) before writing to disk; decrypt on load.
5. On account removal, delete both the encrypted cache rows and the encrypted session files.

## Sensitive Data
- Messages: text
- Contacts: displayName, username
- Conversations: title
- Accounts: username, displayName, any stored tokens
- Session files: baileys auth dir, telegram session dir, instagram session cache, imessage state

## Non-Sensitive Data
- IDs, timestamps, foreign keys, booleans, counts

## Open Questions
- Should we switch to sql.js with full-database encryption instead of field-level encryption?
- Performance impact of field-level encryption on large histories.

## Acceptance Criteria
- SecretStorage stores the master key; data files are not readable without it.
- Existing plaintext cache is either migrated or discarded gracefully.
- Account removal wipes keys and data.
- All tests pass.
