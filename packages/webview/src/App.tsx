import { type JSX, useState } from 'react';
import { Inbox } from './components/inbox';
import { Thread } from './components/thread';
import { TooltipProvider } from './components/ui/tooltip';
import { AccountWizard } from './components/wizard';
import { useMessengerClient } from './messaging/useMessengerClient';
import { useMessengerStore } from './stores/messengerStore';

export function App(): JSX.Element {
  const client = useMessengerClient();
  const activeConversationId = useMessengerStore((state) => state.activeConversationId);
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
        <Inbox onNewConversation={() => setWizardOpen(true)} />

        <main className="flex min-w-0 flex-1 flex-col">
          {activeConversationId ? (
            <Thread client={client} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <div className="max-w-sm space-y-2">
                <h2 className="text-lg font-semibold">Welcome to mssgs</h2>
                <p className="text-sm text-muted-foreground">
                  Select a conversation from the sidebar to start messaging, or add an account.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      <AccountWizard open={wizardOpen} onOpenChange={setWizardOpen} client={client} />
    </TooltipProvider>
  );
}
