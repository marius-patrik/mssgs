import { Trash2 } from 'lucide-react';
import { type JSX, useMemo } from 'react';
import type { Account } from '../../../../extension/src/shared/types';
import type { MessengerClient } from '../../messaging/client';
import { useMessengerStore } from '../../stores/messengerStore';
import { Button } from '../ui/button';

const STATUS_COLORS: Record<Account['status'], string> = {
  connected: 'bg-green-500',
  connecting: 'bg-yellow-500',
  disconnected: 'bg-gray-400',
  error: 'bg-red-500',
};

export interface AccountListProps {
  client?: MessengerClient;
}

export function AccountList({ client }: AccountListProps): JSX.Element {
  const accounts = useMessengerStore((state) => Object.values(state.accounts));

  const sorted = useMemo(
    () => accounts.sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [accounts],
  );

  if (sorted.length === 0) {
    return <div className="px-4 py-2 text-xs text-muted-foreground">No accounts connected.</div>;
  }

  return (
    <div className="border-b">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Accounts
      </div>
      <ul className="px-2 pb-2">
        {sorted.map((account) => (
          <li
            key={account.id}
            className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${STATUS_COLORS[account.status]}`}
                title={account.status}
              />
              <span className="truncate text-sm">{account.displayName}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              title="Remove account"
              onClick={() => {
                void client?.request('removeAccount', { accountId: account.id });
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
