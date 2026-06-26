import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type {
  Account,
  Contact,
  Conversation,
  Message,
} from '../../../../../extension/src/shared/types';
import { useMessengerStore } from '../../../stores/messengerStore';
import { useConversationDetails } from '../useConversationDetails';

const account: Account = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  service: 'whatsapp',
  username: 'self',
  displayName: 'Me',
  avatarUrl: null,
  status: 'connected',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const contact: Contact = {
  id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  accountId: account.id,
  serviceContactId: 'whatsapp-user',
  displayName: 'Alice',
  username: 'alice',
  avatarUrl: 'https://example.com/avatar.png',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const conversation: Conversation = {
  id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  accountId: account.id,
  type: 'direct',
  title: null,
  participantIds: [contact.id],
  lastMessageId: 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm',
  unreadCount: 1,
  isArchived: false,
  isPinned: false,
  isFavorite: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const message: Message = {
  id: 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm',
  conversationId: conversation.id,
  accountId: account.id,
  senderId: contact.id,
  text: 'Hello there',
  status: 'sent',
  isFromMe: false,
  replyToId: null,
  reactions: [],
  attachments: [],
  createdAt: '2024-01-01T12:34:00Z',
  updatedAt: '2024-01-01T12:34:00Z',
};

describe('useConversationDetails', () => {
  beforeEach(() => {
    act(() => {
      useMessengerStore.getState().resetState();
    });
  });

  it('resolves title, avatar and service from contacts and account', () => {
    act(() => {
      useMessengerStore.getState().setAccounts([account]);
      useMessengerStore.getState().setContacts([contact]);
      useMessengerStore.getState().upsertConversation(conversation);
      useMessengerStore.getState().upsertMessage(message);
    });

    const { result } = renderHook(() => useConversationDetails(conversation));

    expect(result.current.title).toBe('Alice');
    expect(result.current.initials).toBe('A');
    expect(result.current.avatarUrl).toBe(contact.avatarUrl);
    expect(result.current.service).toBe('whatsapp');
    expect(result.current.serviceMeta.label).toBe('WhatsApp');
  });

  it('builds a last-message preview', () => {
    act(() => {
      useMessengerStore.getState().setAccounts([account]);
      useMessengerStore.getState().setContacts([contact]);
      useMessengerStore.getState().upsertConversation(conversation);
      useMessengerStore.getState().upsertMessage(message);
    });

    const { result } = renderHook(() => useConversationDetails(conversation));

    expect(result.current.lastPreview).toBe('Hello there');
    expect(result.current.hasUnread).toBe(true);
  });

  it('prefixes outgoing messages with "You:"', () => {
    act(() => {
      useMessengerStore.getState().setAccounts([account]);
      useMessengerStore.getState().setContacts([contact]);
      useMessengerStore.getState().upsertConversation(conversation);
      useMessengerStore.getState().upsertMessage({ ...message, isFromMe: true, text: 'On my way' });
    });

    const { result } = renderHook(() => useConversationDetails(conversation));

    expect(result.current.lastPreview).toBe('You: On my way');
  });
});
