import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessengerStore } from '../../../stores/messengerStore';
import { MessageBubble } from '../MessageBubble';
import { makeMessage, seedThread } from './helpers';

describe('MessageBubble', () => {
  beforeEach(() => {
    act(() => {
      useMessengerStore.getState().resetState();
    });
    seedThread();
  });

  it('renders incoming message text and sender name', () => {
    const message = makeMessage({ text: 'Hey there' });
    render(
      <MessageBubble
        message={message}
        currentUserId="me"
        onReply={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReact={vi.fn()}
      />,
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Hey there')).toBeInTheDocument();
  });

  it('renders outgoing message with read receipt', () => {
    const message = makeMessage({ isFromMe: true, senderId: 'me', status: 'read' });
    render(
      <MessageBubble
        message={message}
        currentUserId="me"
        onReply={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReact={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Read')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('calls onReply when the reply button is clicked', async () => {
    const onReply = vi.fn();
    render(
      <MessageBubble
        message={makeMessage()}
        currentUserId="me"
        onReply={onReply}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReact={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByLabelText('Reply'));

    expect(onReply).toHaveBeenCalledTimes(1);
  });

  it('calls onReact with the selected emoji', async () => {
    const onReact = vi.fn();
    render(
      <MessageBubble
        message={makeMessage()}
        currentUserId="me"
        onReply={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReact={onReact}
      />,
    );

    await userEvent.click(screen.getByLabelText('React'));
    await userEvent.click(screen.getByRole('menuitem', { name: /👍/u }));

    expect(onReact).toHaveBeenCalledWith('👍');
  });
});
