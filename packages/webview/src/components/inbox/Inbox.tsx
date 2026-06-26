import type { JSX } from 'react';
import { ConversationList } from './ConversationList';
import { InboxHeader } from './InboxHeader';

export interface InboxProps {
  query: string;
  onQueryChange: (query: string) => void;
  onAddAccount: () => void;
}

export function Inbox({ query, onQueryChange, onAddAccount }: InboxProps): JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <InboxHeader query={query} onQueryChange={onQueryChange} onAddAccount={onAddAccount} />
      <ConversationList query={query} />
    </div>
  );
}
