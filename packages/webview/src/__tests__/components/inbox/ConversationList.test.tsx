import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ConversationList } from '../../../components/inbox/ConversationList';
import { createInitialState, useMessengerStore } from '../../../stores/messengerStore';

const now = new Date().toISOString();

function seedConversations(): void {
  const store = useMessengerStore.getState();
  store.setAccounts([
    {
      id: 'acc-1',
      service: 'whatsapp',
      username: 'self',
      displayName: 'Me',
      avatarUrl: null,
      status: 'connected',
      createdAt: now,
      updatedAt: now,
    },
  ]);
  store.upsertConversation({
    id: 'conv-1',
    accountId: 'acc-1',
    type: 'direct',
    title: 'Alice',
    participantIds: ['contact-1'],
    lastMessageId: 'msg-1',
    unreadCount: 0,
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
  store.upsertMessage({
    id: 'msg-1',
    conversationId: 'conv-1',
    accountId: 'acc-1',
    senderId: 'contact-1',
    text: 'Hey there',
    status: 'sent',
    isFromMe: false,
    replyToId: null,
    reactions: [],
    attachments: [],
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  });
}

describe('ConversationList', () => {
  beforeEach(() => {
    act(() => {
      useMessengerStore.setState(createInitialState());
    });
  });

  it('renders empty state when no conversations exist', () => {
    render(<ConversationList query="" />);
    expect(screen.getByText('No conversations found.')).toBeInTheDocument();
  });

  it('renders conversations with last message preview and unread count', () => {
    act(() => {
      seedConversations();
    });

    render(<ConversationList query="" />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Hey there')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('filters conversations by query', () => {
    act(() => {
      seedConversations();
    });

    render(<ConversationList query="Alice" />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('activates a conversation on click', async () => {
    act(() => {
      seedConversations();
    });

    render(<ConversationList query="" />);

    await userEvent.click(screen.getByText('Alice'));

    expect(useMessengerStore.getState().activeConversationId).toBe('conv-1');
  });

  it('archives a conversation from the actions menu', async () => {
    act(() => {
      seedConversations();
    });

    render(<ConversationList query="" />);

    const buttons = screen.getAllByLabelText('Conversation actions');
    await userEvent.click(buttons[0]);
    await userEvent.click(screen.getByText('Archive'));

    expect(useMessengerStore.getState().conversations['conv-1'].isArchived).toBe(true);
  });

  it('supports keyboard navigation between conversations', async () => {
    act(() => {
      seedConversations();
    });

    render(<ConversationList query="" />);
    const nav = screen.getByLabelText('Conversations');

    await userEvent.click(screen.getByText('Alice'));
    expect(useMessengerStore.getState().activeConversationId).toBe('conv-1');

    nav.focus();
    await userEvent.keyboard('{ArrowDown}');

    expect(useMessengerStore.getState().activeConversationId).toBe('conv-2');
  });
});
