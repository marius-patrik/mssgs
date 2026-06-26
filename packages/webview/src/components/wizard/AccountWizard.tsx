import { type JSX, useCallback, useState } from 'react';
import type { WizardStep } from '../../../../extension/src/shared/messages';
import type { ServiceType } from '../../../../extension/src/shared/types';
import type { MessengerClient } from '../../messaging/client';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { ServiceSelector } from './ServiceSelector';
import { WizardStepForm } from './WizardStepForm';

export interface AccountWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: MessengerClient;
}

type WizardView = { type: 'select' } | { type: 'step'; setupId: string; step: WizardStep };

export function AccountWizard({ open, onOpenChange, client }: AccountWizardProps): JSX.Element {
  const [view, setView] = useState<WizardView>({ type: 'select' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback((): void => {
    if (view.type === 'step') {
      void client.request('cancelAccountSetup', { setupId: view.setupId });
    }
    setView({ type: 'select' });
    setError(null);
    onOpenChange(false);
  }, [client, onOpenChange, view]);

  const handleSelectService = useCallback(
    async (service: ServiceType): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.request('startAccountSetup', { service });
        setView({ type: 'step', setupId: result.setupId, step: result.step });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const handleSubmitStep = useCallback(
    async (data: Record<string, string>): Promise<void> => {
      if (view.type !== 'step') {
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const result = await client.request('submitAccountSetupStep', {
          setupId: view.setupId,
          stepId: view.step.stepId,
          data,
        });

        if (result.done) {
          handleClose();
          return;
        }

        if (result.error) {
          setError(result.error);
          return;
        }

        if (result.step) {
          setView({ type: 'step', setupId: view.setupId, step: result.step });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    },
    [client, view, handleClose],
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add account</DialogTitle>
          <DialogDescription>
            Connect a messaging service through its Matrix bridge.
          </DialogDescription>
        </DialogHeader>

        {view.type === 'select' ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Choose a service to set up:</p>
            <ServiceSelector onSelect={handleSelectService} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <WizardStepForm
            step={view.step}
            onSubmit={handleSubmitStep}
            onCancel={handleClose}
            isLoading={isLoading}
            error={error}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
