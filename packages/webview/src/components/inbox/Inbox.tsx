import { type JSX, useMemo, useState } from 'react';
import { useConversations } from '../../hooks/useConversations';
import type { MessengerClient } from '../../messaging/client';
import { useMessengerStore } from '../../stores/messengerStore';
import { AccountList } from './AccountList';
import { ConversationList } from './ConversationList';
import { InboxHeader } from './InboxHeader';

export interface InboxProps {
  onNewConversation: () => void;
  client?: MessengerClient;
}

export function Inbox({ onNewConversation, client }: InboxProps): JSX.Element {
  const [query, setQuery] = useState('');
  const conversations = useConversations();
  const activeConversationId = useMessengerStore((state) => state.activeConversationId);
  const setActiveConversationId = useMessengerStore((state) => state.setActiveConversationId);
  const markRead = useMessengerStore((state) => state.markRead);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const visible = conversations.filter((conversation) => !conversation.isArchived);

    if (!trimmed) {
      return visible;
    }

    return visible.filter((conversation) =>
      (conversation.title ?? '').toLowerCase().includes(trimmed),
    );
  }, [conversations, query]);

  const handleSelect = (conversationId: string): void => {
    setActiveConversationId(conversationId);
    markRead(conversationId);
  };

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r bg-card">
      <InboxHeader query={query} onQueryChange={setQuery} onNewConversation={onNewConversation} />
      <AccountList client={client} />
      <ConversationList
        client={client}
        conversations={filtered}
        activeConversationId={activeConversationId}
        onSelect={handleSelect}
      />
    </aside>
  );
}
