import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Account, Contact, Conversation, Message } from '../../shared/types.js';
import { SqliteCache } from '../SqliteCache.js';

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

const contact: Contact = {
  id: '22222222-2222-2222-2222-222222222222',
  accountId: account.id,
  serviceContactId: '+15551234567',
  displayName: 'John Smith',
  username: 'john_smith',
  avatarUrl: null,
  createdAt: now,
  updatedAt: now,
};

const conversation: Conversation = {
  id: '33333333-3333-3333-3333-333333333333',
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

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
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
});

describe('SqliteCache', () => {
  let cache: SqliteCache;

  beforeEach(() => {
    cache = new SqliteCache(':memory:');
    cache.syncAccount(account);
    cache.syncConversation(conversation);
  });

  afterEach(() => {
    cache.close();
  });

  describe('schema and migrations', () => {
    it('creates all tables on construction', () => {
      cache.syncAccount(account);
      expect(cache.getAccount(account.id)).toEqual(account);
    });

    it('applies migrations idempotently', () => {
      const second = new SqliteCache(':memory:');
      second.close();
    });
  });

  describe('sync and read accounts', () => {
    it('stores and retrieves an account', () => {
      cache.syncAccount(account);
      expect(cache.getAccount(account.id)).toEqual(account);
    });

    it('updates an existing account', () => {
      cache.syncAccount(account);
      const updated = {
        ...account,
        status: 'disconnected' as const,
        updatedAt: new Date().toISOString(),
      };
      cache.syncAccount(updated);
      expect(cache.getAccount(account.id)).toEqual(updated);
    });

    it('returns all accounts sorted by display name', () => {
      cache.syncAccounts([account]);
      expect(cache.getAccounts()).toEqual([account]);
    });
  });

  describe('sync and read contacts', () => {
    it('stores and retrieves a contact', () => {
      cache.syncContact(contact);
      expect(cache.getContact(contact.id)).toEqual(contact);
    });

    it('returns all contacts', () => {
      cache.syncContacts([contact]);
      expect(cache.getContacts()).toEqual([contact]);
    });
  });

  describe('sync and read conversations', () => {
    it('stores and retrieves a conversation', () => {
      cache.syncConversation(conversation);
      expect(cache.getConversation(conversation.id)).toEqual(conversation);
    });

    it('updates an existing conversation', () => {
      cache.syncConversation(conversation);
      const updated = { ...conversation, isArchived: true, updatedAt: new Date().toISOString() };
      cache.syncConversation(updated);
      expect(cache.getConversation(conversation.id)).toEqual(updated);
    });

    it('returns conversations ordered by updated_at desc', () => {
      const older: Conversation = {
        ...conversation,
        id: '99999999-9999-9999-9999-999999999999',
        updatedAt: '2020-01-01T00:00:00.000Z',
      };
      cache.syncConversations([conversation, older]);
      const ids = cache.getConversations().map((c) => c.id);
      expect(ids).toEqual([conversation.id, older.id]);
    });
  });

  describe('sync and read messages', () => {
    it('stores and retrieves a message', () => {
      const message = makeMessage();
      cache.syncMessage(message);
      expect(cache.getMessage(message.id)).toEqual(message);
    });

    it('returns messages for a conversation in chronological order', () => {
      const first = makeMessage({
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        createdAt: '2024-01-01T00:00:00.000Z',
      });
      const second = makeMessage({
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        createdAt: '2024-01-02T00:00:00.000Z',
      });
      cache.syncMessages([second, first]);
      const result = cache.getMessagesForConversation(conversation.id);
      expect(result.map((m) => m.id)).toEqual([first.id, second.id]);
    });

    it('preserves reactions and attachments', () => {
      const message = makeMessage({
        reactions: [{ emoji: '👍', userId: contact.id, createdAt: now }],
        attachments: [
          {
            id: '77777777-7777-7777-7777-777777777777',
            type: 'image',
            url: 'https://example.com/photo.jpg',
            name: 'photo.jpg',
            mimeType: 'image/jpeg',
            size: 1024,
            createdAt: now,
          },
        ],
      });
      cache.syncMessage(message);
      expect(cache.getMessage(message.id)).toEqual(message);
    });
  });

  describe('read state', () => {
    it('stores and retrieves read state', () => {
      cache.syncReadState(conversation.id, {
        lastReadMessageId: makeMessage().id,
        lastReadAt: now,
        unreadCount: 0,
      });
      expect(cache.getReadState(conversation.id)).toEqual({
        conversationId: conversation.id,
        lastReadMessageId: makeMessage().id,
        lastReadAt: now,
        unreadCount: 0,
      });
    });

    it('merges partial read state updates', () => {
      cache.syncReadState(conversation.id, { unreadCount: 3 });
      cache.syncReadState(conversation.id, { lastReadAt: now });
      const state = cache.getReadState(conversation.id);
      expect(state?.unreadCount).toBe(3);
      expect(state?.lastReadAt).toBe(now);
    });
  });

  describe('full-text search', () => {
    it('finds messages by text', () => {
      const message = makeMessage({ text: 'The quick brown fox jumps' });
      cache.syncMessage(message);
      const results = cache.searchMessages('quick brown');
      expect(results).toHaveLength(1);
      expect(results[0]?.messageId).toBe(message.id);
    });

    it('supports prefix matches', () => {
      const message = makeMessage({ text: 'unbelievable news' });
      cache.syncMessage(message);
      const results = cache.searchMessages('unbel');
      expect(results).toHaveLength(1);
    });

    it('returns empty results for missing terms', () => {
      cache.syncMessage(makeMessage({ text: 'hello' }));
      expect(cache.searchMessages('goodbye')).toEqual([]);
    });

    it('returns empty results for empty queries', () => {
      expect(cache.searchMessages('   ')).toEqual([]);
    });

    it('limits the result count', () => {
      const messages: Message[] = Array.from({ length: 5 }, (_, index) =>
        makeMessage({
          id: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa${index}`,
          text: `searchable term ${index}`,
        }),
      );
      cache.syncMessages(messages);
      expect(cache.searchMessages('searchable', 2)).toHaveLength(2);
    });
  });

  describe('snapshot and hydrate', () => {
    it('round-trips a normalized state through the cache', () => {
      const message = makeMessage();
      cache.syncAccount(account);
      cache.syncContact(contact);
      cache.syncConversation(conversation);
      cache.syncMessage(message);

      const snapshot = cache.snapshot();
      expect(snapshot.accounts[account.id]).toEqual(account);
      expect(snapshot.contacts[contact.id]).toEqual(contact);
      expect(snapshot.conversations[conversation.id]).toEqual(conversation);
      expect(snapshot.messages[message.id]).toEqual(message);
      expect(snapshot.activeConversationId).toBeNull();

      const fresh = new SqliteCache(':memory:');
      fresh.hydrate(snapshot);
      expect(fresh.snapshot()).toEqual(snapshot);
      fresh.close();
    });

    it('hydrate replaces existing data', () => {
      cache.syncAccount(account);
      cache.hydrate({
        accounts: {},
        contacts: {},
        conversations: {},
        messages: {},
        activeConversationId: null,
      });
      expect(cache.getAccounts()).toEqual([]);
    });

    it('throws on invalid state during hydrate', () => {
      expect(() =>
        cache.hydrate({
          accounts: {},
          contacts: {},
          conversations: {},
          messages: {},
          activeConversationId: 'not-a-uuid',
        }),
      ).toThrow();
    });
  });

  describe('clear', () => {
    it('removes all cached data but keeps the schema', () => {
      cache.syncAccount(account);
      cache.syncMessage(makeMessage());
      cache.clear();
      expect(cache.getAccounts()).toEqual([]);
      expect(cache.getMessagesForConversation(conversation.id)).toEqual([]);
      // schema still usable
      cache.syncAccount(account);
      expect(cache.getAccount(account.id)).toEqual(account);
    });
  });
});
