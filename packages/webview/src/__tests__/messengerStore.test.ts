import { beforeEach, describe, expect, it } from 'vitest';
import type { Account, Conversation, Message } from '../../../extension/src/shared/types';
import { createInitialState, useMessengerStore } from '../stores/messengerStore';
import { InMemorySyncLayer } from '../stores/syncLayer';

const now = new Date().toISOString();

const account: Account = {
  id: '11111111-1111-1111-1111-111111111111',
  service: 'whatsapp',
  username: 'self',
  displayName: 'Me',
  avatarUrl: null,
  status: 'connected',
  createdAt: now,
  updatedAt: now,
};

const conversation: Conversation = {
  id: '22222222-2222-2222-2222-222222222222',
  accountId: account.id,
  service: account.service,
  type: 'direct',
  title: null,
  participantIds: ['33333333-3333-3333-3333-333333333333'],
  lastMessageId: null,
  unreadCount: 0,
  isArchived: false,
  isPinned: false,
  isFavorite: false,
  createdAt: now,
  updatedAt: now,
};

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: '44444444-4444-4444-4444-444444444444',
  conversationId: conversation.id,
  accountId: account.id,
  senderId: conversation.participantIds[0],
  text: 'Hello',
  status: 'sent',
  isFromMe: false,
  replyToId: null,
  reactions: [],
  attachments: [],
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

describe('messengerStore', () => {
  beforeEach(() => {
    useMessengerStore.setState(createInitialState());
  });

  it('starts with empty normalized state', () => {
    const state = useMessengerStore.getState();
    expect(Object.keys(state.accounts)).toHaveLength(0);
    expect(Object.keys(state.conversations)).toHaveLength(0);
    expect(Object.keys(state.messages)).toHaveLength(0);
    expect(state.activeConversationId).toBeNull();
  });

  it('setAccounts replaces the account map', () => {
    useMessengerStore.getState().setAccounts([account]);
    expect(useMessengerStore.getState().accounts[account.id]).toEqual(account);

    useMessengerStore.getState().setAccounts([]);
    expect(Object.keys(useMessengerStore.getState().accounts)).toHaveLength(0);
  });

  it('upsertConversation stores a conversation', () => {
    useMessengerStore.getState().upsertConversation(conversation);
    expect(useMessengerStore.getState().conversations[conversation.id]).toEqual(conversation);
  });

  it('upsertMessage stores a message and updates conversation metadata', () => {
    useMessengerStore.getState().upsertConversation(conversation);
    const message = makeMessage();

    useMessengerStore.getState().upsertMessage(message);

    const state = useMessengerStore.getState();
    expect(state.messages[message.id]).toEqual(message);
    expect(state.conversations[conversation.id].lastMessageId).toBe(message.id);
    expect(state.conversations[conversation.id].unreadCount).toBe(1);
  });

  it('does not increment unread count for messages from me', () => {
    useMessengerStore.getState().upsertConversation(conversation);
    const message = makeMessage({ isFromMe: true, senderId: account.id });

    useMessengerStore.getState().upsertMessage(message);

    expect(useMessengerStore.getState().conversations[conversation.id].unreadCount).toBe(0);
  });

  it('does not double-count unread messages on repeated upsert', () => {
    useMessengerStore.getState().upsertConversation(conversation);
    const message = makeMessage();

    useMessengerStore.getState().upsertMessage(message);
    useMessengerStore.getState().upsertMessage(message);

    expect(useMessengerStore.getState().conversations[conversation.id].unreadCount).toBe(1);
  });

  it('adjusts unread count when a message status changes', () => {
    useMessengerStore.getState().upsertConversation(conversation);
    const message = makeMessage();

    useMessengerStore.getState().upsertMessage(message);
    useMessengerStore.getState().upsertMessage({ ...message, status: 'read' });

    expect(useMessengerStore.getState().conversations[conversation.id].unreadCount).toBe(0);
  });

  it('sets active conversation id', () => {
    useMessengerStore.getState().setActiveConversationId(conversation.id);
    expect(useMessengerStore.getState().activeConversationId).toBe(conversation.id);
  });

  it('markRead clears unread count and marks messages read', () => {
    useMessengerStore.getState().upsertConversation(conversation);
    const message = makeMessage();
    useMessengerStore.getState().upsertMessage(message);

    useMessengerStore.getState().markRead(conversation.id);

    const state = useMessengerStore.getState();
    expect(state.conversations[conversation.id].unreadCount).toBe(0);
    expect(state.messages[message.id].status).toBe('read');
  });

  it('toggleFavorite flips the favorite flag', () => {
    useMessengerStore.getState().upsertConversation(conversation);
    useMessengerStore.getState().toggleFavorite(conversation.id);
    expect(useMessengerStore.getState().conversations[conversation.id].isFavorite).toBe(true);

    useMessengerStore.getState().toggleFavorite(conversation.id);
    expect(useMessengerStore.getState().conversations[conversation.id].isFavorite).toBe(false);
  });

  it('togglePin flips the pinned flag', () => {
    useMessengerStore.getState().upsertConversation(conversation);
    useMessengerStore.getState().togglePin(conversation.id);
    expect(useMessengerStore.getState().conversations[conversation.id].isPinned).toBe(true);

    useMessengerStore.getState().togglePin(conversation.id);
    expect(useMessengerStore.getState().conversations[conversation.id].isPinned).toBe(false);
  });

  it('archiveConversation archives and clears active selection', () => {
    useMessengerStore.getState().upsertConversation(conversation);
    useMessengerStore.getState().setActiveConversationId(conversation.id);

    useMessengerStore.getState().archiveConversation(conversation.id);

    const state = useMessengerStore.getState();
    expect(state.conversations[conversation.id].isArchived).toBe(true);
    expect(state.activeConversationId).toBeNull();
  });

  it('resetState restores the initial state', () => {
    useMessengerStore.getState().setAccounts([account]);
    useMessengerStore.getState().resetState();
    expect(Object.keys(useMessengerStore.getState().accounts)).toHaveLength(0);
  });

  it('hydrate validates and replaces state', () => {
    const state = {
      accounts: { [account.id]: account },
      contacts: {},
      conversations: { [conversation.id]: conversation },
      messages: {},
      activeConversationId: null,
    };

    useMessengerStore.getState().hydrate(state);

    expect(useMessengerStore.getState().accounts[account.id]).toEqual(account);
    expect(useMessengerStore.getState().conversations[conversation.id]).toEqual(conversation);
  });

  it('hydrate throws on invalid state', () => {
    expect(() =>
      useMessengerStore.getState().hydrate({
        accounts: {},
        contacts: {},
        conversations: {},
        messages: {},
        activeConversationId: 'not-a-uuid',
      }),
    ).toThrow();
  });
});

describe('InMemorySyncLayer', () => {
  beforeEach(() => {
    useMessengerStore.setState(createInitialState());
  });

  it('syncs accounts, conversations and messages', () => {
    const layer = new InMemorySyncLayer(() => useMessengerStore.getState());
    const message = makeMessage();

    layer.syncAccounts([account]);
    layer.syncConversation(conversation);
    layer.syncMessage(message);

    const snapshot = layer.snapshot();
    expect(snapshot.accounts[account.id]).toEqual(account);
    expect(snapshot.conversations[conversation.id]).toEqual({
      ...conversation,
      lastMessageId: message.id,
      unreadCount: 1,
      updatedAt: message.createdAt,
    });
    expect(snapshot.messages[message.id]).toEqual(message);
  });

  it('hydrate and snapshot round-trip', () => {
    const layer = new InMemorySyncLayer(() => useMessengerStore.getState());
    useMessengerStore.getState().setAccounts([account]);
    useMessengerStore.getState().upsertConversation(conversation);

    const snapshot = layer.snapshot();
    layer.hydrate(snapshot);

    expect(layer.snapshot()).toEqual(snapshot);
  });
});

describe('messengerStore thread actions', () => {
  beforeEach(() => {
    useMessengerStore.setState(createInitialState());
  });

  it('sendMessage creates an optimistic outgoing message', () => {
    useMessengerStore.getState().setAccounts([account]);
    useMessengerStore.getState().upsertConversation(conversation);

    const messageId = useMessengerStore.getState().sendMessage({
      conversationId: conversation.id,
      text: 'Hi there',
    });

    const state = useMessengerStore.getState();
    const message = state.messages[messageId];
    expect(message).toBeDefined();
    expect(message.text).toBe('Hi there');
    expect(message.isFromMe).toBe(true);
    expect(message.status).toBe('sending');
    expect(conversation.id).toBe(message.conversationId);
    expect(state.conversations[conversation.id].lastMessageId).toBe(messageId);
  });

  it('sendMessage includes replyToId and attachments', () => {
    useMessengerStore.getState().setAccounts([account]);
    useMessengerStore.getState().upsertConversation(conversation);

    const messageId = useMessengerStore.getState().sendMessage({
      conversationId: conversation.id,
      text: 'See attached',
      replyToId: 'reply-target',
      attachments: [
        {
          id: 'att-1',
          type: 'image',
          url: 'data:image/png;base64,abc',
          name: 'photo.png',
          mimeType: 'image/png',
          size: 1234,
          createdAt: now,
        },
      ],
    });

    const message = useMessengerStore.getState().messages[messageId];
    expect(message.replyToId).toBe('reply-target');
    expect(message.attachments).toHaveLength(1);
    expect(message.attachments[0].name).toBe('photo.png');
  });

  it('editMessage updates text and updatedAt', () => {
    useMessengerStore.getState().upsertConversation(conversation);
    const message = makeMessage();
    useMessengerStore.getState().upsertMessage(message);

    useMessengerStore.getState().editMessage(message.id, 'Updated text');

    expect(useMessengerStore.getState().messages[message.id].text).toBe('Updated text');
    expect(useMessengerStore.getState().messages[message.id].updatedAt).not.toBe(message.createdAt);
  });

  it('deleteMessage removes the message and updates lastMessageId', () => {
    useMessengerStore.getState().upsertConversation(conversation);
    const first = makeMessage({
      id: 'msg-first',
      text: 'First',
      createdAt: '2024-01-01T00:00:00Z',
    });
    const second = makeMessage({
      id: 'msg-second',
      text: 'Second',
      createdAt: '2024-01-01T00:01:00Z',
    });
    useMessengerStore.getState().upsertMessage(first);
    useMessengerStore.getState().upsertMessage(second);

    useMessengerStore.getState().deleteMessage(second.id);

    const state = useMessengerStore.getState();
    expect(state.messages[second.id]).toBeUndefined();
    expect(state.conversations[conversation.id].lastMessageId).toBe(first.id);
  });

  it('addReaction and removeReaction manage reactions', () => {
    useMessengerStore.getState().upsertConversation(conversation);
    const message = makeMessage();
    useMessengerStore.getState().upsertMessage(message);

    useMessengerStore.getState().addReaction(message.id, '👍', 'user-1');
    expect(useMessengerStore.getState().messages[message.id].reactions).toHaveLength(1);

    useMessengerStore.getState().addReaction(message.id, '👍', 'user-1');
    expect(useMessengerStore.getState().messages[message.id].reactions).toHaveLength(1);

    useMessengerStore.getState().removeReaction(message.id, '👍', 'user-1');
    expect(useMessengerStore.getState().messages[message.id].reactions).toHaveLength(0);
  });

  it('setTyping adds and removes typing users per conversation', () => {
    useMessengerStore.getState().setTyping('conv-1', 'user-1', true);
    expect(useMessengerStore.getState().typing['conv-1']).toEqual(['user-1']);

    useMessengerStore.getState().setTyping('conv-1', 'user-2', true);
    expect(useMessengerStore.getState().typing['conv-1']).toEqual(['user-1', 'user-2']);

    useMessengerStore.getState().setTyping('conv-1', 'user-1', false);
    expect(useMessengerStore.getState().typing['conv-1']).toEqual(['user-2']);

    useMessengerStore.getState().setTyping('conv-1', 'user-2', false);
    expect(useMessengerStore.getState().typing['conv-1']).toBeUndefined();
  });

  it('startEditing and stopEditing manage the editing message id', () => {
    useMessengerStore.getState().upsertConversation(conversation);
    const message = makeMessage();
    useMessengerStore.getState().upsertMessage(message);

    useMessengerStore.getState().startEditing(message.id);
    expect(useMessengerStore.getState().editingMessageId).toBe(message.id);

    useMessengerStore.getState().stopEditing();
    expect(useMessengerStore.getState().editingMessageId).toBeNull();
  });

  it('setMessageStatus updates message status', () => {
    useMessengerStore.getState().upsertConversation(conversation);
    const message = makeMessage({ status: 'sending' });
    useMessengerStore.getState().upsertMessage(message);

    useMessengerStore.getState().setMessageStatus(message.id, 'sent');
    expect(useMessengerStore.getState().messages[message.id].status).toBe('sent');

    useMessengerStore.getState().setMessageStatus(message.id, 'failed');
    expect(useMessengerStore.getState().messages[message.id].status).toBe('failed');
  });
});
