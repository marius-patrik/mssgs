import { AlertCircle, Check, CheckCheck, Loader2 } from 'lucide-react';
import type { JSX } from 'react';
import type { MessageStatus } from '../../../../extension/src/shared/types';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export interface ReadReceiptProps {
  status: MessageStatus;
}

const STATUS_LABELS: Record<MessageStatus, string> = {
  sending: 'Sending',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Failed',
};

export function ReadReceipt({ status }: ReadReceiptProps): JSX.Element {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn('inline-flex items-center', status === 'failed' && 'text-destructive')}
            aria-label={STATUS_LABELS[status]}
          >
            {status === 'sending' && <Loader2 className="h-3 w-3 animate-spin" />}
            {status === 'sent' && <Check className="h-3 w-3" />}
            {status === 'delivered' && <CheckCheck className="h-3 w-3" />}
            {status === 'read' && <CheckCheck className="h-3 w-3 text-primary" />}
            {status === 'failed' && <AlertCircle className="h-3 w-3" />}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">{STATUS_LABELS[status]}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
