import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { activate } from '../extension.js';
import { MessageBus } from '../shared/messages.js';
import { WebviewManager } from '../webview/WebviewManager.js';

vi.mock('vscode', () => import('../__mocks__/vscode.js'));

beforeEach(() => {
  vi.clearAllMocks();
});

function createMockContext(): vscode.ExtensionContext {
  return {
    extensionUri: vscode.Uri.file('/workspace/packages/extension'),
    subscriptions: [],
    secrets: (vscode as unknown as { secrets: vscode.ExtensionContext['secrets'] }).secrets,
  } as unknown as vscode.ExtensionContext;
}

describe('activate', () => {
  it('registers all required commands', async () => {
    const context = createMockContext();
    await activate(context);

    const registered = (vscode.commands.registerCommand as ReturnType<typeof vi.fn>).mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );
    expect(registered).toContain('mssgs.openMessenger');
    expect(registered).toContain('mssgs.addAccount');
    expect(registered).toContain('mssgs.signOut');
    expect(registered).toContain('mssgs.markAllAsRead');
    expect(registered).toContain('mssgs.archiveConversation');
    expect(registered).toContain('mssgs.searchMessages');
  });

  it('registers the webview view provider', async () => {
    const context = createMockContext();
    await activate(context);

    expect(vscode.window.registerWebviewViewProvider).toHaveBeenCalledWith(
      'mssgs.messenger',
      expect.any(Object),
      { webviewOptions: { retainContextWhenHidden: true } },
    );
  });

  it('opens the messenger in an editor tab via command', async () => {
    const context = createMockContext();
    await activate(context);

    const calls = (vscode.commands.registerCommand as ReturnType<typeof vi.fn>).mock.calls as [
      string,
      () => void,
    ][];
    const openCommand = calls.find(([command]) => command === 'mssgs.openMessenger');
    expect(openCommand).toBeDefined();

    const callback = openCommand?.[1] as () => void;
    callback();

    expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
      'mssgs.messenger',
      'mssgs',
      vscode.ViewColumn.One,
      expect.objectContaining({ enableScripts: true }),
    );
  });
});

describe('MessageBus', () => {
  it('handles a ping request', async () => {
    const bus = new MessageBus();
    bus.registerHandler('ping', () => ({ ok: true }));

    const response = await bus.handleRequest({
      type: 'request',
      id: '1',
      method: 'ping',
      payload: undefined,
    });

    expect(response).toEqual({ type: 'response', id: '1', result: { ok: true } });
  });

  it('returns an error for unregistered methods', async () => {
    const bus = new MessageBus();
    const response = await bus.handleRequest({
      type: 'request',
      id: '2',
      method: 'getAccounts',
      payload: undefined,
    });

    expect(response).toEqual({
      type: 'response',
      id: '2',
      error: 'No handler registered for method: getAccounts',
    });
  });
});

describe('WebviewManager', () => {
  it('creates panel HTML with CSP and asset URIs', () => {
    const manager = new WebviewManager(vscode.Uri.file('/workspace/packages/extension'));
    const panel = manager.createOrShowPanel();

    expect(panel.webview.html).toContain('<meta http-equiv="Content-Security-Policy"');
    expect(panel.webview.html).toContain('script-src');
    expect(panel.webview.html).toContain('nonce=');
    expect(panel.webview.html).toContain('static/js/index.js');
    expect(panel.webview.html).toContain('static/css/index.css');
  });

  it('reveals an existing panel instead of creating duplicates', () => {
    const manager = new WebviewManager(vscode.Uri.file('/workspace/packages/extension'));
    const first = manager.createOrShowPanel();
    const second = manager.createOrShowPanel();

    expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    expect(first.reveal).toHaveBeenCalled();
  });
});
