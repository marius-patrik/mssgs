import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMessengerStore } from '../../../stores/messengerStore';
import { MessageList } from '../MessageList';
import { conversation, makeMessage, seedThread } from './helpers';

describe('MessageList', () => {
  beforeEach(() => {
    act(() => {
      useMessengerStore.getState().resetState();
    });
    seedThread();
  });

  it('shows an empty state when there are no messages', () => {
    render(<MessageList conversationId={conversation.id} />);

    expect(screen.getByText('No messages yet.')).toBeInTheDocument();
  });

  it('renders messages sorted by time', () => {
    act(() => {
      useMessengerStore
        .getState()
        .upsertMessage(
          makeMessage({ id: 'msg-2', text: 'Second', createdAt: '2024-01-01T00:01:00Z' }),
        );
      useMessengerStore
        .getState()
        .upsertMessage(
          makeMessage({ id: 'msg-1', text: 'First', createdAt: '2024-01-01T00:00:00Z' }),
        );
    });

    render(<MessageList conversationId={conversation.id} />);
    const bubbles = screen.getAllByTestId('message-bubble');

    expect(bubbles).toHaveLength(2);
    expect(bubbles[0]).toHaveTextContent('First');
    expect(bubbles[1]).toHaveTextContent('Second');
  });

  it('groups consecutive messages from the same sender', () => {
    act(() => {
      useMessengerStore
        .getState()
        .upsertMessage(makeMessage({ id: 'msg-1', text: 'A', createdAt: '2024-01-01T00:00:00Z' }));
      useMessengerStore
        .getState()
        .upsertMessage(makeMessage({ id: 'msg-2', text: 'B', createdAt: '2024-01-01T00:01:00Z' }));
    });

    render(<MessageList conversationId={conversation.id} />);

    expect(screen.getAllByText('Alice')).toHaveLength(1);
  });
});
