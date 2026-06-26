import * as vscode from 'vscode';
import type { WebviewManager } from '../webview/WebviewManager.js';

const SERVICE_TYPES = ['matrix', 'discord', 'slack', 'telegram', 'imessage'] as const;
type ServiceType = (typeof SERVICE_TYPES)[number];

async function pickService(): Promise<ServiceType | undefined> {
  const picked = await vscode.window.showQuickPick(
    SERVICE_TYPES.map((value) => ({ label: value, value })),
    { placeHolder: 'Select messaging service' },
  );
  return picked?.value;
}

export function registerCommands(manager: WebviewManager): vscode.Disposable[] {
  const commands: Record<string, () => void | Promise<void>> = {
    'mssgs.openMessenger': () => {
      manager.createOrShowPanel();
    },

    'mssgs.addAccount': async () => {
      const service = await pickService();
      if (!service) {
        return;
      }

      const userId = await vscode.window.showInputBox({
        prompt: `Enter your ${service} user ID`,
        placeHolder: '@user:example.com',
      });
      if (!userId) {
        return;
      }

      manager.postEvent({
        type: 'event',
        eventType: 'accounts',
        payload: [{ id: crypto.randomUUID(), service, userId }],
      });

      void vscode.window.showInformationMessage(`Added ${service} account for ${userId}.`);
    },

    'mssgs.signOut': async () => {
      const confirmed = await vscode.window.showWarningMessage(
        'Sign out of all mssgs accounts?',
        { modal: true },
        'Sign Out',
      );
      if (confirmed !== 'Sign Out') {
        return;
      }

      manager.postEvent({
        type: 'event',
        eventType: 'accounts',
        payload: [],
      });

      void vscode.window.showInformationMessage('Signed out of mssgs.');
    },

    'mssgs.markAllAsRead': async () => {
      manager.postEvent({
        type: 'event',
        eventType: 'conversations',
        payload: [],
      });
      void vscode.window.showInformationMessage('Marked all conversations as read.');
    },

    'mssgs.archiveConversation': async () => {
      const conversationId = await vscode.window.showInputBox({
        prompt: 'Conversation ID to archive',
        placeHolder: 'conversation-id',
      });
      if (!conversationId) {
        return;
      }

      manager.postEvent({
        type: 'event',
        eventType: 'conversations',
        payload: [{ id: conversationId, archived: true }],
      });

      void vscode.window.showInformationMessage(`Archived conversation ${conversationId}.`);
    },

    'mssgs.searchMessages': async () => {
      const query = await vscode.window.showInputBox({
        prompt: 'Search messages',
        placeHolder: 'keyword…',
      });
      if (!query) {
        return;
      }

      manager.postEvent({
        type: 'event',
        eventType: 'messages',
        payload: [{ query, results: [] }],
      });

      void vscode.window.showInformationMessage(`Searched messages for "${query}".`);
    },
  };

  return Object.entries(commands).map(([command, callback]) =>
    vscode.commands.registerCommand(command, callback),
  );
}
