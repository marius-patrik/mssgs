import type { JSX } from 'react';
import type { ServiceType } from '../../../../extension/src/shared/types';
import { getServiceTheme } from '../../lib/services';
import { cn } from '../../lib/utils';

interface ServiceBadgeProps {
  service: ServiceType;
  className?: string;
}

export function ServiceBadge({ service, className }: ServiceBadgeProps): JSX.Element {
  const theme = getServiceTheme(service);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white',
        theme.backgroundColor,
        className,
      )}
      aria-label={theme.displayName}
    >
      {theme.displayName}
    </span>
  );
}
