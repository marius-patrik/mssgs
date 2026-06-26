import * as vscode from 'vscode';
import type { SqliteCache } from '../cache/index.js';
import type { Conversation } from '../shared/types.js';
import type { WebviewManager } from '../webview/WebviewManager.js';
import type { ExtrasScheduler } from './scheduler.js';

interface CommandContext {
  manager: WebviewManager;
  cache?: SqliteCache;
  scheduler?: ExtrasScheduler;
}

async function pickConversation(cache?: SqliteCache): Promise<Conversation | undefined> {
  const conversations = cache?.getConversations() ?? [];

  if (conversations.length === 0) {
    void vscode.window.showInformationMessage('No conversations available.');
    return undefined;
  }

  const picked = await vscode.window.showQuickPick(
    conversations.map((conversation) => ({
      label: conversation.title ?? conversation.id,
      conversation,
    })),
    { placeHolder: 'Select a conversation' },
  );

  return picked?.conversation;
}

async function updateFlag(
  context: CommandContext,
  flag: 'isPinned' | 'isFavorite' | 'isArchived',
  forcedValue?: boolean,
): Promise<void> {
  const conversation = await pickConversation(context.cache);
  if (!conversation) {
    return;
  }

  const nextConversation: Conversation = {
    ...conversation,
    [flag]: forcedValue ?? !conversation[flag],
    updatedAt: new Date().toISOString(),
  };

  context.cache?.syncConversation(nextConversation);

  const event = {
    type: 'event' as const,
    eventType: 'conversations' as const,
    payload: [nextConversation],
  };
  context.manager.postEvent(event);

  void vscode.window.showInformationMessage(
    `${flag === 'isPinned' ? 'Pin' : flag === 'isFavorite' ? 'Favorite' : 'Archive'} updated for ${conversation.title ?? conversation.id}.`,
  );
}

function postExtrasEvent(manager: WebviewManager, kind: string): void {
  manager.postEvent({ type: 'event', eventType: 'extras', payload: { kind } });
}

function parseScheduledTime(input: string): Date | undefined {
  const trimmed = input.trim();

  if (/^\d+$/.test(trimmed)) {
    return new Date(Date.now() + Number.parseInt(trimmed, 10) * 60000);
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return undefined;
}

export function registerExtrasCommands(
  manager: WebviewManager,
  cache?: SqliteCache,
  scheduler?: ExtrasScheduler,
): vscode.Disposable[] {
  const context: CommandContext = { manager, cache, scheduler };

  const commands: Record<string, () => void | Promise<void>> = {
    'mssgs.focusSearch': () => postExtrasEvent(manager, 'focusSearch'),
    'mssgs.newConversation': () => postExtrasEvent(manager, 'openWizard'),

    'mssgs.togglePinConversation': async () => {
      await updateFlag(context, 'isPinned');
    },

    'mssgs.toggleFavoriteConversation': async () => {
      await updateFlag(context, 'isFavorite');
    },

    'mssgs.archiveSelected': async () => {
      await updateFlag(context, 'isArchived', true);
    },

    'mssgs.setReminder': async () => {
      if (!scheduler) {
        void vscode.window.showInformationMessage('Scheduling is not available.');
        return;
      }

      const messageId = await vscode.window.showInputBox({
        prompt: 'Message ID to remind about',
        placeHolder: 'message-id',
      });
      if (!messageId) {
        return;
      }

      const when = await vscode.window.showInputBox({
        prompt: 'Remind in how many minutes? (or enter an ISO timestamp)',
        placeHolder: '5',
      });
      if (!when) {
        return;
      }

      const remindAt = parseScheduledTime(when);
      if (!remindAt) {
        void vscode.window.showErrorMessage('Could not parse the reminder time.');
        return;
      }

      const reminder = scheduler.setReminder({
        messageId,
        remindAt: remindAt.toISOString(),
      });

      void vscode.window.showInformationMessage(`Reminder set (${reminder.id}).`);
    },

    'mssgs.scheduleMessage': async () => {
      if (!scheduler) {
        void vscode.window.showInformationMessage('Scheduling is not available.');
        return;
      }

      const conversation = await pickConversation(cache);
      if (!conversation) {
        return;
      }

      const text = await vscode.window.showInputBox({
        prompt: 'Message text',
        placeHolder: 'Type your scheduled message…',
      });
      if (!text) {
        return;
      }

      const when = await vscode.window.showInputBox({
        prompt: 'Send in how many minutes? (or enter an ISO timestamp)',
        placeHolder: '10',
      });
      if (!when) {
        return;
      }

      const scheduledAt = parseScheduledTime(when);
      if (!scheduledAt) {
        void vscode.window.showErrorMessage('Could not parse the scheduled time.');
        return;
      }

      const scheduledMessage = scheduler.scheduleMessage({
        conversationId: conversation.id,
        text,
        scheduledAt: scheduledAt.toISOString(),
      });

      void vscode.window.showInformationMessage(`Message scheduled (${scheduledMessage.id}).`);
    },
  };

  return Object.entries(commands).map(([command, callback]) =>
    vscode.commands.registerCommand(command, callback),
  );
}
