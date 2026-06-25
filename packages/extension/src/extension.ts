import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand('mssgs.openMessenger', () => {
    void vscode.window.showInformationMessage('mssgs is coming soon.');
  });

  context.subscriptions.push(disposable);
}

export function deactivate(): void {
  // no-op
}
