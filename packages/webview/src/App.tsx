import { Menu, Moon, Plus, Search, Sun } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Fade } from './components/motion/Fade';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { ScrollArea } from './components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';
import { useConversations } from './hooks/useConversations';
import { useTheme } from './hooks/useTheme';
import { cn } from './lib/utils';
import { useMessengerClient } from './messaging/useMessengerClient';
import { useMessengerStore } from './stores/messengerStore';

function conversationInitials(conversation: { title: string | null }): string {
  const source = conversation.title ?? '?';
  return source
    .split(' ')
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function App(): JSX.Element {
  useMessengerClient();
  const { theme, toggleTheme } = useTheme();
  const conversations = useConversations();
  const activeConversationId = useMessengerStore((state) => state.activeConversationId);
  const setActiveConversationId = useMessengerStore((state) => state.setActiveConversationId);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return conversations;
    }

    return conversations.filter((conversation) =>
      (conversation.title ?? '').toLowerCase().includes(trimmed),
    );
  }, [conversations, query]);

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
                  <Button variant="ghost" size="icon" aria-label="New conversation">
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">New conversation</TooltipContent>
              </Tooltip>
            </div>
          </header>

          <div className="px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search messages…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-9 pl-9 text-sm"
                aria-label="Search messages"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <nav className="flex flex-col gap-1 p-2" aria-label="Conversations">
              {filtered.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setActiveConversationId(conversation.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    activeConversationId === conversation.id && 'bg-accent',
                  )}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">
                      {conversationInitials(conversation)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{conversation.title ?? 'Untitled'}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {conversation.lastMessageId ? 'Message thread' : 'No messages yet'}
                    </span>
                  </div>
                  {conversation.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                      {conversation.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </ScrollArea>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                {activeConversationId ? 'Conversation' : 'Select a conversation'}
              </span>
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
                  : 'Select a conversation from the sidebar to start messaging, or start a new one.'}
              </p>
            </div>
          </Fade>
        </main>
      </div>
    </TooltipProvider>
  );
}
