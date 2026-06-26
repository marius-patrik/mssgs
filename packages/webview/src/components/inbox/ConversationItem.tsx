import { Archive, MoreHorizontal, Pin, Star } from 'lucide-react';
import type { JSX, KeyboardEvent } from 'react';
import type { ConversationListItem } from '../../hooks/useConversationList';
import { cn } from '../../lib/utils';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ServiceBadge } from './ServiceBadge';

function conversationInitials(title: string | null): string {
  const source = title ?? '?';
  return source
    .split(' ')
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatTimeLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  const isThisWeek = now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000;
  if (isThisWeek) {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export interface ConversationItemProps {
  item: ConversationListItem;
  isActive: boolean;
  onSelect: (conversationId: string) => void;
  onTogglePin: (conversationId: string) => void;
  onToggleFavorite: (conversationId: string) => void;
  onArchive: (conversationId: string) => void;
}

export function ConversationItem({
  item,
  isActive,
  onSelect,
  onTogglePin,
  onToggleFavorite,
  onArchive,
}: ConversationItemProps): JSX.Element {
  const { conversation, lastMessage, service } = item;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(conversation.id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(conversation.id)}
      onKeyDown={handleKeyDown}
      className={cn(
        'group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive && 'bg-accent',
        conversation.isArchived && 'opacity-70',
      )}
      aria-current={isActive ? 'true' : undefined}
    >
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="text-xs">
            {conversationInitials(conversation.title)}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-0.5 -right-0.5">
          <ServiceBadge service={service} />
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{conversation.title ?? 'Untitled'}</span>
          {conversation.isPinned && (
            <Pin className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Pinned" />
          )}
          {conversation.isFavorite && (
            <Star
              className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400"
              aria-label="Favorite"
            />
          )}
          {lastMessage && (
            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
              {formatTimeLabel(lastMessage.createdAt)}
            </span>
          )}
        </div>
        <span className="truncate text-xs text-muted-foreground">
          {lastMessage?.text ?? 'No messages yet'}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {conversation.unreadCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
            {conversation.unreadCount}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="Conversation actions"
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onTogglePin(conversation.id)}>
              <Pin className="mr-2 h-4 w-4" />
              {conversation.isPinned ? 'Unpin' : 'Pin'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleFavorite(conversation.id)}>
              <Star className="mr-2 h-4 w-4" />
              {conversation.isFavorite ? 'Remove favorite' : 'Mark favorite'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onArchive(conversation.id)}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
