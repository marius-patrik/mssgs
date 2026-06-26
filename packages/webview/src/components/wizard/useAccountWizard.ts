import { useCallback, useState } from 'react';
import type {
  AccountSetupResponse,
  SetupServiceType,
} from '../../../../extension/src/shared/messages';
import type { MessengerClient } from '../../messaging/client';

export interface AccountWizardState {
  isOpen: boolean;
  selectedService: SetupServiceType | null;
  setup: AccountSetupResponse | null;
  isLoading: boolean;
  error: string | null;
}

export interface AccountWizardOptions {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface AccountWizardActions {
  open: () => void;
  close: () => void;
  selectService: (service: SetupServiceType) => Promise<void>;
  complete: (code?: string) => Promise<void>;
  cancel: () => Promise<void>;
  reset: () => void;
}

export function useAccountWizard(
  client: MessengerClient,
  options: AccountWizardOptions = {},
): AccountWizardState & AccountWizardActions {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = options.open !== undefined;
  const isOpen = isControlled ? options.open ?? false : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setInternalOpen(next);
      }
      options.onOpenChange?.(next);
    },
    [isControlled, options],
  );

  const [selectedService, setSelectedService] = useState<SetupServiceType | null>(null);
  const [setup, setSetup] = useState<AccountSetupResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setSelectedService(null);
    setSetup(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const open = useCallback(() => {
    setOpen(true);
  }, [setOpen]);

  const close = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset, setOpen]);

  const selectService = useCallback(
    async (service: SetupServiceType) => {
      setSelectedService(service);
      setError(null);
      setIsLoading(true);

      try {
        const response = await client.request('startAccountSetup', { service });
        setSetup(response);
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : String(failure));
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const refreshStatus = useCallback(
    async (sessionId: string) => {
      try {
        const response = await client.request('getAccountSetupStatus', { sessionId });
        setSetup(response);
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : String(failure));
      }
    },
    [client],
  );

  const complete = useCallback(
    async (code?: string) => {
      if (!setup) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await client.request('completeAccountSetup', {
          sessionId: setup.sessionId,
          code,
        });

        if (response.success) {
          close();
        } else {
          setError(response.error ?? 'Setup could not be completed.');
          await refreshStatus(setup.sessionId);
        }
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : String(failure));
      } finally {
        setIsLoading(false);
      }
    },
    [client, setup, close, refreshStatus],
  );

  const cancel = useCallback(async () => {
    if (setup) {
      try {
        await client.request('cancelAccountSetup', { sessionId: setup.sessionId });
      } catch {
        // Best-effort cancellation; the UI closes regardless.
      }
    }

    close();
  }, [client, setup, close]);

  return {
    isOpen,
    selectedService,
    setup,
    isLoading,
    error,
    open,
    close,
    selectService,
    complete,
    cancel,
    reset,
  };
}
