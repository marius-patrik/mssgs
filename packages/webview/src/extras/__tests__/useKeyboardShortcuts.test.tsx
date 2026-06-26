import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessengerStore } from '../../stores/messengerStore';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

function seedActiveConversation(): void {
  act(() => {
    useMessengerStore.getState().resetState();
    useMessengerStore.getState().upsertConversation({
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
    });
    useMessengerStore.getState().setActiveConversationId('22222222-2222-2222-2222-222222222222');
  });
}

function dispatchKeyDown(eventInit: KeyboardEventInit): void {
  const event = new KeyboardEvent('keydown', eventInit);
  window.dispatchEvent(event);
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    act(() => {
      useMessengerStore.getState().resetState();
    });
  });

  it('clears the active conversation on Escape', () => {
    seedActiveConversation();

    renderHook(() => useKeyboardShortcuts());
    act(() => {
      dispatchKeyDown({ key: 'Escape' });
    });

    expect(useMessengerStore.getState().activeConversationId).toBeNull();
  });

  it('opens a new conversation on Ctrl/Cmd+N', () => {
    const onNewConversation = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onNewConversation }));

    act(() => {
      dispatchKeyDown({ key: 'n', ctrlKey: true });
    });

    expect(onNewConversation).toHaveBeenCalled();
  });

  it('toggles pin on the active conversation with Ctrl/Cmd+Shift+P', () => {
    seedActiveConversation();

    renderHook(() => useKeyboardShortcuts());
    act(() => {
      dispatchKeyDown({ key: 'p', ctrlKey: true, shiftKey: true });
    });

    expect(
      useMessengerStore.getState().conversations['22222222-2222-2222-2222-222222222222'].isPinned,
    ).toBe(true);
  });

  it('toggles favorite on the active conversation with Ctrl/Cmd+Shift+F', () => {
    seedActiveConversation();

    renderHook(() => useKeyboardShortcuts());
    act(() => {
      dispatchKeyDown({ key: 'f', ctrlKey: true, shiftKey: true });
    });

    expect(
      useMessengerStore.getState().conversations['22222222-2222-2222-2222-222222222222'].isFavorite,
    ).toBe(true);
  });

  it('archives the active conversation with Ctrl/Cmd+Shift+A', () => {
    seedActiveConversation();

    renderHook(() => useKeyboardShortcuts());
    act(() => {
      dispatchKeyDown({ key: 'a', ctrlKey: true, shiftKey: true });
    });

    expect(
      useMessengerStore.getState().conversations['22222222-2222-2222-2222-222222222222'].isArchived,
    ).toBe(true);
  });
});
