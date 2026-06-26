import { X } from 'lucide-react';
import { type JSX, useCallback, useState } from 'react';
import type { SetupServiceType, SetupStatus } from '../../../../extension/src/shared/messages';
import { useMessengerClient } from '../../messaging/useMessengerClient';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { CredentialsStep } from './CredentialsStep';
import { ServiceStep } from './ServiceStep';
import { StatusStep } from './StatusStep';

export interface AccountWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountWizard({ open, onOpenChange }: AccountWizardProps): JSX.Element {
  const client = useMessengerClient();
  const [service, setService] = useState<SetupServiceType | null>(null);
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const reset = useCallback(() => {
    setService(null);
    setStatus(null);
    setIsLoading(false);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        if (status?.setupId) {
          void client.request('cancelAccountSetup', { setupId: status.setupId });
        }
        reset();
      }
      onOpenChange(next);
    },
    [client, onOpenChange, reset, status?.setupId],
  );

  const handleSelectService = useCallback(
    async (selected: SetupServiceType) => {
      setService(selected);
      setIsLoading(true);
      try {
        const result = await client.request('startAccountSetup', { service: selected });
        setStatus(result);
      } catch (error) {
        setStatus({
          setupId: '',
          service: selected,
          step: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const handleSubmitCredentials = useCallback(
    async (credentials: Record<string, string>) => {
      if (!status?.setupId) {
        return;
      }

      setIsLoading(true);
      try {
        const result = await client.request('submitAccountCredentials', {
          setupId: status.setupId,
          credentials,
        });
        setStatus(result);
      } catch (error) {
        setStatus({
          setupId: status.setupId,
          service: status.service,
          step: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [client, status],
  );

  const handleRetry = useCallback(() => {
    if (!service) {
      return;
    }
    void handleSelectService(service);
  }, [handleSelectService, service]);

  const title = status?.service
    ? `Connect ${status.service.charAt(0).toUpperCase() + status.service.slice(1)}`
    : 'Add account';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={() => handleOpenChange(false)}
            aria-label="Close wizard"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="py-2">
          {!service && <ServiceStep onSelect={handleSelectService} />}

          {service && status?.step === 'credentials' && !isLoading && (
            <CredentialsStep
              service={service}
              instruction={status.instruction}
              onSubmit={handleSubmitCredentials}
              onCancel={() => handleOpenChange(false)}
            />
          )}

          {service &&
            status &&
            (status.step === 'qr' ||
              status.step === 'link' ||
              status.step === 'pairing' ||
              status.step === 'connecting' ||
              status.step === 'connected' ||
              status.step === 'error') && (
              <StatusStep
                service={service}
                step={status.step}
                instruction={status.instruction}
                qrData={status.qrData}
                linkUrl={status.linkUrl}
                error={status.error}
                onRetry={status.step === 'error' ? handleRetry : undefined}
                onCancel={() => handleOpenChange(false)}
              />
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
