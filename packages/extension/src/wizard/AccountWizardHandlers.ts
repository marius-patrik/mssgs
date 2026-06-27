import type { MessageBus } from '../shared/messages.js';
import type { SetupStatus, WizardServiceInfo, WizardStep } from '../shared/messages.js';
import type { ServiceType } from '../shared/types.js';
import type { AccountWizardEngine, WizardSession, WizardStepId } from './AccountWizardEngine.js';

export interface AccountWizardHandlersOptions {
  bus: MessageBus;
  engine: AccountWizardEngine;
  getHomeserverUrl?: () => string;
  onComplete?: (session: WizardSession) => void | Promise<void>;
}

const DEFAULT_HOMESERVER_URL = 'https://matrix.beeper.com';

const WIZARD_SERVICES: WizardServiceInfo[] = [
  { service: 'matrix', displayName: 'Beeper', requiresPhone: false, requiresMatrixLogin: true },
];

export function registerAccountWizardHandlers(options: AccountWizardHandlersOptions): void {
  const { bus, engine, getHomeserverUrl = () => DEFAULT_HOMESERVER_URL, onComplete } = options;

  bus.registerHandler('getSupportedServices', () => ({ services: WIZARD_SERVICES }));

  bus.registerHandler('startAccountSetup', ({ service }) => {
    const result = engine.start(service as ServiceType);
    return { setupId: result.setupId, step: result.step };
  });

  bus.registerHandler('submitAccountSetupStep', ({ setupId, stepId, data }) => {
    const result = engine.submit(setupId, stepId as WizardStepId, data ?? {});

    if (result.done && onComplete) {
      const session = engine.status(setupId);
      if (session) {
        void onComplete(session);
      }
    }

    return result;
  });

  bus.registerHandler('cancelAccountSetup', ({ setupId }) => engine.cancel(setupId));

  bus.registerHandler('getAccountSetupStatus', ({ setupId }) => {
    const session = engine.status(setupId);
    if (!session) {
      return {
        setupId,
        service: 'matrix' as ServiceType,
        status: 'error' as SetupStatus,
        step: undefined,
        error: 'Setup session not found',
      };
    }

    const step: WizardStep | undefined =
      session.status === 'active'
        ? {
            stepId: session.currentStepId,
            title: '',
            description: '',
            fields: [],
          }
        : undefined;

    // Attach the configured homeserver URL to completed sessions so the host
    // can create the backend connection without asking the user for it.
    return {
      setupId,
      service: session.service,
      status: session.status,
      step,
      error: session.error,
      ...(session.status === 'completed' ? { homeserverUrl: getHomeserverUrl() } : {}),
    };
  });
}
