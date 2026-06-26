import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Conversation } from '../../../../../extension/src/shared/types';
import { ConversationItem } from '../../../components/inbox/ConversationItem';
import { useMessengerStore } from '../../../stores/messengerStore';

const conversation: Conversation = {
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

describe('ConversationItem', () => {
  beforeEach(() => {
    act(() => {
      useMessengerStore.getState().resetState();
    });
  });

  it('renders title, service badge, and unread count', () => {
    render(<ConversationItem conversation={conversation} isActive={false} onSelect={vi.fn()} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByLabelText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', async () => {
    const onSelect = vi.fn();
    render(<ConversationItem conversation={conversation} isActive={false} onSelect={onSelect} />);

    await userEvent.click(screen.getByText('Alice'));

    expect(onSelect).toHaveBeenCalledWith('conv-1');
  });

  it('toggles favorite when the star button is clicked', async () => {
    act(() => {
      useMessengerStore.getState().upsertConversation(conversation);
    });

    render(<ConversationItem conversation={conversation} isActive={false} onSelect={vi.fn()} />);

    await userEvent.click(screen.getByLabelText('Add to favorites'));

    expect(useMessengerStore.getState().conversations['conv-1']?.isFavorite).toBe(true);
  });

  it('archives the conversation when the archive button is clicked', async () => {
    act(() => {
      useMessengerStore.getState().upsertConversation(conversation);
    });

    render(<ConversationItem conversation={conversation} isActive={false} onSelect={vi.fn()} />);

    await userEvent.click(screen.getByLabelText('Archive conversation'));

    expect(useMessengerStore.getState().conversations['conv-1']?.isArchived).toBe(true);
  });
});
