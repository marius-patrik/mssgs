import { Menu, Moon, Plus, Sun } from 'lucide-react';
import { type JSX, useState } from 'react';
import { ConversationList } from './components/inbox/ConversationList';
import { Fade } from './components/motion/Fade';
import { Button } from './components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';
import { AccountWizard } from './components/wizard/AccountWizard';
import { useConversations } from './hooks/useConversations';
import { useTheme } from './hooks/useTheme';
import { useMessengerClient } from './messaging/useMessengerClient';

export function App(): JSX.Element {
  useMessengerClient();
  const { theme, toggleTheme } = useTheme();
  const conversations = useConversations();
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
        <aside className="flex w-72 shrink-0 flex-col border-r bg-card">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <h1 className="text-base font-semibold tracking-tight">mssgs</h1>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                  >
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Toggle theme</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="New conversation"
                    onClick={() => setWizardOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">New conversation</TooltipContent>
              </Tooltip>
            </div>
          </header>

          <ConversationList conversations={conversations} className="flex-1" />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <Fade className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="max-w-sm space-y-2">
              <h2 className="text-lg font-semibold">Welcome to mssgs</h2>
              <p className="text-sm text-muted-foreground">
                Select a conversation from the sidebar to start messaging, or add an account to get
                started.
              </p>
            </div>
          </Fade>
        </main>
      </div>

      <AccountWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </TooltipProvider>
  );
}
