import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessengerStore } from '../../../stores/messengerStore';
import { Inbox } from '../Inbox';

function seedStore(): void {
  const store = useMessengerStore.getState();
  store.setAccounts([
    {
      id: 'acc-1',
      service: 'telegram',
      username: 'self',
      displayName: 'Me',
      avatarUrl: null,
      status: 'connected',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ]);
  store.upsertConversation({
    id: 'conv-1',
    accountId: 'acc-1',
    type: 'direct',
    title: 'Alice',
    participantIds: ['contact-1'],
    lastMessageId: null,
    unreadCount: 2,
    isArchived: false,
    isPinned: true,
    isFavorite: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  });
  store.upsertConversation({
    id: 'conv-2',
    accountId: 'acc-1',
    type: 'direct',
    title: 'Bob',
    participantIds: ['contact-2'],
    lastMessageId: null,
    unreadCount: 0,
    isArchived: false,
    isPinned: false,
    isFavorite: false,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  });
  store.upsertConversation({
    id: 'conv-3',
    accountId: 'acc-1',
    type: 'direct',
    title: 'Archived chat',
    participantIds: ['contact-3'],
    lastMessageId: null,
    unreadCount: 0,
    isArchived: true,
    isPinned: false,
    isFavorite: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  });
}

describe('Inbox', () => {
  beforeEach(() => {
    act(() => {
      useMessengerStore.getState().resetState();
    });
  });

  it('renders header and conversation list', () => {
    render(<Inbox onNewConversation={vi.fn()} />);

    expect(screen.getByText('mssgs')).toBeInTheDocument();
    expect(screen.getByLabelText('Search messages')).toBeInTheDocument();
  });

  it('opens the new-conversation wizard', async () => {
    const onNewConversation = vi.fn();
    render(<Inbox onNewConversation={onNewConversation} />);

    await userEvent.click(screen.getByLabelText('New conversation'));

    expect(onNewConversation).toHaveBeenCalled();
  });

  it('filters conversations by search query', async () => {
    act(() => {
      seedStore();
    });

    render(<Inbox onNewConversation={vi.fn()} />);
    const search = screen.getByLabelText('Search messages');

    await userEvent.type(search, 'Alice');

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('hides archived conversations by default', () => {
    act(() => {
      seedStore();
    });

    render(<Inbox onNewConversation={vi.fn()} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText('Archived chat')).not.toBeInTheDocument();
  });

  it('marks a conversation as read when selected', async () => {
    act(() => {
      seedStore();
    });

    render(<Inbox onNewConversation={vi.fn()} />);

    await userEvent.click(screen.getByText('Alice'));

    expect(useMessengerStore.getState().activeConversationId).toBe('conv-1');
    expect(useMessengerStore.getState().conversations['conv-1'].unreadCount).toBe(0);
  });
});
