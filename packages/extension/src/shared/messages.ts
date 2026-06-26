import type { Conversation, Reminder, ScheduledMessage, ServiceType } from './types.js';

export interface AttachmentDraft {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}

export interface WizardStep {
  stepId: string;
  title: string;
  description: string;
  fields: WizardField[];
}

export interface WizardField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'tel' | 'select' | 'qr' | 'static';
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  value?: string;
}

export type SetupStatus = 'active' | 'completed' | 'cancelled' | 'error';

export interface WizardServiceInfo {
  service: ServiceType;
  displayName: string;
  requiresPhone: boolean;
  requiresMatrixLogin: boolean;
}

export interface MssgsRequestMap {
  ping: { payload?: undefined; response: { ok: true } };
  getAccounts: { payload?: undefined; response: { accounts: unknown[] } };
  getConversations: { payload?: undefined; response: { conversations: unknown[] } };
  archiveConversation: { payload: { conversationId: string }; response: { archived: boolean } };
  markAllAsRead: { payload?: undefined; response: { marked: number } };
  searchMessages: { payload: { query: string }; response: { results: unknown[] } };
  updateConversation: {
    payload: { conversation: Conversation };
    response: { conversation: Conversation };
  };
  setActiveConversation: {
    payload: { conversationId: string | null };
    response: { activeConversationId: string | null };
  };
  setReminder: {
    payload: { messageId: string; remindAt: string };
    response: { reminderId: string };
  };
  deleteReminder: { payload: { reminderId: string }; response: { deleted: boolean } };
  getReminders: {
    payload?: { messageId?: string } | undefined;
    response: { reminders: Reminder[] };
  };
  scheduleMessage: {
    payload: { conversationId: string; text: string; scheduledAt: string };
    response: { scheduledMessageId: string };
  };
  cancelScheduledMessage: {
    payload: { scheduledMessageId: string };
    response: { cancelled: boolean };
  };
  getScheduledMessages: {
    payload?: { conversationId?: string } | undefined;
    response: { scheduledMessages: ScheduledMessage[] };
  };
  getSupportedServices: {
    payload?: undefined;
    response: { services: WizardServiceInfo[] };
  };
  startAccountSetup: {
    payload: { service: ServiceType };
    response: { setupId: string; step: WizardStep };
  };
  submitAccountSetupStep: {
    payload: { setupId: string; stepId: string; data: Record<string, string> };
    response: { done: boolean; step?: WizardStep; error?: string };
  };
  cancelAccountSetup: {
    payload: { setupId: string };
    response: { cancelled: boolean };
  };
  getAccountSetupStatus: {
    payload: { setupId: string };
    response: {
      setupId: string;
      service: ServiceType;
      status: SetupStatus;
      step?: WizardStep;
      error: string | null;
    };
  };
  getMessages: {
    payload: { conversationId: string };
    response: { messages: unknown[] };
  };
  sendMessage: {
    payload: {
      conversationId: string;
      text: string;
      replyToId?: string;
      attachments?: AttachmentDraft[];
    };
    response: { message: unknown };
  };
  editMessage: {
    payload: { messageId: string; text: string };
    response: { edited: boolean };
  };
  deleteMessage: {
    payload: { messageId: string };
    response: { deleted: boolean };
  };
  addReaction: {
    payload: { messageId: string; emoji: string };
    response: { reacted: boolean };
  };
  removeReaction: {
    payload: { messageId: string; emoji: string };
    response: { removed: boolean };
  };
  sendTyping: {
    payload: { conversationId: string; isTyping: boolean };
    response: { ok: boolean };
  };
  markAsRead: {
    payload: { conversationId: string; messageIds?: string[] };
    response: { marked: number };
  };
}

export type MssgsMethod = keyof MssgsRequestMap;

export type MssgsRequest<M extends MssgsMethod = MssgsMethod> = {
  type: 'request';
  id: string;
  method: M;
  payload: MssgsRequestMap[M]['payload'];
};

export type MssgsResponse =
  | { type: 'response'; id: string; result: unknown }
  | { type: 'response'; id: string; error: string };

export type MssgsEventType = 'accounts' | 'conversations' | 'messages' | 'theme' | 'extras';

export type MssgsEvent =
  | { type: 'event'; eventType: 'accounts'; payload: unknown[] }
  | { type: 'event'; eventType: 'conversations'; payload: unknown[] }
  | { type: 'event'; eventType: 'messages'; payload: unknown[] }
  | {
      type: 'event';
      eventType: 'theme';
      payload: { kind: 'dark' | 'light' | 'highContrast' };
    }
  | {
      type: 'event';
      eventType: 'extras';
      payload: { kind: string; data?: unknown };
    };

export type MssgsMessage = MssgsRequest | MssgsResponse | MssgsEvent;

export type RequestHandler<M extends MssgsMethod = MssgsMethod> = (
  payload: MssgsRequestMap[M]['payload'],
) => MssgsRequestMap[M]['response'] | Promise<MssgsRequestMap[M]['response']>;

export class MessageBus {
  private handlers = new Map<MssgsMethod, RequestHandler<MssgsMethod>>();

  registerHandler<M extends MssgsMethod>(method: M, handler: RequestHandler<M>): void {
    this.handlers.set(method, handler as unknown as RequestHandler<MssgsMethod>);
  }

  async handleRequest(request: MssgsRequest): Promise<MssgsResponse> {
    const handler = this.handlers.get(request.method);
    if (!handler) {
      return {
        type: 'response',
        id: request.id,
        error: `No handler registered for method: ${request.method}`,
      };
    }

    try {
      const result = await handler(request.payload);
      return { type: 'response', id: request.id, result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { type: 'response', id: request.id, error: message };
    }
  }
}
