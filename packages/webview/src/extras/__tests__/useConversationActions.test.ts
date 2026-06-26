import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Conversation } from '../../../../extension/src/shared/types';
import { MessengerClient } from '../../messaging/client';
import { useMessengerStore } from '../../stores/messengerStore';
import { useConversationActions } from '../useConversationActions';

const conversation: Conversation = {
  id: '22222222-2222-2222-2222-222222222222',
  accountId: '11111111-1111-1111-1111-111111111111',
  service: 'telegram',
  type: 'direct',
  title: 'Test chat',
  participantIds: ['33333333-3333-3333-3333-333333333333'],
  lastMessageId: null,
  unreadCount: 0,
  isArchived: false,
  isPinned: false,
  isFavorite: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('useConversationActions', () => {
  beforeEach(() => {
    act(() => {
      useMessengerStore.getState().resetState();
      useMessengerStore.getState().upsertConversation(conversation);
    });
  });

  it('toggles favorite locally and sends a bus request when a client is provided', () => {
    const client = new MessengerClient();
    const requestSpy = vi.spyOn(client, 'request').mockResolvedValue({ conversation });

    const { result } = renderHook(() => useConversationActions(client));

    act(() => {
      result.current.toggleFavorite(conversation.id);
    });

    expect(useMessengerStore.getState().conversations[conversation.id].isFavorite).toBe(true);
    expect(requestSpy).toHaveBeenCalledWith('updateConversation', {
      conversation: expect.objectContaining({ id: conversation.id, isFavorite: true }),
    });
  });

  it('toggles pin without a client without throwing', () => {
    const { result } = renderHook(() => useConversationActions());

    act(() => {
      result.current.togglePin(conversation.id);
    });

    expect(useMessengerStore.getState().conversations[conversation.id].isPinned).toBe(true);
  });

  it('archives a conversation and sends the updated conversation to the bus', () => {
    const client = new MessengerClient();
    const requestSpy = vi.spyOn(client, 'request').mockResolvedValue({ conversation });

    const { result } = renderHook(() => useConversationActions(client));

    act(() => {
      result.current.archiveConversation(conversation.id);
    });

    expect(useMessengerStore.getState().conversations[conversation.id].isArchived).toBe(true);
    expect(requestSpy).toHaveBeenCalledWith('updateConversation', {
      conversation: expect.objectContaining({ id: conversation.id, isArchived: true }),
    });
  });
});
