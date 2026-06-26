import { Menu } from 'lucide-react';
import { type JSX, useEffect, useState } from 'react';
import { Inbox } from './components/inbox';
import { Fade } from './components/motion/Fade';
import { Button } from './components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';
import { AccountWizard } from './components/wizard';
import { useKeyboardShortcuts } from './extras/useKeyboardShortcuts';
import { useMessengerClient } from './messaging/useMessengerClient';
import { getVsCodeApi } from './messaging/vscodeApi';
import { useMessengerStore } from './stores/messengerStore';

export function App(): JSX.Element {
  const client = useMessengerClient();
  const activeConversationId = useMessengerStore((state) => state.activeConversationId);
  const [wizardOpen, setWizardOpen] = useState(false);

  useKeyboardShortcuts({ onNewConversation: () => setWizardOpen(true) });

  useEffect(() => {
    if (!getVsCodeApi()) {
      return;
    }

    void client.request('setActiveConversation', { conversationId: activeConversationId });
  }, [client, activeConversationId]);

  useEffect(() => {
    return client.onEvent((event) => {
      if (event.eventType !== 'extras') {
        return;
      }

      const payload = event.payload as { kind: string };
      if (payload.kind === 'focusSearch') {
        document.querySelector<HTMLInputElement>('input[aria-label="Search messages"]')?.focus();
      } else if (payload.kind === 'openWizard') {
        setWizardOpen(true);
      }
    });
  }, [client]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
        <Inbox client={client} onNewConversation={() => setWizardOpen(true)} />

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-4 w-4" />
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm font-medium">
                    {activeConversationId ? 'Conversation' : 'Select a conversation'}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">Conversation view</TooltipContent>
              </Tooltip>
            </div>
          </header>

          <Fade className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="max-w-sm space-y-2">
              <h2 className="text-lg font-semibold">
                {activeConversationId ? 'Thread view' : 'Welcome to mssgs'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {activeConversationId
                  ? 'The conversation thread and composer will be rendered here in the next spec.'
                  : 'Select a conversation from the sidebar to start messaging, or add an account.'}
              </p>
            </div>
          </Fade>
        </main>
      </div>

      <AccountWizard open={wizardOpen} onOpenChange={setWizardOpen} client={client} />
    </TooltipProvider>
  );
}
