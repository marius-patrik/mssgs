import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { SqliteCache } from './cache/index.js';
import { registerCommands } from './commands/index.js';
import { registerExtras } from './extras/index.js';
import { MessageBus } from './shared/messages.js';
import { MessengerViewProvider } from './webview/MessengerViewProvider.js';
import { WebviewManager } from './webview/WebviewManager.js';
import { AccountWizardEngine, registerAccountWizardHandlers } from './wizard/index.js';

function createCache(context: vscode.ExtensionContext): SqliteCache | undefined {
  if (!context.globalStorageUri) {
    return undefined;
  }

  fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
  const dbPath = vscode.Uri.joinPath(context.globalStorageUri, 'mssgs.sqlite').fsPath;
  return new SqliteCache(dbPath);
}

export function activate(context: vscode.ExtensionContext): void {
  const manager = new WebviewManager(context.extensionUri);
  const bus = new MessageBus();
  const cache = createCache(context);

  // Wire the typed message bus to the webview surface.
  manager.onDidReceiveRequest((request) => {
    void bus.handleRequest(request).then((response) => manager.postResponse(response));
  });

  // Register request handlers for the webview to call.
  bus.registerHandler('ping', () => ({ ok: true }));
  bus.registerHandler('getAccounts', () => ({ accounts: [] }));
  bus.registerHandler('getConversations', () => ({ conversations: [] }));
  bus.registerHandler('archiveConversation', ({ conversationId }) => ({
    archived: Boolean(conversationId),
  }));
  bus.registerHandler('markAllAsRead', () => ({ marked: 0 }));
  bus.registerHandler('searchMessages', ({ query }) => ({
    results: query ? [{ query }] : [],
  }));

  // Register account setup wizard handlers.
  registerAccountWizardHandlers({
    bus,
    engine: new AccountWizardEngine(),
    getHomeserverUrl: () =>
      vscode.workspace.getConfiguration('mssgs').get<string>('homeserverUrl') ??
      'https://matrix.org',
  });

  // Register Beeper-like extras (shortcuts, palette, reminders, scheduling).
  const extrasDisposables = registerExtras({ bus, manager, cache });

  // Register the activity-bar webview view.
  const viewProvider = new MessengerViewProvider(manager);
  const viewRegistration = vscode.window.registerWebviewViewProvider(
    'mssgs.messenger',
    viewProvider,
    { webviewOptions: { retainContextWhenHidden: true } },
  );

  // Register command-palette commands.
  const commandDisposables = registerCommands(manager);

  // Send theme updates to the webview when VSCode theme changes.
  const themeChangeDisposable = vscode.window.onDidChangeActiveColorTheme(() => {
    manager.postThemeEvent();
  });

  context.subscriptions.push(
    viewRegistration,
    themeChangeDisposable,
    ...commandDisposables,
    ...extrasDisposables,
  );
}

export function deactivate(): void {
  // no-op
}
