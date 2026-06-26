import { Search } from 'lucide-react';
import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Conversation } from '../../../../extension/src/shared/types';
import { cn } from '../../lib/utils';
import { useMessengerStore } from '../../stores/messengerStore';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { ConversationItem } from './ConversationItem';

export interface ConversationListProps {
  conversations: Conversation[];
  className?: string;
}

function getLastMessageText(
  conversation: Conversation,
  messages: ReturnType<typeof useMessengerStore.getState>['messages'],
): string | null {
  if (!conversation.lastMessageId) {
    return null;
  }
  const message = messages[conversation.lastMessageId];
  return message?.text ?? null;
}

export function ConversationList({ conversations, className }: ConversationListProps): JSX.Element {
  const messages = useMessengerStore((state) => state.messages);
  const activeConversationId = useMessengerStore((state) => state.activeConversationId);
  const setActiveConversationId = useMessengerStore((state) => state.setActiveConversationId);
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return conversations.filter((conversation) => !conversation.isArchived);
    }

    return conversations.filter((conversation) => {
      if (conversation.isArchived) {
        return false;
      }
      const text = (conversation.title ?? '').toLowerCase();
      const lastMessage = conversation.lastMessageId
        ? (messages[conversation.lastMessageId]?.text ?? '').toLowerCase()
        : '';
      return text.includes(trimmed) || lastMessage.includes(trimmed);
    });
  }, [conversations, query, messages]);

  const handleSelect = useCallback(
    (conversationId: string) => {
      setActiveConversationId(conversationId);
    },
    [setActiveConversationId],
  );

  const focusItem = useCallback((conversationId: string | null) => {
    if (!conversationId) {
      listRef.current?.focus();
      return;
    }
    const element = itemRefs.current.get(conversationId);
    element?.querySelector('button')?.focus();
    element?.scrollIntoView({ block: 'nearest' });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) {
        return;
      }

      const activeElement = document.activeElement;
      const isInsideList = listRef.current?.contains(activeElement) ?? false;
      if (!isInsideList) {
        return;
      }

      event.preventDefault();

      const currentIndex = filtered.findIndex((c) => c.id === activeConversationId);

      if (event.key === 'ArrowDown') {
        const next = filtered[currentIndex + 1] ?? filtered[0];
        if (next) {
          setActiveConversationId(next.id);
          focusItem(next.id);
        }
      } else if (event.key === 'ArrowUp') {
        const previous = filtered[currentIndex - 1] ?? filtered[filtered.length - 1];
        if (previous) {
          setActiveConversationId(previous.id);
          focusItem(previous.id);
        }
      } else if (event.key === 'Enter' && activeConversationId) {
        handleSelect(activeConversationId);
      } else if (event.key === 'Escape') {
        setQuery('');
      }
    };

    const list = listRef.current;
    list?.addEventListener('keydown', handleKeyDown);
    return () => list?.removeEventListener('keydown', handleKeyDown);
  }, [activeConversationId, filtered, focusItem, handleSelect, setActiveConversationId]);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="relative px-3 py-2">
        <Search className="absolute left-[1.375rem] top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search messages…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-9 pl-9 text-sm"
          aria-label="Search messages"
        />
      </div>

      <ScrollArea className="flex-1">
        <div
          ref={listRef}
          role="listbox"
          tabIndex={0}
          className="flex flex-col gap-1 p-2 outline-none"
          aria-label="Conversations"
        >
          {filtered.map((conversation) => (
            <div
              key={conversation.id}
              ref={(element) => {
                if (element) {
                  itemRefs.current.set(conversation.id, element);
                } else {
                  itemRefs.current.delete(conversation.id);
                }
              }}
            >
              <ConversationItem
                conversation={conversation}
                isActive={activeConversationId === conversation.id}
                lastMessageText={getLastMessageText(conversation, messages)}
                onSelect={handleSelect}
              />
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              {query ? 'No conversations match your search.' : 'No conversations yet.'}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
