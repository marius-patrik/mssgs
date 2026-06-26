import { MessageCircle, MessageSquare, Send } from 'lucide-react';
import type { JSX } from 'react';
import type { ServiceType } from '../../../../extension/src/shared/types';
import { cn } from '../../lib/utils';

const SERVICE_STYLES: Record<
  ServiceType,
  { label: string; bg: string; text: string; icon: JSX.ElementType }
> = {
  whatsapp: { label: 'WA', bg: 'bg-green-500', text: 'text-white', icon: MessageCircle },
  telegram: { label: 'TG', bg: 'bg-sky-500', text: 'text-white', icon: Send },
  instagram: { label: 'IG', bg: 'bg-pink-600', text: 'text-white', icon: MessageCircle },
  imessage: { label: 'iM', bg: 'bg-green-600', text: 'text-white', icon: MessageSquare },
  matrix: { label: 'MX', bg: 'bg-neutral-900', text: 'text-white', icon: MessageCircle },
  sms: { label: 'SMS', bg: 'bg-blue-500', text: 'text-white', icon: MessageCircle },
  messenger: { label: 'FB', bg: 'bg-blue-600', text: 'text-white', icon: MessageCircle },
  signal: { label: 'SG', bg: 'bg-blue-700', text: 'text-white', icon: MessageCircle },
  discord: { label: 'DC', bg: 'bg-indigo-500', text: 'text-white', icon: MessageCircle },
  slack: { label: 'SL', bg: 'bg-purple-900', text: 'text-white', icon: MessageCircle },
};

export interface ServiceBadgeProps {
  service: ServiceType | undefined;
  showIcon?: boolean;
  className?: string;
}

export function ServiceBadge({
  service,
  showIcon = false,
  className,
}: ServiceBadgeProps): JSX.Element {
  const config = service ? SERVICE_STYLES[service] : SERVICE_STYLES.matrix;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[10px] font-semibold',
        config.bg,
        config.text,
        className,
      )}
      aria-label={service ?? 'unknown'}
      title={config.label}
    >
      {showIcon ? <Icon className="h-3 w-3" /> : config.label}
    </span>
  );
}
