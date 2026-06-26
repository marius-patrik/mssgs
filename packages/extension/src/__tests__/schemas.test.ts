import { describe, expect, it } from 'vitest';
import {
  AccountSchema,
  AttachmentSchema,
  ContactSchema,
  ConversationSchema,
  MessageSchema,
  NormalizedStateSchema,
  ReactionSchema,
  ServiceTypeSchema,
} from '../shared/schemas.js';

const now = new Date().toISOString();

const validAccount = {
  id: '11111111-1111-1111-1111-111111111111',
  service: 'whatsapp',
  username: 'jane_doe',
  displayName: 'Jane Doe',
  avatarUrl: 'https://example.com/avatar.png',
  status: 'connected',
  createdAt: now,
  updatedAt: now,
};

const validContact = {
  id: '22222222-2222-2222-2222-222222222222',
  accountId: validAccount.id,
  serviceContactId: '+15551234567',
  displayName: 'John Smith',
  username: 'john_smith',
  avatarUrl: 'https://example.com/john.png',
  createdAt: now,
  updatedAt: now,
};

const validConversation = {
  id: '33333333-3333-3333-3333-333333333333',
  accountId: validAccount.id,
  service: 'whatsapp',
  type: 'direct',
  title: null,
  participantIds: [validContact.id],
  lastMessageId: null,
  unreadCount: 0,
  isArchived: false,
  isPinned: false,
  isFavorite: false,
  createdAt: now,
  updatedAt: now,
};

const validReaction = {
  emoji: '👍',
  userId: validContact.id,
  createdAt: now,
};

const validAttachment = {
  id: '44444444-4444-4444-4444-444444444444',
  type: 'image',
  url: 'https://example.com/photo.jpg',
  name: 'photo.jpg',
  mimeType: 'image/jpeg',
  size: 1024,
  createdAt: now,
};

const validMessage = {
  id: '55555555-5555-5555-5555-555555555555',
  conversationId: validConversation.id,
  accountId: validAccount.id,
  senderId: validContact.id,
  text: 'Hello world',
  status: 'sent',
  isFromMe: false,
  replyToId: null,
  reactions: [validReaction],
  attachments: [validAttachment],
  createdAt: now,
  updatedAt: now,
};

describe('ServiceTypeSchema', () => {
  it('accepts known service types', () => {
    expect(ServiceTypeSchema.parse('telegram')).toBe('telegram');
    expect(ServiceTypeSchema.parse('matrix')).toBe('matrix');
  });

  it('rejects unknown service types', () => {
    expect(() => ServiceTypeSchema.parse('unknown')).toThrow();
  });
});

describe('AccountSchema', () => {
  it('accepts a valid account', () => {
    expect(AccountSchema.parse(validAccount)).toEqual(validAccount);
  });

  it('rejects missing fields', () => {
    expect(() => AccountSchema.parse({ ...validAccount, username: '' })).toThrow();
    expect(() => AccountSchema.parse({ ...validAccount, status: 'offline' })).toThrow();
  });
});

describe('ContactSchema', () => {
  it('accepts a valid contact', () => {
    expect(ContactSchema.parse(validContact)).toEqual(validContact);
  });

  it('allows null username and avatar', () => {
    expect(ContactSchema.parse({ ...validContact, username: null, avatarUrl: null })).toBeDefined();
  });
});

describe('ConversationSchema', () => {
  it('accepts a valid direct conversation', () => {
    expect(ConversationSchema.parse(validConversation)).toEqual(validConversation);
  });

  it('accepts a group conversation with a title', () => {
    expect(
      ConversationSchema.parse({
        ...validConversation,
        type: 'group',
        title: 'Team chat',
        participantIds: [validContact.id, '66666666-6666-6666-6666-666666666666'],
      }),
    ).toBeDefined();
  });

  it('rejects negative unread count', () => {
    expect(() => ConversationSchema.parse({ ...validConversation, unreadCount: -1 })).toThrow();
  });
});

describe('MessageSchema', () => {
  it('accepts a valid message', () => {
    expect(MessageSchema.parse(validMessage)).toEqual(validMessage);
  });

  it('rejects invalid status', () => {
    expect(() => MessageSchema.parse({ ...validMessage, status: 'deleted' })).toThrow();
  });

  it('validates nested reactions and attachments', () => {
    expect(() =>
      MessageSchema.parse({
        ...validMessage,
        reactions: [{ ...validReaction, emoji: '' }],
      }),
    ).toThrow();

    expect(() =>
      MessageSchema.parse({
        ...validMessage,
        attachments: [{ ...validAttachment, type: 'invalid' }],
      }),
    ).toThrow();
  });
});

describe('ReactionSchema', () => {
  it('accepts a valid reaction', () => {
    expect(ReactionSchema.parse(validReaction)).toEqual(validReaction);
  });

  it('rejects empty emoji', () => {
    expect(() => ReactionSchema.parse({ ...validReaction, emoji: '' })).toThrow();
  });
});

describe('AttachmentSchema', () => {
  it('accepts a valid attachment', () => {
    expect(AttachmentSchema.parse(validAttachment)).toEqual(validAttachment);
  });

  it('allows null optional fields', () => {
    expect(
      AttachmentSchema.parse({
        ...validAttachment,
        url: null,
        name: null,
        mimeType: null,
        size: null,
      }),
    ).toBeDefined();
  });
});

describe('NormalizedStateSchema', () => {
  it('accepts a valid normalized state', () => {
    expect(
      NormalizedStateSchema.parse({
        accounts: { [validAccount.id]: validAccount },
        contacts: { [validContact.id]: validContact },
        conversations: { [validConversation.id]: validConversation },
        messages: { [validMessage.id]: validMessage },
        activeConversationId: validConversation.id,
      }),
    ).toBeDefined();
  });

  it('rejects state with invalid entity', () => {
    expect(() =>
      NormalizedStateSchema.parse({
        accounts: { [validAccount.id]: { ...validAccount, status: 'broken' } },
        contacts: {},
        conversations: {},
        messages: {},
        activeConversationId: null,
      }),
    ).toThrow();
  });
});
