import { useMemo } from 'react';
import type {
  Account,
  Conversation,
  Message,
  ServiceType,
} from '../../../extension/src/shared/types';
import { useMessengerStore } from '../stores/messengerStore';

export interface ConversationListItem {
  conversation: Conversation;
  account: Account | undefined;
  lastMessage: Message | undefined;
  service: ServiceType | undefined;
}

export interface UseConversationListOptions {
  query?: string;
  includeArchived?: boolean;
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function useConversationList(
  options: UseConversationListOptions = {},
): ConversationListItem[] {
  const { query = '', includeArchived = false } = options;
  const conversations = useMessengerStore((state) => state.conversations);
  const accounts = useMessengerStore((state) => state.accounts);
  const messages = useMessengerStore((state) => state.messages);

  return useMemo(() => {
    const normalized = normalizeQuery(query);
    const list = Object.values(conversations)
      .filter((conversation) => includeArchived || !conversation.isArchived)
      .filter((conversation) => {
        if (!normalized) {
          return true;
        }

        const title = (conversation.title ?? '').toLowerCase();
        const lastMessage = conversation.lastMessageId
          ? messages[conversation.lastMessageId]
          : undefined;
        const text = (lastMessage?.text ?? '').toLowerCase();

        return title.includes(normalized) || text.includes(normalized);
      })
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1;
        }

        if (a.isFavorite !== b.isFavorite) {
          return a.isFavorite ? -1 : 1;
        }

        const aTime = new Date(a.updatedAt).getTime();
        const bTime = new Date(b.updatedAt).getTime();

        return bTime - aTime;
      })
      .map((conversation): ConversationListItem => {
        const account = accounts[conversation.accountId];
        const lastMessage = conversation.lastMessageId
          ? messages[conversation.lastMessageId]
          : undefined;

        return {
          conversation,
          account,
          lastMessage,
          service: account?.service,
        };
      });

    return list;
  }, [conversations, accounts, messages, query, includeArchived]);
}
