import type { z } from 'zod';
import type {
  AccountSchema,
  AccountStatusSchema,
  AttachmentSchema,
  AttachmentTypeSchema,
  ContactSchema,
  ConversationSchema,
  ConversationTypeSchema,
  MessageSchema,
  MessageStatusSchema,
  NormalizedStateSchema,
  ReactionSchema,
  ReminderSchema,
  ScheduledMessageSchema,
  ServiceTypeSchema,
} from './schemas.js';

export * from './messages.js';

export type ServiceType = z.infer<typeof ServiceTypeSchema>;
export type AccountStatus = z.infer<typeof AccountStatusSchema>;
export type Account = z.infer<typeof AccountSchema>;
export type Contact = z.infer<typeof ContactSchema>;
export type ConversationType = z.infer<typeof ConversationTypeSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type MessageStatus = z.infer<typeof MessageStatusSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Reaction = z.infer<typeof ReactionSchema>;
export type AttachmentType = z.infer<typeof AttachmentTypeSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type ScheduledMessage = z.infer<typeof ScheduledMessageSchema>;
export type Reminder = z.infer<typeof ReminderSchema>;
export type NormalizedState = z.infer<typeof NormalizedStateSchema>;
