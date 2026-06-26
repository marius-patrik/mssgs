import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMessengerStore } from '../../../stores/messengerStore';
import { TypingIndicator } from '../TypingIndicator';

describe('TypingIndicator', () => {
  beforeEach(() => {
    act(() => {
      useMessengerStore.getState().resetState();
    });
  });

  it('is hidden when nobody is typing', () => {
    render(<TypingIndicator conversationId="conv-1" />);

    expect(screen.queryByLabelText('Typing indicator')).not.toBeInTheDocument();
  });

  it('renders when a user is typing', () => {
    act(() => {
      useMessengerStore.getState().setTyping('conv-1', 'user-1', true);
    });

    render(<TypingIndicator conversationId="conv-1" />);

    expect(screen.getByLabelText('Typing indicator')).toBeInTheDocument();
  });
});
