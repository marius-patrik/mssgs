import { useEffect, useRef } from 'react';
import type { Account, Conversation, Message } from '../../../extension/src/shared/types';
import { useMessengerStore } from '../stores/messengerStore';
import { InMemorySyncLayer } from '../stores/syncLayer';
import { MessengerClient } from './client';

export function useMessengerClient(): MessengerClient {
  const clientRef = useRef<MessengerClient | null>(null);

  if (!clientRef.current) {
    clientRef.current = new MessengerClient();
  }

  const client = clientRef.current;
  const syncRef = useRef<InMemorySyncLayer | null>(null);

  if (!syncRef.current) {
    syncRef.current = new InMemorySyncLayer(() => useMessengerStore.getState());
  }

  const sync = syncRef.current;

  useEffect(() => {
    client.connect();

    void client.request('getAccounts').then(({ accounts }) => {
      sync.syncAccounts(accounts as Account[]);
    });

    void client.request('getConversations').then(({ conversations }) => {
      for (const conversation of conversations as Conversation[]) {
        sync.syncConversation(conversation);
      }
    });

    return () => {
      client.disconnect();
    };
  }, [client, sync]);

  useEffect(() => {
    return client.onEvent((event) => {
      if (event.eventType === 'accounts') {
        sync.syncAccounts(event.payload as Account[]);
      } else if (event.eventType === 'conversations') {
        for (const conversation of event.payload as Conversation[]) {
          sync.syncConversation(conversation);
        }
      } else if (event.eventType === 'messages') {
        for (const message of event.payload as Message[]) {
          sync.syncMessage(message);
        }
      }
    });
  }, [client, sync]);

  return client;
}
