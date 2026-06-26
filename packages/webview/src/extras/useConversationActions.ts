import { useCallback } from 'react';
import type { MessengerClient } from '../messaging/client';
import { useMessengerStore } from '../stores/messengerStore';

export function useConversationActions(client?: MessengerClient) {
  const toggleFavorite = useCallback(
    (conversationId: string) => {
      useMessengerStore.getState().toggleFavorite(conversationId);

      const conversation = useMessengerStore.getState().conversations[conversationId];
      if (conversation && client) {
        void client.request('updateConversation', { conversation });
      }
    },
    [client],
  );

  const togglePin = useCallback(
    (conversationId: string) => {
      useMessengerStore.getState().togglePin(conversationId);

      const conversation = useMessengerStore.getState().conversations[conversationId];
      if (conversation && client) {
        void client.request('updateConversation', { conversation });
      }
    },
    [client],
  );

  const archiveConversation = useCallback(
    (conversationId: string) => {
      useMessengerStore.getState().archiveConversation(conversationId);

      const conversation = useMessengerStore.getState().conversations[conversationId];
      if (conversation && client) {
        void client.request('updateConversation', { conversation });
      }
    },
    [client],
  );

  return { toggleFavorite, togglePin, archiveConversation };
}
