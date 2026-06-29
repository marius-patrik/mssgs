import { MessageCircle, MessageSquare, Send, Smartphone } from 'lucide-react';
import type { JSX } from 'react';
import type { ServiceType } from '../../../../extension/src/shared/types';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

interface ServiceOption {
  service: ServiceType;
  displayName: string;
  icon: JSX.ElementType;
  color: string;
  warning?: string;
}

const SERVICES: ServiceOption[] = [
  { service: 'whatsapp', displayName: 'WhatsApp', icon: MessageCircle, color: 'bg-green-500' },
  { service: 'telegram', displayName: 'Telegram', icon: Send, color: 'bg-sky-500' },
  {
    service: 'instagram',
    displayName: 'Instagram',
    icon: Smartphone,
    color: 'bg-pink-600',
    warning: 'Unofficial integration. Not endorsed by Meta and may break without notice.',
  },
  {
    service: 'imessage',
    displayName: 'iMessage',
    icon: MessageSquare,
    color: 'bg-green-600',
    warning: 'macOS only. Requires Full Disk Access for VS Code.',
  },
];

export interface ServiceSelectorProps {
  onSelect: (service: ServiceType) => void;
}

export function ServiceSelector({ onSelect }: ServiceSelectorProps): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-3">
      {SERVICES.map((option) => {
        const Icon = option.icon;
        return (
          <Button
            key={option.service}
            variant="outline"
            className="flex h-auto flex-col items-center justify-center gap-2 py-6"
            onClick={() => onSelect(option.service)}
          >
            <span
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full text-white',
                option.color,
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium">{option.displayName}</span>
            {option.warning ? (
              <span className="text-xs text-muted-foreground text-center leading-tight">
                {option.warning}
              </span>
            ) : null}
          </Button>
        );
      })}
    </div>
  );
}
