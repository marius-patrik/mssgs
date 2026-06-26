import { Moon, Plus, Search, Sun } from 'lucide-react';
import type { JSX } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export interface InboxHeaderProps {
  query: string;
  onQueryChange: (query: string) => void;
  onNewConversation: () => void;
}

export function InboxHeader({
  query,
  onQueryChange,
  onNewConversation,
}: InboxHeaderProps): JSX.Element {
  const { theme, toggleTheme } = useTheme();

  return (
    <TooltipProvider delayDuration={200}>
      <header className="flex flex-col gap-2 border-b px-3 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold tracking-tight">mssgs</h1>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
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
                  onClick={onNewConversation}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">New conversation</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search messages…"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="h-9 pl-9 text-sm"
            aria-label="Search messages"
          />
        </div>
      </header>
    </TooltipProvider>
  );
}
