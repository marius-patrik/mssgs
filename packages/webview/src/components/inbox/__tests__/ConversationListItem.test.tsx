import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account, Conversation } from '../../../../../extension/src/shared/types';
import { useMessengerStore } from '../../../stores/messengerStore';
import { ConversationListItem } from '../ConversationListItem';

const account: Account = {
  id: 'acc-1',
  service: 'whatsapp',
  username: 'self',
  displayName: 'Me',
  avatarUrl: null,
  status: 'connected',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const conversation: Conversation = {
  id: 'conv-1',
  service: 'whatsapp',
  accountId: account.id,
  type: 'direct',
  title: 'Alice',
  participantIds: ['contact-1'],
  lastMessageId: null,
  unreadCount: 2,
  isArchived: false,
  isPinned: false,
  isFavorite: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-03T00:00:00Z',
};

describe('ConversationListItem', () => {
  beforeEach(() => {
    act(() => {
      useMessengerStore.getState().resetState();
      useMessengerStore.getState().setAccounts([account]);
      useMessengerStore.getState().upsertConversation(conversation);
    });
  });

  it('renders title, unread count and service badge', () => {
    render(
      <ConversationListItem conversation={conversation} isActive={false} onSelect={vi.fn()} />,
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByLabelText('WhatsApp')).toBeInTheDocument();
  });

  it('calls onSelect when the row is clicked', async () => {
    const onSelect = vi.fn();
    render(
      <ConversationListItem conversation={conversation} isActive={false} onSelect={onSelect} />,
    );

    await userEvent.click(screen.getByText('Alice'));

    expect(onSelect).toHaveBeenCalledWith('conv-1');
  });

  it('toggles favorite when the favorite action is clicked', async () => {
    render(
      <ConversationListItem conversation={conversation} isActive={false} onSelect={vi.fn()} />,
    );

    await userEvent.click(screen.getByLabelText('Add to favorites'));

    expect(useMessengerStore.getState().conversations['conv-1'].isFavorite).toBe(true);
  });

  it('pins the conversation when the pin action is clicked', async () => {
    render(
      <ConversationListItem conversation={conversation} isActive={false} onSelect={vi.fn()} />,
    );

    await userEvent.click(screen.getByLabelText('Pin conversation'));

    expect(useMessengerStore.getState().conversations['conv-1'].isPinned).toBe(true);
  });

  it('archives the conversation from the dropdown menu', async () => {
    render(
      <ConversationListItem conversation={conversation} isActive={false} onSelect={vi.fn()} />,
    );

    await userEvent.click(screen.getByLabelText('More actions'));
    await userEvent.click(screen.getByText('Archive'));

    expect(useMessengerStore.getState().conversations['conv-1'].isArchived).toBe(true);
  });
});
