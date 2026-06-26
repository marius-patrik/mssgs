import { AlertCircle, CheckCircle2, Loader2, QrCode } from 'lucide-react';
import type { JSX } from 'react';
import type { SetupServiceType } from '../../../../extension/src/shared/messages';
import { getServiceTheme } from '../../lib/services';
import { Button } from '../ui/button';

interface StatusStepProps {
  service: SetupServiceType;
  step: 'qr' | 'link' | 'pairing' | 'connecting' | 'connected' | 'error';
  instruction?: string;
  qrData?: string;
  linkUrl?: string;
  error?: string;
  onRetry?: () => void;
  onCancel: () => void;
}

export function StatusStep({
  service,
  step,
  instruction,
  qrData,
  linkUrl,
  error,
  onRetry,
  onCancel,
}: StatusStepProps): JSX.Element {
  const theme = getServiceTheme(service);

  return (
    <div className="space-y-4 text-center">
      {step === 'qr' && (
        <div className="space-y-3">
          <QrCode className={`mx-auto h-16 w-16 ${theme.color}`} />
          <p className="text-sm text-muted-foreground">{instruction}</p>
          {qrData && (
            <div className="rounded-lg border bg-muted p-4">
              <code className="break-all text-xs">{qrData}</code>
            </div>
          )}
        </div>
      )}

      {step === 'link' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{instruction}</p>
          {linkUrl && (
            <a
              href={linkUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Open {theme.displayName}
            </a>
          )}
        </div>
      )}

      {step === 'pairing' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{instruction}</p>
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {step === 'connecting' && (
        <div className="space-y-3">
          <Loader2 className={`mx-auto h-10 w-10 animate-spin ${theme.color}`} />
          <p className="text-sm text-muted-foreground">{instruction ?? 'Connecting…'}</p>
        </div>
      )}

      {step === 'connected' && (
        <div className="space-y-3">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
          <p className="font-medium">{theme.displayName} connected</p>
        </div>
      )}

      {step === 'error' && (
        <div className="space-y-3">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <p className="text-sm text-muted-foreground">{error ?? 'Something went wrong.'}</p>
          {onRetry && <Button onClick={onRetry}>Try again</Button>}
        </div>
      )}

      <Button type="button" variant="outline" onClick={onCancel}>
        Close
      </Button>
    </div>
  );
}
