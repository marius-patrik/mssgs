import { vi } from 'vitest';
import type {
  Account,
  Contact,
  Conversation,
  Message,
} from '../../../../../extension/src/shared/types';
import type { MessengerClient } from '../../../messaging/client';
import { useMessengerStore } from '../../../stores/messengerStore';

export const now = new Date().toISOString();

export const account: Account = {
  id: '11111111-1111-1111-1111-111111111111',
  service: 'whatsapp',
  username: 'self',
  displayName: 'Me',
  avatarUrl: null,
  status: 'connected',
  createdAt: now,
  updatedAt: now,
};

export const contact: Contact = {
  id: '33333333-3333-3333-3333-333333333333',
  accountId: account.id,
  serviceContactId: 'alice',
  displayName: 'Alice',
  username: 'alice',
  avatarUrl: null,
  createdAt: now,
  updatedAt: now,
};

export const conversation: Conversation = {
  id: '22222222-2222-2222-2222-222222222222',
  accountId: account.id,
  service: account.service,
  type: 'direct',
  title: null,
  participantIds: [contact.id],
  lastMessageId: null,
  unreadCount: 0,
  isArchived: false,
  isPinned: false,
  isFavorite: false,
  createdAt: now,
  updatedAt: now,
};

export function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: '44444444-4444-4444-4444-444444444444',
    conversationId: conversation.id,
    accountId: account.id,
    senderId: contact.id,
    text: 'Hello',
    status: 'sent',
    isFromMe: false,
    replyToId: null,
    reactions: [],
    attachments: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function seedThread(): void {
  const store = useMessengerStore.getState();
  store.setAccounts([account]);
  store.setContacts([contact]);
  store.upsertConversation(conversation);
}

export function createMockClient(): MessengerClient {
  return {
    request: vi.fn().mockResolvedValue({}),
    connect: vi.fn(),
    disconnect: vi.fn(),
    onEvent: vi.fn().mockReturnValue(vi.fn()),
  } as unknown as MessengerClient;
}
