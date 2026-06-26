import type { JSX } from 'react';
import type { Message, Reaction } from '../../../../extension/src/shared/types';
import { cn } from '../../lib/utils';

export interface MessageReactionsProps {
  message: Message;
  currentUserId: string;
  onToggle: (emoji: string) => void;
}

interface ReactionGroup {
  emoji: string;
  count: number;
  includesMe: boolean;
}

function groupReactions(reactions: Reaction[], currentUserId: string): ReactionGroup[] {
  const map = new Map<string, { count: number; includesMe: boolean }>();

  for (const reaction of reactions) {
    const entry = map.get(reaction.emoji) ?? { count: 0, includesMe: false };
    entry.count += 1;
    if (reaction.userId === currentUserId) {
      entry.includesMe = true;
    }
    map.set(reaction.emoji, entry);
  }

  return Array.from(map.entries()).map(([emoji, { count, includesMe }]) => ({
    emoji,
    count,
    includesMe,
  }));
}

export function MessageReactions({
  message,
  currentUserId,
  onToggle,
}: MessageReactionsProps): JSX.Element | null {
  const groups = groupReactions(message.reactions, currentUserId);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {groups.map(({ emoji, count, includesMe }) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onToggle(emoji)}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition-colors',
            includesMe
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-transparent bg-muted text-muted-foreground hover:bg-accent',
          )}
          aria-label={`${emoji} reaction, count ${count}`}
          aria-pressed={includesMe}
        >
          <span>{emoji}</span>
          {count > 1 && <span className="text-[10px]">{count}</span>}
        </button>
      ))}
    </div>
  );
}
