import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Conversation, Message } from '../../../../../extension/src/shared/types';
import { ConversationList } from '../../../components/inbox/ConversationList';
import { useMessengerStore } from '../../../stores/messengerStore';

const conversation1: Conversation = {
  id: 'conv-1',
  accountId: 'acc-1',
  service: 'whatsapp',
  type: 'direct',
  title: 'Alice',
  participantIds: ['contact-1'],
  lastMessageId: 'msg-1',
  unreadCount: 2,
  isArchived: false,
  isPinned: true,
  isFavorite: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-03T00:00:00Z',
};

const conversation2: Conversation = {
  id: 'conv-2',
  accountId: 'acc-1',
  service: 'telegram',
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
};

const message: Message = {
  id: 'msg-1',
  conversationId: 'conv-1',
  accountId: 'acc-1',
  senderId: 'contact-1',
  text: 'Hello there',
  status: 'sent',
  isFromMe: false,
  replyToId: null,
  reactions: [],
  attachments: [],
  createdAt: '2024-01-03T00:00:00Z',
  updatedAt: '2024-01-03T00:00:00Z',
};

describe('ConversationList', () => {
  beforeEach(() => {
    act(() => {
      useMessengerStore.getState().resetState();
    });
  });

  it('renders conversations and filters archived ones', () => {
    render(<ConversationList conversations={[conversation1, conversation2]} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('filters conversations by search query', async () => {
    act(() => {
      useMessengerStore.getState().upsertMessage(message);
    });

    render(<ConversationList conversations={[conversation1, conversation2]} />);

    await userEvent.type(screen.getByLabelText('Search messages'), 'Hello');

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('filters by conversation title', async () => {
    render(<ConversationList conversations={[conversation1, conversation2]} />);

    await userEvent.type(screen.getByLabelText('Search messages'), 'Bob');

    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('selects a conversation on click', async () => {
    render(<ConversationList conversations={[conversation1, conversation2]} />);

    await userEvent.click(screen.getByText('Alice'));

    expect(useMessengerStore.getState().activeConversationId).toBe('conv-1');
  }, 10000);

  it('clears search on escape key', async () => {
    render(<ConversationList conversations={[conversation1, conversation2]} />);

    const search = screen.getByLabelText('Search messages');
    await userEvent.type(search, 'Alice');
    expect(search).toHaveValue('Alice');

    const list = screen.getByLabelText('Conversations');
    list.focus();
    await userEvent.keyboard('{Escape}');
    expect(search).toHaveValue('');
  });
});
