import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { useMessengerStore } from '../stores/messengerStore';

function seedConversations(): void {
  const store = useMessengerStore.getState();
  store.upsertConversation({
    id: 'conv-1',
    accountId: 'acc-1',
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
}

describe('App', () => {
  beforeEach(() => {
    act(() => {
      useMessengerStore.getState().resetState();
    });
  });

  it('renders the sidebar and main content placeholders', () => {
    render(<App />);

    expect(screen.getByText('mssgs')).toBeInTheDocument();
    expect(screen.getByLabelText('Search messages')).toBeInTheDocument();
    expect(screen.getByText('Welcome to mssgs')).toBeInTheDocument();
  });

  it('toggles the theme when the theme button is clicked', async () => {
    render(<App />);
    const button = screen.getByLabelText('Toggle theme');

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    await userEvent.click(button);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('renders conversations from the store and activates one on click', async () => {
    act(() => {
      seedConversations();
    });

    render(<App />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Alice'));

    expect(useMessengerStore.getState().activeConversationId).toBe('conv-1');
  });

  it('filters conversations by search query', async () => {
    act(() => {
      seedConversations();
    });

    render(<App />);
    const search = screen.getByLabelText('Search messages');

    await userEvent.type(search, 'Alice');

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });
});
