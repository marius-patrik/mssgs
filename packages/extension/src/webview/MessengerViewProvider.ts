import type * as vscode from 'vscode';
import type { WebviewManager } from './WebviewManager.js';

/**
 * VSCode WebviewViewProvider that hosts the messenger in the activity bar.
 */
export class MessengerViewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly manager: WebviewManager) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.manager.setView(webviewView);
  }
}
