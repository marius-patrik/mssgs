import * as vscode from 'vscode';
import type { MssgsEvent, MssgsMessage, MssgsRequest, MssgsResponse } from '../shared/messages.js';

const VIEW_TITLE = 'mssgs';
const VIEW_TYPE = 'mssgs.messenger';

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

function vscodeThemeKind(): 'dark' | 'light' | 'highContrast' {
  switch (vscode.window.activeColorTheme.kind) {
    case vscode.ColorThemeKind.Dark:
      return 'dark';
    case vscode.ColorThemeKind.HighContrast:
    case vscode.ColorThemeKind.HighContrastLight:
      return 'highContrast';
    default:
      return 'light';
  }
}

/**
 * Manages the lifecycle of the messenger webview, whether it is hosted in the
 * activity bar as a WebviewView or in the main editor area as a WebviewPanel.
 *
 * It loads the built webview assets from `packages/webview/dist`, injects a
 * strict Content-Security-Policy, and exposes a typed message bus for
 * request/response and event streaming.
 */
export class WebviewManager {
  private panel: vscode.WebviewPanel | undefined;
  private view: vscode.WebviewView | undefined;
  private messageHandler?: (message: MssgsRequest) => void;
  private pendingRequests = new Map<string, vscode.Webview>();

  constructor(private readonly extensionUri: vscode.Uri) {}

  /**
   * Registers a callback for incoming requests from the webview.
   * The caller is responsible for producing a response and posting it back.
   */
  onDidReceiveRequest(handler: (message: MssgsRequest) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Creates or reveals a webview panel in the main editor area.
   */
  createOrShowPanel(): vscode.WebviewPanel {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return this.panel;
    }

    this.panel = vscode.window.createWebviewPanel(VIEW_TYPE, VIEW_TITLE, vscode.ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [this.getDistUri()],
    });

    this.panel.webview.html = this.getHtml(this.panel.webview);
    this.attachWebview(this.panel.webview);

    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
      },
      null,
      [],
    );

    return this.panel;
  }

  /**
   * Binds an activity-bar WebviewView to this manager.
   */
  setView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.getDistUri()],
    };
    view.webview.html = this.getHtml(view.webview);
    this.attachWebview(view.webview);
    this.postThemeEvent();
  }

  /**
   * Returns true when a webview (panel or view) is currently bound.
   */
  get isActive(): boolean {
    return this.panel !== undefined || this.view !== undefined;
  }

  /**
   * Posts a typed event to all active webview surfaces.
   */
  postEvent(event: MssgsEvent): void {
    this.broadcast(event);
  }

  /**
   * Posts a typed response to the webview that originated the request.
   */
  postResponse(response: MssgsResponse): void {
    const webview = this.pendingRequests.get(response.id);
    if (webview) {
      this.pendingRequests.delete(response.id);
      void webview.postMessage(response);
      return;
    }

    this.broadcast(response);
  }

  /**
   * Sends the current VSCode theme to the webview.
   */
  postThemeEvent(): void {
    this.postEvent({
      type: 'event',
      eventType: 'theme',
      payload: { kind: vscodeThemeKind() },
    });
  }

  private broadcast(message: MssgsMessage): void {
    if (this.panel) {
      void this.panel.webview.postMessage(message);
    }
    if (this.view) {
      void this.view.webview.postMessage(message);
    }
  }

  private attachWebview(webview: vscode.Webview): void {
    webview.onDidReceiveMessage(
      (message: MssgsMessage) => {
        if (message.type === 'request' && this.messageHandler) {
          this.pendingRequests.set(message.id, webview);
          this.messageHandler(message);
        }
      },
      null,
      [],
    );
  }

  private getDistUri(): vscode.Uri {
    // The webview assets are copied into the extension package at build time
    // so they are included in the packaged .vsix.
    return vscode.Uri.joinPath(this.extensionUri, 'out', 'webview-dist');
  }

  private getHtml(webview: vscode.Webview): string {
    const distUri = this.getDistUri();
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distUri, 'static', 'js', 'index.js'),
    );
    const reactUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distUri, 'static', 'js', 'lib-react.js'),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distUri, 'static', 'css', 'index.css'),
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} data:;">
  <link href="${styleUri}" rel="stylesheet">
  <title>${VIEW_TITLE}</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${reactUri}"></script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
