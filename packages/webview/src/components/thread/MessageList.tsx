import type { JSX } from 'react';
import { useMemo } from 'react';
import type { Message } from '../../../../extension/src/shared/types';
import { useMessengerStore } from '../../stores/messengerStore';
import { MessageBubble } from './MessageBubble';

const GROUP_MS = 5 * 60 * 1000;

export interface MessageListProps {
  conversationId: string;
}

export function MessageList({ conversationId }: MessageListProps): JSX.Element {
  const messages = useMessengerStore((state) => state.messages);
  const accounts = useMessengerStore((state) => state.accounts);
  const conversation = useMessengerStore((state) => state.conversations[conversationId]);
  const setReplyToMessageId = useMessengerStore((state) => state.setReplyToMessageId);
  const startEditing = useMessengerStore((state) => state.startEditing);
  const deleteMessage = useMessengerStore((state) => state.deleteMessage);
  const addReaction = useMessengerStore((state) => state.addReaction);
  const removeReaction = useMessengerStore((state) => state.removeReaction);

  const currentUserId = conversation ? accounts[conversation.accountId]?.id ?? 'me' : 'me';

  const sorted = useMemo(() => {
    return Object.values(messages)
      .filter((message) => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [messages, conversationId]);

  const isStartOfGroup = (previous: Message | null, current: Message): boolean => {
    if (!previous) return true;
    if (previous.senderId !== current.senderId) return true;
    const diff = new Date(current.createdAt).getTime() - new Date(previous.createdAt).getTime();
    return diff > GROUP_MS;
  };

  if (sorted.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
        <p>No messages yet.</p>
        <p className="text-xs">Send a message to start the conversation.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" role="log" aria-live="polite" aria-label="Messages">
      {sorted.map((message, index) => {
        const previous = index > 0 ? sorted[index - 1] : null;
        return (
          <MessageBubble
            key={message.id}
            message={message}
            isGrouped={!isStartOfGroup(previous, message)}
            currentUserId={currentUserId}
            onReply={() => setReplyToMessageId(message.id)}
            onEdit={() => startEditing(message.id)}
            onDelete={() => deleteMessage(message.id)}
            onReact={(emoji) => {
              const existing = message.reactions.find(
                (reaction) => reaction.emoji === emoji && reaction.userId === currentUserId,
              );
              if (existing) {
                removeReaction(message.id, emoji, currentUserId);
              } else {
                addReaction(message.id, emoji, currentUserId);
              }
            }}
          />
        );
      })}
    </div>
  );
}
