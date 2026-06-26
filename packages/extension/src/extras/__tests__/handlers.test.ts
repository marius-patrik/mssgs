import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { SqliteCache } from '../../cache/index.js';
import { MessageBus } from '../../shared/messages.js';
import { WebviewManager } from '../../webview/WebviewManager.js';
import { registerExtrasHandlers } from '../handlers.js';
import { ExtrasScheduler } from '../scheduler.js';

vi.mock('vscode', () => import('../../__mocks__/vscode.js'));

function createConversation(overrides: { id?: string; isPinned?: boolean } = {}) {
  return {
    id: overrides.id ?? '22222222-2222-2222-2222-222222222222',
    accountId: '11111111-1111-1111-1111-111111111111',
    service: 'telegram' as const,
    type: 'direct' as const,
    title: 'Test chat',
    participantIds: ['33333333-3333-3333-3333-333333333333'],
    lastMessageId: null,
    unreadCount: 0,
    isArchived: false,
    isPinned: overrides.isPinned ?? false,
    isFavorite: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
}

describe('registerExtrasHandlers', () => {
  let bus: MessageBus;
  let manager: WebviewManager;
  let cache: SqliteCache;
  let scheduler: ExtrasScheduler;

  const account = {
    id: '11111111-1111-1111-1111-111111111111',
    service: 'telegram' as const,
    username: 'self',
    displayName: 'Me',
    avatarUrl: null,
    status: 'connected' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    bus = new MessageBus();
    manager = new WebviewManager(vscode.Uri.file('/workspace/packages/extension'));
    vi.spyOn(manager, 'postEvent');
    cache = new SqliteCache(':memory:');
    cache.syncAccount(account);
    scheduler = new ExtrasScheduler();
    registerExtrasHandlers({ bus, manager, cache, scheduler });
  });

  afterEach(() => {
    cache.close();
    scheduler.stop();
    vi.restoreAllMocks();
  });

  it('updates active conversation id', async () => {
    const response = await bus.handleRequest({
      type: 'request',
      id: '1',
      method: 'setActiveConversation',
      payload: { conversationId: '22222222-2222-2222-2222-222222222222' },
    });

    expect(response).toEqual({
      type: 'response',
      id: '1',
      result: { activeConversationId: '22222222-2222-2222-2222-222222222222' },
    });
  });

  it('persists and broadcasts conversation updates', async () => {
    const conversation = createConversation({ isPinned: true });

    const response = await bus.handleRequest({
      type: 'request',
      id: '2',
      method: 'updateConversation',
      payload: { conversation },
    });

    expect(response).toEqual({
      type: 'response',
      id: '2',
      result: { conversation },
    });

    expect(manager.postEvent).toHaveBeenCalledWith({
      type: 'event',
      eventType: 'conversations',
      payload: [conversation],
    });

    const stored = cache.getConversation(conversation.id);
    expect(stored).toBeDefined();
    expect(stored?.isPinned).toBe(true);
  });

  it('schedules and retrieves reminders', async () => {
    const remindAt = new Date(Date.now() + 60000).toISOString();

    const response = await bus.handleRequest({
      type: 'request',
      id: '3',
      method: 'setReminder',
      payload: { messageId: '44444444-4444-4444-4444-444444444444', remindAt },
    });

    expect(response.type).toBe('response');
    expect((response as { result: { reminderId: string } }).result.reminderId).toBeDefined();
  });

  it('schedules and cancels messages', async () => {
    const scheduledAt = new Date(Date.now() + 60000).toISOString();

    const scheduleResponse = await bus.handleRequest({
      type: 'request',
      id: '4',
      method: 'scheduleMessage',
      payload: {
        conversationId: '22222222-2222-2222-2222-222222222222',
        text: 'Later',
        scheduledAt,
      },
    });

    expect(scheduleResponse.type).toBe('response');
    const { scheduledMessageId } = (scheduleResponse as { result: { scheduledMessageId: string } })
      .result;

    const cancelResponse = await bus.handleRequest({
      type: 'request',
      id: '5',
      method: 'cancelScheduledMessage',
      payload: { scheduledMessageId },
    });

    expect(cancelResponse).toEqual({
      type: 'response',
      id: '5',
      result: { cancelled: true },
    });
  });
});
