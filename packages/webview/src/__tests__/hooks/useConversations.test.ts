import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useConversations } from '../../hooks/useConversations';
import { useMessengerStore } from '../../stores/messengerStore';

function createConversation(
  id: string,
  title: string,
  overrides: {
    isPinned?: boolean;
    updatedAt?: string;
  } = {},
): Parameters<ReturnType<typeof useMessengerStore.getState>['upsertConversation']>[0] {
  return {
    id,
    accountId: 'acc-1',
    service: 'whatsapp',
    type: 'direct',
    title,
    participantIds: ['contact-1'],
    lastMessageId: null,
    unreadCount: 0,
    isArchived: false,
    isPinned: overrides.isPinned ?? false,
    isFavorite: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: overrides.updatedAt ?? '2024-01-01T00:00:00Z',
  };
}

describe('useConversations', () => {
  beforeEach(() => {
    act(() => {
      useMessengerStore.getState().resetState();
    });
  });

  it('returns an empty list when no conversations exist', () => {
    const { result } = renderHook(() => useConversations());
    expect(result.current).toEqual([]);
  });

  it('sorts pinned conversations before unpinned ones', () => {
    const store = useMessengerStore.getState();

    act(() => {
      store.upsertConversation(createConversation('conv-1', 'Alpha'));
      store.upsertConversation(createConversation('conv-2', 'Beta', { isPinned: true }));
    });

    const { result } = renderHook(() => useConversations());

    expect(result.current.map((c) => c.id)).toEqual(['conv-2', 'conv-1']);
  });

  it('sorts conversations by updatedAt descending within the same pin group', () => {
    const store = useMessengerStore.getState();

    act(() => {
      store.upsertConversation(
        createConversation('conv-1', 'Alpha', { updatedAt: '2024-01-01T00:00:00Z' }),
      );
      store.upsertConversation(
        createConversation('conv-2', 'Beta', { updatedAt: '2024-01-03T00:00:00Z' }),
      );
      store.upsertConversation(
        createConversation('conv-3', 'Gamma', { updatedAt: '2024-01-02T00:00:00Z' }),
      );
    });

    const { result } = renderHook(() => useConversations());

    expect(result.current.map((c) => c.id)).toEqual(['conv-2', 'conv-3', 'conv-1']);
  });
});
