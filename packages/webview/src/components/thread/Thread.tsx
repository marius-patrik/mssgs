import type { JSX } from 'react';
import type { MessengerClient } from '../../messaging/client';
import { useMessengerStore } from '../../stores/messengerStore';
import { ScrollArea } from '../ui/scroll-area';
import { Composer } from './Composer';
import { MessageList } from './MessageList';
import { ThreadHeader } from './ThreadHeader';
import { TypingIndicator } from './TypingIndicator';

export interface ThreadProps {
  client: MessengerClient;
}

export function Thread({ client }: ThreadProps): JSX.Element {
  const activeConversationId = useMessengerStore((state) => state.activeConversationId);
  const conversation = useMessengerStore((state) =>
    activeConversationId ? state.conversations[activeConversationId] : null,
  );

  if (!conversation) {
    return (
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
        <p>Select a conversation to start messaging.</p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <ThreadHeader conversation={conversation} />
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 px-4 py-4">
          <MessageList conversationId={conversation.id} />
          <TypingIndicator conversationId={conversation.id} />
        </div>
      </ScrollArea>
      <Composer client={client} conversationId={conversation.id} />
    </div>
  );
}
