import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMessengerStore } from '../../../stores/messengerStore';
import { Composer } from '../Composer';
import { conversation, createMockClient, makeMessage, seedThread } from './helpers';

describe('Composer', () => {
  beforeEach(() => {
    act(() => {
      useMessengerStore.getState().resetState();
    });
    seedThread();
  });

  it('sends a message when enter is pressed and calls the client', async () => {
    const client = createMockClient();
    render(<Composer client={client} conversationId={conversation.id} />);

    const input = screen.getByLabelText('Message input');
    await userEvent.type(input, 'Hello world');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      const messages = Object.values(useMessengerStore.getState().messages);
      expect(messages).toContainEqual(expect.objectContaining({ text: 'Hello world' }));
    });

    expect(client.request).toHaveBeenCalledWith('sendMessage', {
      conversationId: conversation.id,
      text: 'Hello world',
      replyToId: undefined,
      attachments: [],
    });
  });

  it('does not send empty messages', async () => {
    const client = createMockClient();
    render(<Composer client={client} conversationId={conversation.id} />);

    await userEvent.click(screen.getByLabelText('Send message'));

    expect(client.request).not.toHaveBeenCalled();
  });

  it('clears the reply target when a message is sent', async () => {
    const client = createMockClient();
    act(() => {
      useMessengerStore.getState().setReplyToMessageId('reply-target');
    });

    render(<Composer client={client} conversationId={conversation.id} />);

    await userEvent.type(screen.getByLabelText('Message input'), 'Reply text');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(useMessengerStore.getState().replyToMessageId).toBeNull();
    });

    expect(client.request).toHaveBeenCalledWith(
      'sendMessage',
      expect.objectContaining({ replyToId: 'reply-target' }),
    );
  });

  it('sends an edit when editing a message', async () => {
    const client = createMockClient();
    const message = makeMessage({ isFromMe: true, senderId: 'me', text: 'Original' });
    act(() => {
      useMessengerStore.getState().upsertMessage(message);
      useMessengerStore.getState().startEditing(message.id);
    });

    render(<Composer client={client} conversationId={conversation.id} />);

    const input = screen.getByLabelText('Message input');
    await userEvent.clear(input);
    await userEvent.type(input, 'Edited');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(useMessengerStore.getState().messages[message.id].text).toBe('Edited');
    });

    expect(client.request).toHaveBeenCalledWith('editMessage', {
      messageId: message.id,
      text: 'Edited',
    });
  });
});
