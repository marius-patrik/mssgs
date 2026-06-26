import { Edit2, Reply, Smile, Trash2 } from 'lucide-react';
import type { JSX } from 'react';
import type { Contact, Message } from '../../../../extension/src/shared/types';
import { formatMessageTime } from '../../lib/threadUtils';
import { cn } from '../../lib/utils';
import { useMessengerStore } from '../../stores/messengerStore';
import { MessageBubbleMotion } from '../motion/MessageBubbleMotion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { MessageReactions } from './MessageReactions';
import { ReadReceipt } from './ReadReceipt';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

export interface MessageBubbleProps {
  message: Message;
  isGrouped?: boolean;
  currentUserId: string;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
}

export function MessageBubble({
  message,
  isGrouped = false,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onReact,
}: MessageBubbleProps): JSX.Element {
  const contacts = useMessengerStore((state) => state.contacts);
  const accounts = useMessengerStore((state) => state.accounts);
  const messages = useMessengerStore((state) => state.messages);

  const isSelf = message.isFromMe;
  const sender =
    contacts[message.senderId] ??
    Object.values(accounts).find((account) => account.id === message.senderId);

  const repliedMessage = message.replyToId ? messages[message.replyToId] : null;
  const repliedSender = repliedMessage
    ? contacts[repliedMessage.senderId] ??
      Object.values(accounts).find((account) => account.id === repliedMessage.senderId)
    : null;

  const contactName =
    (sender as Contact | undefined)?.displayName ??
    (sender as { displayName?: string } | undefined)?.displayName ??
    'Unknown';

  const initials = contactName
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={cn('group flex items-end gap-2 py-0.5', isSelf ? 'flex-row-reverse' : 'flex-row')}
      data-message-id={message.id}
      data-testid="message-bubble"
    >
      {!isSelf && !isGrouped && (
        <Avatar className="h-8 w-8 shrink-0">
          {(sender as Contact | undefined)?.avatarUrl && (
            <AvatarImage
              src={(sender as Contact | undefined)?.avatarUrl ?? undefined}
              alt={contactName}
            />
          )}
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>
      )}

      {!isSelf && isGrouped && <div className="w-8 shrink-0" />}

      <div className={cn('flex max-w-[80%] flex-col', isSelf ? 'items-end' : 'items-start')}>
        {!isSelf && !isGrouped && (
          <span className="mb-0.5 ml-1 text-[10px] text-muted-foreground">{contactName}</span>
        )}

        <div className="flex items-center gap-1">
          <MessageBubbleMotion isSelf={isSelf} className="relative min-w-0">
            {repliedMessage && (
              <button
                type="button"
                onClick={onReply}
                className="mb-1 w-full rounded border-l-2 border-current bg-black/5 px-2 py-1 text-left text-xs opacity-80 hover:opacity-100"
              >
                <span className="font-medium">
                  {(repliedSender as Contact | undefined)?.displayName ?? 'Unknown'}
                </span>
                <p className="truncate">{repliedMessage.text || 'Attachment'}</p>
              </button>
            )}

            {message.text.length > 0 && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
            )}

            {message.attachments.length > 0 && (
              <div className="mt-1 flex flex-col gap-1">
                {message.attachments.map((attachment) =>
                  attachment.type === 'image' && attachment.url ? (
                    <img
                      key={attachment.id}
                      src={attachment.url}
                      alt={attachment.name ?? 'Image attachment'}
                      className="max-h-48 rounded-lg object-cover"
                    />
                  ) : (
                    <span
                      key={attachment.id}
                      className="inline-flex items-center gap-1 rounded bg-black/5 px-2 py-1 text-xs"
                    >
                      📎 {attachment.name ?? 'Attachment'}
                    </span>
                  ),
                )}
              </div>
            )}

            <div className="mt-1 flex items-center justify-end gap-1">
              <span className="text-[10px] opacity-70">{formatMessageTime(message.createdAt)}</span>
              {isSelf && <ReadReceipt status={message.status} />}
            </div>
          </MessageBubbleMotion>

          <div
            className={cn(
              'flex flex-col opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100',
              isSelf ? 'items-start' : 'items-end',
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Reply"
              onClick={onReply}
            >
              <Reply className="h-3.5 w-3.5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="React">
                  <Smile className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isSelf ? 'end' : 'start'}>
                {QUICK_REACTIONS.map((emoji) => (
                  <DropdownMenuItem key={emoji} onClick={() => onReact(emoji)}>
                    {emoji}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {isSelf && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Edit"
                  onClick={onEdit}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Delete"
                  onClick={onDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        <MessageReactions message={message} currentUserId={currentUserId} onToggle={onReact} />
      </div>
    </div>
  );
}
