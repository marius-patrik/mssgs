import { type JSX, useCallback, useEffect, useRef, useState } from 'react';
import type { Conversation } from '../../../../extension/src/shared/types';
import type { MessengerClient } from '../../messaging/client';
import { ScrollArea } from '../ui/scroll-area';
import { ConversationListItem } from './ConversationListItem';

export interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelect: (conversationId: string) => void;
  client?: MessengerClient;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelect,
  client,
}: ConversationListProps): JSX.Element {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const moveFocus = useCallback(
    (delta: number) => {
      if (conversations.length === 0) {
        return;
      }

      setFocusedIndex((previous) => {
        const next = previous + delta;
        return Math.max(0, Math.min(conversations.length - 1, next));
      });
    },
    [conversations.length],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (conversations.length === 0) {
        return;
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          moveFocus(1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          moveFocus(-1);
          break;
        case 'Home':
          event.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          event.preventDefault();
          setFocusedIndex(conversations.length - 1);
          break;
        case 'Enter':
          event.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < conversations.length) {
            onSelect(conversations[focusedIndex].id);
          }
          break;
        case 'Escape':
          setFocusedIndex(-1);
          break;
      }
    },
    [conversations, focusedIndex, moveFocus, onSelect],
  );

  useEffect(() => {
    if (focusedIndex < 0) {
      return;
    }

    const item = listRef.current?.querySelector<HTMLElement>(
      `[data-conversation-id="${conversations[focusedIndex]?.id}"]`,
    );
    item?.focus();
  }, [focusedIndex, conversations]);

  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
        <p>No conversations found.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div
        ref={listRef}
        role="list"
        aria-label="Conversations"
        onKeyDown={handleKeyDown}
        className="flex flex-col gap-1 p-2"
      >
        {conversations.map((conversation) => (
          <ConversationListItem
            key={conversation.id}
            client={client}
            conversation={conversation}
            isActive={activeConversationId === conversation.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
