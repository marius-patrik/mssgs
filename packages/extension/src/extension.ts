import * as vscode from 'vscode';
import { registerCommands } from './commands/index.js';
import { MessageBus } from './shared/messages.js';
import { AccountWizardEngine, registerAccountWizardHandlers } from './wizard/index.js';
import { MessengerViewProvider } from './webview/MessengerViewProvider.js';
import { WebviewManager } from './webview/WebviewManager.js';

export function activate(context: vscode.ExtensionContext): void {
  const manager = new WebviewManager(context.extensionUri);
  const bus = new MessageBus();

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
  registerAccountWizardHandlers({ bus, engine: new AccountWizardEngine() });

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

  context.subscriptions.push(viewRegistration, themeChangeDisposable, ...commandDisposables);
}

export function deactivate(): void {
  // no-op
}
