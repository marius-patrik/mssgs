import type { JSX, KeyboardEvent } from 'react';
import { useConversationList } from '../../hooks/useConversationList';
import { useMessengerStore } from '../../stores/messengerStore';
import { ScrollArea } from '../ui/scroll-area';
import { ConversationItem } from './ConversationItem';

export interface ConversationListProps {
  query: string;
}

export function ConversationList({ query }: ConversationListProps): JSX.Element {
  const items = useConversationList({ query });
  const activeConversationId = useMessengerStore((state) => state.activeConversationId);
  const setActiveConversationId = useMessengerStore((state) => state.setActiveConversationId);
  const togglePin = useMessengerStore((state) => state.togglePin);
  const toggleFavorite = useMessengerStore((state) => state.toggleFavorite);
  const archiveConversation = useMessengerStore((state) => state.archiveConversation);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (items.length === 0) {
      return;
    }

    const currentIndex = items.findIndex((item) => item.conversation.id === activeConversationId);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      setActiveConversationId(items[nextIndex].conversation.id);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      setActiveConversationId(items[prevIndex].conversation.id);
    }
  };

  return (
    <ScrollArea className="flex-1" tabIndex={-1}>
      <nav className="flex flex-col gap-1 p-2" aria-label="Conversations" onKeyDown={handleKeyDown}>
        {items.map((item) => (
          <ConversationItem
            key={item.conversation.id}
            item={item}
            isActive={activeConversationId === item.conversation.id}
            onSelect={setActiveConversationId}
            onTogglePin={togglePin}
            onToggleFavorite={toggleFavorite}
            onArchive={archiveConversation}
          />
        ))}
        {items.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            No conversations found.
          </div>
        )}
      </nav>
    </ScrollArea>
  );
}
