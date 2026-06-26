import { Archive, Pin, Star } from 'lucide-react';
import { type JSX, useCallback } from 'react';
import type { Conversation } from '../../../../extension/src/shared/types';
import { cn } from '../../lib/utils';
import { useMessengerStore } from '../../stores/messengerStore';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useConversationDetails } from './useConversationDetails';

export interface ConversationListItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (conversationId: string) => void;
}

export function ConversationListItem({
  conversation,
  isActive,
  onSelect,
}: ConversationListItemProps): JSX.Element {
  const details = useConversationDetails(conversation);
  const toggleFavorite = useMessengerStore((state) => state.toggleFavorite);
  const togglePin = useMessengerStore((state) => state.togglePin);
  const archive = useMessengerStore((state) => state.archiveConversation);

  const handleClick = useCallback(() => {
    onSelect(conversation.id);
  }, [conversation.id, onSelect]);

  const handleFavorite = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      toggleFavorite(conversation.id);
    },
    [conversation.id, toggleFavorite],
  );

  const handlePin = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      togglePin(conversation.id);
    },
    [conversation.id, togglePin],
  );

  const handleArchive = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      archive(conversation.id);
    },
    [conversation.id, archive],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        onSelect(conversation.id);
      }
    },
    [conversation.id, onSelect],
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Open conversation with ${details.title}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        data-conversation-id={conversation.id}
        data-active={isActive}
        className={cn(
          'group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
          'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isActive && 'bg-accent',
        )}
      >
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10">
            {details.avatarUrl && <AvatarImage src={details.avatarUrl} alt={details.title} />}
            <AvatarFallback className="text-xs">{details.initials}</AvatarFallback>
          </Avatar>
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card',
              details.serviceMeta.bgClass,
            )}
            aria-label={details.serviceMeta.label}
          >
            <details.serviceMeta.Icon className="h-2.5 w-2.5 text-white" aria-hidden />
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2">
            <span className={cn('truncate font-medium', details.hasUnread && 'font-semibold')}>
              {details.title}
            </span>
            {details.lastTime && (
              <span
                className={cn(
                  'shrink-0 text-[10px] tabular-nums',
                  details.hasUnread ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {details.lastTime}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs text-muted-foreground">{details.lastPreview}</span>
            {conversation.unreadCount > 0 && (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                {conversation.unreadCount}
              </span>
            )}
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-0.5 group-focus-within:flex group-hover:flex">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={conversation.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                aria-pressed={conversation.isFavorite}
                onClick={handleFavorite}
              >
                <Star
                  className={cn(
                    'h-3.5 w-3.5',
                    conversation.isFavorite && 'fill-current text-amber-500',
                  )}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {conversation.isFavorite ? 'Remove favorite' : 'Favorite'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={conversation.isPinned ? 'Unpin conversation' : 'Pin conversation'}
                aria-pressed={conversation.isPinned}
                onClick={handlePin}
              >
                <Pin
                  className={cn(
                    'h-3.5 w-3.5',
                    conversation.isPinned && 'fill-current text-primary',
                  )}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{conversation.isPinned ? 'Unpin' : 'Pin'}</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="More actions"
                onClick={(event) => event.stopPropagation()}
              >
                <span className="sr-only">More</span>
                <Archive className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleArchive}>Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
}
