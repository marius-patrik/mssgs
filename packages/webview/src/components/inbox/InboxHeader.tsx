import { Moon, Plus, Search, Sun } from 'lucide-react';
import type { ChangeEvent, JSX } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export interface InboxHeaderProps {
  query: string;
  onQueryChange: (query: string) => void;
  onAddAccount: () => void;
}

export function InboxHeader({ query, onQueryChange, onAddAccount }: InboxHeaderProps): JSX.Element {
  const { theme, toggleTheme } = useTheme();

  return (
    <TooltipProvider delayDuration={200}>
      <header className="flex items-center justify-between border-b px-4 py-3">
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
              <Button variant="ghost" size="icon" onClick={onAddAccount} aria-label="Add account">
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Add account</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search messages…"
            value={query}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onQueryChange(event.target.value)}
            className="h-9 pl-9 text-sm"
            aria-label="Search messages"
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
