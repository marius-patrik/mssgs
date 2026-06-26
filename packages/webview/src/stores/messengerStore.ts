import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { NormalizedStateSchema } from '../../../extension/src/shared/schemas';
import type {
  Account,
  Contact,
  Conversation,
  Message,
  NormalizedState,
} from '../../../extension/src/shared/types';

type AccountsMap = NormalizedState['accounts'];
type ContactsMap = NormalizedState['contacts'];
type ConversationsMap = NormalizedState['conversations'];
type MessagesMap = NormalizedState['messages'];

export interface MessengerState extends NormalizedState {}

export interface MessengerActions {
  setAccounts: (accounts: Account[]) => void;
  setContacts: (contacts: Contact[]) => void;
  upsertConversation: (conversation: Conversation) => void;
  upsertMessage: (message: Message) => void;
  setActiveConversationId: (id: string | null) => void;
  markRead: (conversationId: string) => void;
  toggleFavorite: (conversationId: string) => void;
  togglePin: (conversationId: string) => void;
  archiveConversation: (conversationId: string) => void;
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

        if (!currentLastMessage || message.createdAt >= currentLastMessage.createdAt) {
          conversation.lastMessageId = message.id;
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

        conversation.updatedAt = message.createdAt;
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

    resetState: () =>
      set(() => ({
        ...createInitialState(),
      })),

    hydrate: (nextState) =>
      set(() => {
        const parsed = NormalizedStateSchema.parse(nextState);
        return { ...parsed };
      }),
  })),
);
