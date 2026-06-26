import type { SqliteCache } from '../cache/index.js';
import type { MessageBus, MssgsEvent } from '../shared/messages.js';
import type { Conversation, Reminder, ScheduledMessage } from '../shared/types.js';
import type { WebviewManager } from '../webview/WebviewManager.js';
import type { ExtrasScheduler } from './scheduler.js';

interface RegisterExtrasHandlersOptions {
  bus: MessageBus;
  manager: WebviewManager;
  cache?: SqliteCache;
  scheduler: ExtrasScheduler;
}

function broadcastConversation(manager: WebviewManager, conversation: Conversation): void {
  const event: MssgsEvent = {
    type: 'event',
    eventType: 'conversations',
    payload: [conversation],
  };
  manager.postEvent(event);
}

function broadcastExtras(
  manager: WebviewManager,
  kind: string,
  data?: Record<string, unknown>,
): void {
  const event: MssgsEvent = {
    type: 'event',
    eventType: 'extras',
    payload: data ? { kind, data } : { kind },
  };
  manager.postEvent(event);
}

export function registerExtrasHandlers(options: RegisterExtrasHandlersOptions): void {
  const { bus, manager, cache, scheduler } = options;
  let activeConversationId: string | null = null;

  bus.registerHandler('setActiveConversation', ({ conversationId }) => {
    activeConversationId = conversationId ?? null;
    return { activeConversationId };
  });

  bus.registerHandler('updateConversation', ({ conversation }) => {
    cache?.syncConversation(conversation);
    broadcastConversation(manager, conversation);
    return { conversation };
  });

  bus.registerHandler('setReminder', ({ messageId, remindAt }) => {
    const reminder = scheduler.setReminder({ messageId, remindAt });
    return { reminderId: reminder.id };
  });

  bus.registerHandler('deleteReminder', ({ reminderId }) => {
    return { deleted: scheduler.deleteReminder(reminderId) };
  });

  bus.registerHandler('getReminders', ({ messageId } = {}) => {
    return { reminders: scheduler.getReminders({ messageId }) };
  });

  bus.registerHandler('scheduleMessage', ({ conversationId, text, scheduledAt }) => {
    const message = scheduler.scheduleMessage({ conversationId, text, scheduledAt });
    return { scheduledMessageId: message.id };
  });

  bus.registerHandler('cancelScheduledMessage', ({ scheduledMessageId }) => {
    return { cancelled: scheduler.cancelScheduledMessage(scheduledMessageId) };
  });

  bus.registerHandler('getScheduledMessages', ({ conversationId } = {}) => {
    return { scheduledMessages: scheduler.getScheduledMessages({ conversationId }) };
  });

  scheduler.setCallbacks({
    onReminder: (reminder: Reminder) => {
      broadcastExtras(manager, 'reminderFired', reminder as unknown as Record<string, unknown>);
    },
    onScheduledMessage: (message: ScheduledMessage) => {
      broadcastExtras(
        manager,
        'scheduledMessageFired',
        message as unknown as Record<string, unknown>,
      );
    },
  });
}
