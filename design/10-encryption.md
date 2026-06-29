# Design Doc: Encrypt SQLite Cache and Bridge Sessions

## Issue
#29

## Goal
Protect local chat history and service credentials at rest using an encryption key stored in `vscode.SecretStorage`.

## Threat Model
- The extension stores chat history and session tokens in VS Code global storage.
- An attacker with filesystem access to the user's home directory could read this data.
- We encrypt data before it is written to disk and decrypt it when read.

## Implementation

### Master Key
- `EncryptionService` retrieves or creates a 256-bit key from `vscode.SecretStorage`.
- The key is generated with `crypto.randomBytes(32)`.
- All encryption uses AES-256-GCM with a random IV and 128-bit auth tag.

### SQLite Cache Encryption
- The cache is an ordinary `better-sqlite3` database while the extension is running.
- When the extension closes the cache (`deactivate()` or account removal), it exports the database to an encrypted file (`mssgs.sqlite.enc`) and deletes the plaintext `mssgs.sqlite`.
- On the next activation, if `mssgs.sqlite` is missing and `mssgs.sqlite.enc` exists, the cache is decrypted before opening.
- This provides encryption-at-rest whenever the extension is not running.

### Bridge Session Encryption
- **Telegram**: the GramJS `StringSession` is saved and encrypted to `telegram-{accountId}.enc` on disconnect; decrypted on connect.
- **WhatsApp**: the Baileys `AuthenticationState` is serialized to JSON and encrypted to `baileys-{accountId}.enc` on every creds/key change.
- **Instagram / iMessage**: no persistent session files in v1. Credentials are not stored.

### SecretStorage Mock
- Tests use an in-memory `vscode.SecretStorage` mock so `activate()` can create the encryption service.

## Acceptance Criteria
- [x] Master key lives in `vscode.SecretStorage` and never leaves the extension host.
- [x] Cache file is stored as an encrypted blob at rest.
- [x] Telegram and WhatsApp sessions are encrypted at rest.
- [x] All existing tests pass.
- [x] Extension packages successfully.

## Future Work
- Encrypt the SQLite database while running (e.g., SQLCipher) if required by a stricter threat model.
- Reduce native dependency size by trimming better-sqlite3 source files from the .vsix.
