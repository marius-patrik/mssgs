import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Conversation } from '../../../../../extension/src/shared/types';
import { useMessengerStore } from '../../../stores/messengerStore';
import { ConversationList } from '../ConversationList';

const conversations: Conversation[] = [
  {
    id: 'conv-1',
    service: 'matrix',
    accountId: 'acc-1',
    type: 'direct',
    title: 'Alpha',
    participantIds: ['contact-1'],
    lastMessageId: null,
    unreadCount: 0,
    isArchived: false,
    isPinned: false,
    isFavorite: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'conv-2',
    service: 'matrix',
    accountId: 'acc-1',
    type: 'direct',
    title: 'Beta',
    participantIds: ['contact-2'],
    lastMessageId: null,
    unreadCount: 0,
    isArchived: false,
    isPinned: false,
    isFavorite: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'conv-3',
    service: 'matrix',
    accountId: 'acc-1',
    type: 'direct',
    title: 'Gamma',
    participantIds: ['contact-3'],
    lastMessageId: null,
    unreadCount: 0,
    isArchived: false,
    isPinned: false,
    isFavorite: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

describe('ConversationList', () => {
  beforeEach(() => {
    act(() => {
      useMessengerStore.getState().resetState();
    });
  });

  it('renders all conversations', () => {
    render(
      <ConversationList
        conversations={conversations}
        activeConversationId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('navigates with arrow keys and selects with Enter', async () => {
    const onSelect = vi.fn();
    render(
      <ConversationList
        conversations={conversations}
        activeConversationId={null}
        onSelect={onSelect}
      />,
    );

    await userEvent.click(screen.getByText('Alpha'));
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(onSelect).toHaveBeenLastCalledWith('conv-2');
  });

  it('shows an empty state when there are no conversations', () => {
    render(<ConversationList conversations={[]} activeConversationId={null} onSelect={vi.fn()} />);

    expect(screen.getByText('No conversations found.')).toBeInTheDocument();
  });
});
