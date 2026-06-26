import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Account, Conversation, Message } from '../../../../extension/src/shared/types';
import { useConversationList } from '../../hooks/useConversationList';
import { createInitialState, useMessengerStore } from '../../stores/messengerStore';

const now = new Date().toISOString();

const account: Account = {
  id: '11111111-1111-1111-1111-111111111111',
  service: 'telegram',
  username: 'self',
  displayName: 'Me',
  avatarUrl: null,
  status: 'connected',
  createdAt: now,
  updatedAt: now,
};

const conversation: Conversation = {
  id: '22222222-2222-2222-2222-222222222222',
  accountId: account.id,
  type: 'direct',
  title: 'Alice',
  participantIds: ['33333333-3333-3333-3333-333333333333'],
  lastMessageId: null,
  unreadCount: 0,
  isArchived: false,
  isPinned: false,
  isFavorite: false,
  createdAt: now,
  updatedAt: now,
};

describe('useConversationList', () => {
  beforeEach(() => {
    useMessengerStore.setState(createInitialState());
  });

  it('returns empty array when store is empty', () => {
    const { result } = renderHook(() => useConversationList());
    expect(result.current).toHaveLength(0);
  });

  it('returns conversations with account and last message', () => {
    const message: Message = {
      id: '44444444-4444-4444-4444-444444444444',
      conversationId: conversation.id,
      accountId: account.id,
      senderId: conversation.participantIds[0],
      text: 'Hello',
      status: 'sent',
      isFromMe: false,
      replyToId: null,
      reactions: [],
      attachments: [],
      createdAt: now,
      updatedAt: now,
    };

    useMessengerStore.getState().setAccounts([account]);
    useMessengerStore.getState().upsertConversation(conversation);
    useMessengerStore.getState().upsertMessage(message);

    const { result } = renderHook(() => useConversationList());
    expect(result.current).toHaveLength(1);
    expect(result.current[0].conversation.id).toBe(conversation.id);
    expect(result.current[0].account).toEqual(account);
    expect(result.current[0].lastMessage?.text).toBe('Hello');
    expect(result.current[0].service).toBe('telegram');
  });

  it('filters archived conversations by default', () => {
    useMessengerStore.getState().setAccounts([account]);
    useMessengerStore.getState().upsertConversation({ ...conversation, isArchived: true });

    const { result } = renderHook(() => useConversationList());
    expect(result.current).toHaveLength(0);

    const withArchived = renderHook(() => useConversationList({ includeArchived: true }));
    expect(withArchived.result.current).toHaveLength(1);
  });

  it('filters by search query on title and message text', () => {
    useMessengerStore.getState().setAccounts([account]);
    useMessengerStore.getState().upsertConversation({ ...conversation, title: 'Project chat' });

    const { result } = renderHook(() => useConversationList({ query: 'project' }));
    expect(result.current).toHaveLength(1);

    const noMatch = renderHook(() => useConversationList({ query: 'vacation' }));
    expect(noMatch.result.current).toHaveLength(0);
  });

  it('sorts pinned and favorite conversations first', () => {
    useMessengerStore.getState().setAccounts([account]);
    useMessengerStore.getState().upsertConversation({
      ...conversation,
      id: 'conv-1',
      title: 'A',
      isPinned: false,
      isFavorite: false,
      updatedAt: '2024-01-03T00:00:00Z',
    });
    useMessengerStore.getState().upsertConversation({
      ...conversation,
      id: 'conv-2',
      title: 'B',
      isPinned: true,
      isFavorite: false,
      updatedAt: '2024-01-01T00:00:00Z',
    });
    useMessengerStore.getState().upsertConversation({
      ...conversation,
      id: 'conv-3',
      title: 'C',
      isPinned: false,
      isFavorite: true,
      updatedAt: '2024-01-02T00:00:00Z',
    });

    const { result } = renderHook(() => useConversationList());
    expect(result.current.map((item) => item.conversation.title)).toEqual(['B', 'C', 'A']);
  });
});
