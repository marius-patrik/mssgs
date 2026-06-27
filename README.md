# mssgs

A Beeper-inspired unified messenger built as a Visual Studio Code extension. mssgs brings conversations from multiple chat services into a single sidebar, letting you read and reply without leaving your editor.

## Features

- **Unified inbox** — One conversation list for all connected accounts.
- **Multiple backends** — Built-in Matrix support with a pluggable connection manager.
- **Thread view** — Read messages and compose replies in a focused thread panel.
- **Account wizard** — Guided setup for new chat accounts.
- **Cross-service detection** — Automatically detects which service a contact or room belongs to.
- **Beeper-like extras** — Favorites, pinned conversations, search shortcuts, reminders, and scheduled messages.
- **SQLite cache** — Local storage for conversations and messages.
- **Keyboard shortcuts** — Quick commands for search, new conversations, pinning, archiving, and more.

## Installation

### From the Visual Studio Marketplace

1. Open VSCode.
2. Go to the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Search for **mssgs**.
4. Click **Install**.

### From a `.vsix` file

```bash
code --install-extension mssgs-0.1.0.vsix
```

Or open VSCode, go to Extensions → `...` → **Install from VSIX...** and select the file.

## Usage

1. Open the **mssgs** view from the activity bar (chat icon).
2. Run **mssgs: Add Account…** from the command palette to connect an account.
3. Select a conversation in the inbox to open the thread.
4. Use the command palette or keyboard shortcuts for quick actions:
   - `Ctrl+Shift+Alt+S` — Focus search
   - `Ctrl+Shift+Alt+N` — New conversation
   - `Ctrl+Shift+Alt+P` — Toggle pin
   - `Ctrl+Shift+Alt+F` — Toggle favorite
   - `Ctrl+Shift+Alt+A` — Archive selected conversation
   - `Ctrl+Shift+Alt+R` — Set reminder
   - `Ctrl+Shift+Alt+M` — Schedule message

## Development setup

### Requirements

- Node.js >= 20
- npm >= 10
- Python 3 (for smoke-test server)

### Install dependencies

```bash
npm install
```

### Build

```bash
npm run build
```

This builds the webview UI and the extension host, then copies the webview assets into the extension package.

### Run checks

```bash
npm run lint
npm run typecheck
npm run test
```

### Run integration tests

```bash
npm run test:integration --workspace=packages/extension
```

This launches VSCode with the extension and runs the tests under `packages/extension/src/test/`.

### Run smoke tests

```bash
npm run build
npx playwright install --with-deps chromium
npm run test:smoke
```

Smoke tests serve the built webview assets and assert that the UI renders in Chromium.

### Package

```bash
npm run package
```

Produces `packages/extension/mssgs-0.1.0.vsix`.

## Project structure

```
packages/
  extension/   VSCode extension host (commands, webview provider, backends)
  webview/     React UI built with Rsbuild
```

The root is an npm workspace. `npm run build` builds the webview first, then the extension, and copies the webview dist into `packages/extension/out/webview-dist` so it is included in the `.vsix`.

## Contributing

Contributions are welcome. Please open an issue or pull request on GitHub.

1. Fork the repository.
2. Create a feature branch (`git checkout -b feat/my-feature`).
3. Make your changes.
4. Run the full validation matrix:
   ```bash
   npm install
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   npm run package
   ```
5. Commit using [Conventional Commits](https://www.conventionalcommits.org/).
6. Open a pull request.

## License

[MIT](./LICENSE)
