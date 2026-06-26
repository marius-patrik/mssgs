import type { JSX } from 'react';
import { useMessengerStore } from '../../stores/messengerStore';

export interface TypingIndicatorProps {
  conversationId: string;
}

export function TypingIndicator({ conversationId }: TypingIndicatorProps): JSX.Element | null {
  const userIds = useMessengerStore((state) => state.typing[conversationId] ?? []);

  if (userIds.length === 0) {
    return null;
  }

  return (
    <div className="flex items-end gap-2 py-2" aria-live="polite" aria-label="Typing indicator">
      <div className="flex items-center gap-1 rounded-2xl bg-muted px-4 py-2.5 text-muted-foreground">
        <span className="h-2 w-2 animate-bounce rounded-full bg-current" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:120ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:240ms]" />
      </div>
    </div>
  );
}
