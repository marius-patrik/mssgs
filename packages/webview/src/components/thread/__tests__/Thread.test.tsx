import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMessengerStore } from '../../../stores/messengerStore';
import { Thread } from '../Thread';
import { conversation, createMockClient, makeMessage, seedThread } from './helpers';

describe('Thread', () => {
  beforeEach(() => {
    act(() => {
      useMessengerStore.getState().resetState();
    });
    seedThread();
  });

  it('renders a placeholder when no conversation is active', () => {
    act(() => {
      useMessengerStore.getState().setActiveConversationId(null);
    });

    render(<Thread client={createMockClient()} />);

    expect(screen.getByText('Select a conversation to start messaging.')).toBeInTheDocument();
  });

  it('renders the conversation header, messages and composer', () => {
    act(() => {
      useMessengerStore.getState().upsertMessage(makeMessage({ text: 'Hi!' }));
      useMessengerStore.getState().setActiveConversationId(conversation.id);
    });

    render(<Thread client={createMockClient()} />);

    expect(screen.getByLabelText('Close conversation')).toBeInTheDocument();
    expect(screen.getByText('Hi!')).toBeInTheDocument();
    expect(screen.getByLabelText('Message input')).toBeInTheDocument();
  });

  it('clears the active conversation when the close button is clicked', async () => {
    act(() => {
      useMessengerStore.getState().setActiveConversationId(conversation.id);
    });

    render(<Thread client={createMockClient()} />);

    await userEvent.click(screen.getByLabelText('Close conversation'));

    expect(useMessengerStore.getState().activeConversationId).toBeNull();
  });
});
