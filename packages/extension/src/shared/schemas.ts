import { z } from 'zod';

export const ServiceTypeSchema = z.enum([
  'whatsapp',
  'telegram',
  'instagram',
  'imessage',
  'matrix',
  'sms',
  'messenger',
  'signal',
  'discord',
  'slack',
]);

export const AccountStatusSchema = z.enum(['connected', 'connecting', 'disconnected', 'error']);

export const AccountSchema = z.object({
  id: z.string().uuid(),
  service: ServiceTypeSchema,
  username: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().url().nullable(),
  status: AccountStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ContactSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  serviceContactId: z.string().min(1),
  displayName: z.string().min(1),
  username: z.string().min(1).nullable(),
  avatarUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ConversationTypeSchema = z.enum(['direct', 'group']);

export const ConversationSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  service: ServiceTypeSchema,
  type: ConversationTypeSchema,
  title: z.string().min(1).nullable(),
  participantIds: z.array(z.string().uuid()),
  lastMessageId: z.string().uuid().nullable(),
  unreadCount: z.number().int().min(0),
  isArchived: z.boolean(),
  isPinned: z.boolean(),
  isFavorite: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const MessageStatusSchema = z.enum(['sending', 'sent', 'delivered', 'read', 'failed']);

export const ReactionSchema = z.object({
  emoji: z.string().min(1),
  userId: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export const AttachmentTypeSchema = z.enum([
  'image',
  'video',
  'audio',
  'file',
  'location',
  'contact',
  'sticker',
]);

export const AttachmentSchema = z.object({
  id: z.string().uuid(),
  type: AttachmentTypeSchema,
  url: z.string().url().nullable(),
  name: z.string().min(1).nullable(),
  mimeType: z.string().min(1).nullable(),
  size: z.number().int().min(0).nullable(),
  createdAt: z.string().datetime(),
});

export const MessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  accountId: z.string().uuid(),
  senderId: z.string().min(1),
  text: z.string(),
  status: MessageStatusSchema,
  isFromMe: z.boolean(),
  replyToId: z.string().uuid().nullable(),
  reactions: z.array(ReactionSchema),
  attachments: z.array(AttachmentSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const NormalizedStateSchema = z.object({
  accounts: z.record(z.string().uuid(), AccountSchema),
  contacts: z.record(z.string().uuid(), ContactSchema),
  conversations: z.record(z.string().uuid(), ConversationSchema),
  messages: z.record(z.string().uuid(), MessageSchema),
  activeConversationId: z.string().uuid().nullable(),
});

export const ScheduledMessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  text: z.string().min(1),
  scheduledAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export const ReminderSchema = z.object({
  id: z.string().uuid(),
  messageId: z.string().uuid(),
  remindAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
