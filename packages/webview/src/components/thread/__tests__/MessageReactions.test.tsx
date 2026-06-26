import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MessageReactions } from '../MessageReactions';
import { makeMessage } from './helpers';

describe('MessageReactions', () => {
  it('renders aggregated reactions', () => {
    const message = makeMessage({
      reactions: [
        { emoji: '👍', userId: 'user-1', createdAt: new Date().toISOString() },
        { emoji: '👍', userId: 'user-2', createdAt: new Date().toISOString() },
        { emoji: '❤️', userId: 'user-1', createdAt: new Date().toISOString() },
      ],
    });

    render(<MessageReactions message={message} currentUserId="user-1" onToggle={vi.fn()} />);

    expect(screen.getByLabelText('👍 reaction, count 2')).toBeInTheDocument();
    expect(screen.getByLabelText('❤️ reaction, count 1')).toBeInTheDocument();
  });

  it('calls onToggle when a reaction is clicked', async () => {
    const onToggle = vi.fn();
    const message = makeMessage({
      reactions: [{ emoji: '👍', userId: 'user-1', createdAt: new Date().toISOString() }],
    });

    render(<MessageReactions message={message} currentUserId="user-1" onToggle={onToggle} />);

    await userEvent.click(screen.getByLabelText('👍 reaction, count 1'));

    expect(onToggle).toHaveBeenCalledWith('👍');
  });
});
