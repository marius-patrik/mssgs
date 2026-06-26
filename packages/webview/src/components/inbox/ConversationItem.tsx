import { Archive, Pin, Star } from 'lucide-react';
import type { JSX } from 'react';
import type { Conversation } from '../../../../extension/src/shared/types';
import { cn } from '../../lib/utils';
import { useMessengerStore } from '../../stores/messengerStore';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { ServiceBadge } from './ServiceBadge';

export interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  lastMessageText?: string | null;
  onSelect: (conversationId: string) => void;
}

function conversationInitials(conversation: { title: string | null }): string {
  const source = conversation.title ?? '?';
  return source
    .split(' ')
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function ConversationItem({
  conversation,
  isActive,
  lastMessageText,
  onSelect,
}: ConversationItemProps): JSX.Element {
  const toggleFavorite = useMessengerStore((state) => state.toggleFavorite);
  const togglePin = useMessengerStore((state) => state.togglePin);
  const archiveConversation = useMessengerStore((state) => state.archiveConversation);

  return (
    <div
      role="listitem"
      aria-selected={isActive}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-within:bg-accent focus-within:text-accent-foreground',
        isActive && 'bg-accent text-accent-foreground',
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(conversation.id)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none"
        aria-label={`Open conversation ${conversation.title ?? 'Untitled'}`}
      >
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={undefined} alt={conversation.title ?? 'Untitled'} />
          <AvatarFallback className="text-xs">{conversationInitials(conversation)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium">{conversation.title ?? 'Untitled'}</span>
            <ServiceBadge service={conversation.service} />
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {lastMessageText ?? (conversation.lastMessageId ? 'Message thread' : 'No messages yet')}
          </span>
        </div>
        {conversation.unreadCount > 0 && (
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
            {conversation.unreadCount}
          </span>
        )}
      </button>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label={conversation.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={conversation.isFavorite}
          onClick={() => toggleFavorite(conversation.id)}
        >
          <Star
            className={cn('h-3.5 w-3.5', conversation.isFavorite && 'fill-current text-amber-500')}
          />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label={conversation.isPinned ? 'Unpin conversation' : 'Pin conversation'}
          aria-pressed={conversation.isPinned}
          onClick={() => togglePin(conversation.id)}
        >
          <Pin className={cn('h-3.5 w-3.5', conversation.isPinned && 'fill-current')} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Archive conversation"
          onClick={() => archiveConversation(conversation.id)}
        >
          <Archive className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
