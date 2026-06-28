import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { NormalizedStateSchema } from '../../../extension/src/shared/schemas';
import type {
  Account,
  Attachment,
  Contact,
  Conversation,
  Message,
  MessageStatus,
  NormalizedState,
} from '../../../extension/src/shared/types';
import { generateUuid } from '../lib/uuid';

type AccountsMap = NormalizedState['accounts'];
type ContactsMap = NormalizedState['contacts'];
type ConversationsMap = NormalizedState['conversations'];
type MessagesMap = NormalizedState['messages'];

export interface MessageDraft {
  conversationId: string;
  text: string;
  replyToId?: string;
  attachments?: Attachment[];
}

export interface MessengerState extends NormalizedState {
  typing: Record<string, string[]>;
  replyToMessageId: string | null;
  editingMessageId: string | null;
}

export interface MessengerActions {
  setAccounts: (accounts: Account[]) => void;
  removeAccount: (accountId: string) => void;
  setContacts: (contacts: Contact[]) => void;
  upsertConversation: (conversation: Conversation) => void;
  upsertMessage: (message: Message) => void;
  setActiveConversationId: (id: string | null) => void;
  markRead: (conversationId: string) => void;
  toggleFavorite: (conversationId: string) => void;
  togglePin: (conversationId: string) => void;
  archiveConversation: (conversationId: string) => void;
  sendMessage: (draft: MessageDraft) => string;
  editMessage: (messageId: string, text: string) => void;
  deleteMessage: (messageId: string) => void;
  addReaction: (messageId: string, emoji: string, userId: string) => void;
  removeReaction: (messageId: string, emoji: string, userId: string) => void;
  setReplyToMessageId: (id: string | null) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  startEditing: (messageId: string) => void;
  stopEditing: () => void;
  setMessageStatus: (messageId: string, status: MessageStatus) => void;
  resetState: () => void;
  hydrate: (state: NormalizedState) => void;
}

export type MessengerStore = MessengerState & MessengerActions;

export const createInitialState = (): MessengerState => ({
  accounts: {} as AccountsMap,
  contacts: {} as ContactsMap,
  conversations: {} as ConversationsMap,
  messages: {} as MessagesMap,
  activeConversationId: null,
  typing: {},
  replyToMessageId: null,
  editingMessageId: null,
});

export const useMessengerStore = create<MessengerStore>()(
  immer((set) => ({
    ...createInitialState(),

    setAccounts: (accounts) =>
      set((state) => {
        state.accounts = {} as AccountsMap;
        for (const account of accounts) {
          state.accounts[account.id] = account;
        }
      }),

    removeAccount: (accountId) =>
      set((state) => {
        delete state.accounts[accountId];

        for (const contactId of Object.keys(state.contacts)) {
          if (state.contacts[contactId]?.accountId === accountId) {
            delete state.contacts[contactId];
          }
        }

        for (const conversationId of Object.keys(state.conversations)) {
          const conversation = state.conversations[conversationId];
          if (conversation?.accountId === accountId) {
            delete state.conversations[conversationId];
            for (const messageId of Object.keys(state.messages)) {
              if (state.messages[messageId]?.conversationId === conversationId) {
                delete state.messages[messageId];
              }
            }
          }
        }

        if (state.activeConversationId && !state.conversations[state.activeConversationId]) {
          state.activeConversationId = null;
        }
      }),

    setContacts: (contacts) =>
      set((state) => {
        state.contacts = {} as ContactsMap;
        for (const contact of contacts) {
          state.contacts[contact.id] = contact;
        }
      }),

    upsertConversation: (conversation) =>
      set((state) => {
        state.conversations[conversation.id] = conversation;
      }),

    upsertMessage: (message) =>
      set((state) => {
        const previous = state.messages[message.id];
        state.messages[message.id] = message;

        const conversation = state.conversations[message.conversationId];
        if (!conversation) return;

        const currentLastMessage = conversation.lastMessageId
          ? state.messages[conversation.lastMessageId]
          : null;

        const isLatest = !currentLastMessage || message.createdAt >= currentLastMessage.createdAt;
        if (isLatest) {
          conversation.lastMessageId = message.id;
          conversation.updatedAt = message.createdAt;
        }

        const wasUnreadIncoming = previous && !previous.isFromMe && previous.status !== 'read';
        const isUnreadIncoming = !message.isFromMe && message.status !== 'read';

        if (!previous && isUnreadIncoming) {
          conversation.unreadCount += 1;
        } else if (previous && wasUnreadIncoming && !isUnreadIncoming) {
          conversation.unreadCount = Math.max(0, conversation.unreadCount - 1);
        } else if (previous && !wasUnreadIncoming && isUnreadIncoming) {
          conversation.unreadCount += 1;
        }
      }),

    setActiveConversationId: (id) =>
      set((state) => {
        state.activeConversationId = id;
      }),

    markRead: (conversationId) =>
      set((state) => {
        const conversation = state.conversations[conversationId];
        if (!conversation) return;

        const now = new Date().toISOString();
        conversation.unreadCount = 0;
        conversation.updatedAt = now;

        for (const message of Object.values(state.messages)) {
          if (
            message.conversationId === conversationId &&
            !message.isFromMe &&
            message.status !== 'read'
          ) {
            message.status = 'read';
            message.updatedAt = now;
          }
        }
      }),

    toggleFavorite: (conversationId) =>
      set((state) => {
        const conversation = state.conversations[conversationId];
        if (!conversation) return;

        conversation.isFavorite = !conversation.isFavorite;
        conversation.updatedAt = new Date().toISOString();
      }),

    togglePin: (conversationId) =>
      set((state) => {
        const conversation = state.conversations[conversationId];
        if (!conversation) return;

        conversation.isPinned = !conversation.isPinned;
        conversation.updatedAt = new Date().toISOString();
      }),

    archiveConversation: (conversationId) =>
      set((state) => {
        const conversation = state.conversations[conversationId];
        if (!conversation) return;

        conversation.isArchived = true;
        conversation.updatedAt = new Date().toISOString();

        if (state.activeConversationId === conversationId) {
          state.activeConversationId = null;
        }
      }),

    sendMessage: (draft) => {
      const id = generateUuid();
      const now = new Date().toISOString();

      set((state) => {
        const conversation = state.conversations[draft.conversationId];
        if (!conversation) return;

        const account = state.accounts[conversation.accountId];
        const message: Message = {
          id,
          conversationId: draft.conversationId,
          accountId: conversation.accountId,
          senderId: account?.id ?? 'me',
          text: draft.text,
          status: 'sending',
          isFromMe: true,
          replyToId: draft.replyToId ?? null,
          reactions: [],
          attachments: draft.attachments ?? [],
          createdAt: now,
          updatedAt: now,
        };

        state.messages[id] = message;
        conversation.lastMessageId = id;
        conversation.updatedAt = now;
        state.replyToMessageId = null;
      });

      return id;
    },

    editMessage: (messageId, text) =>
      set((state) => {
        const message = state.messages[messageId];
        if (!message) return;

        message.text = text;
        message.updatedAt = new Date().toISOString();
      }),

    deleteMessage: (messageId) =>
      set((state) => {
        const message = state.messages[messageId];
        if (!message) return;

        const conversation = state.conversations[message.conversationId];
        if (conversation && conversation.lastMessageId === messageId) {
          const previous = Object.values(state.messages)
            .filter(
              (candidate) =>
                candidate.conversationId === message.conversationId && candidate.id !== messageId,
            )
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

          conversation.lastMessageId = previous?.id ?? null;
          conversation.updatedAt = previous?.createdAt ?? conversation.updatedAt;
        }

        delete state.messages[messageId];
      }),

    addReaction: (messageId, emoji, userId) =>
      set((state) => {
        const message = state.messages[messageId];
        if (!message) return;

        const existing = message.reactions.find(
          (reaction) => reaction.emoji === emoji && reaction.userId === userId,
        );
        if (!existing) {
          message.reactions.push({
            emoji,
            userId,
            createdAt: new Date().toISOString(),
          });
          message.updatedAt = new Date().toISOString();
        }
      }),

    removeReaction: (messageId, emoji, userId) =>
      set((state) => {
        const message = state.messages[messageId];
        if (!message) return;

        const index = message.reactions.findIndex(
          (reaction) => reaction.emoji === emoji && reaction.userId === userId,
        );
        if (index >= 0) {
          message.reactions.splice(index, 1);
          message.updatedAt = new Date().toISOString();
        }
      }),

    setReplyToMessageId: (id) =>
      set((state) => {
        state.replyToMessageId = id;
      }),

    setTyping: (conversationId, userId, isTyping) =>
      set((state) => {
        const list = state.typing[conversationId] ?? [];
        const next = isTyping
          ? [...new Set([...list, userId])]
          : list.filter((id) => id !== userId);

        if (next.length === 0) {
          delete state.typing[conversationId];
        } else {
          state.typing[conversationId] = next;
        }
      }),

    startEditing: (messageId) =>
      set((state) => {
        if (state.messages[messageId]) {
          state.editingMessageId = messageId;
          state.replyToMessageId = null;
        }
      }),

    stopEditing: () =>
      set((state) => {
        state.editingMessageId = null;
      }),

    setMessageStatus: (messageId, status) =>
      set((state) => {
        const message = state.messages[messageId];
        if (!message) return;

        message.status = status;
        message.updatedAt = new Date().toISOString();
      }),

    resetState: () =>
      set(() => ({
        ...createInitialState(),
      })),

    hydrate: (nextState) =>
      set(() => {
        const parsed = NormalizedStateSchema.parse(nextState);
        return { ...createInitialState(), ...parsed };
      }),
  })),
);
