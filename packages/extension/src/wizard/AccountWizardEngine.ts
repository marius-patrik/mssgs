import type { ServiceType } from '../shared/types.js';

export type WizardStepId = 'matrix-login' | 'complete';

export type SetupStatus = 'active' | 'completed' | 'cancelled' | 'error';

export interface WizardField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'tel' | 'select' | 'qr' | 'static';
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  value?: string;
}

export interface WizardStep {
  stepId: WizardStepId;
  title: string;
  description: string;
  fields: WizardField[];
}

export interface WizardSession {
  setupId: string;
  service: ServiceType;
  status: SetupStatus;
  currentStepId: WizardStepId;
  data: Record<string, string>;
  error: string | null;
}

export interface StartResult {
  setupId: string;
  step: WizardStep;
}

export interface SubmitResult {
  done: boolean;
  step?: WizardStep;
  error?: string;
}

export class AccountWizardEngine {
  private sessions = new Map<string, WizardSession>();

  start(service: ServiceType): StartResult {
    const setupId = crypto.randomUUID();
    const session: WizardSession = {
      setupId,
      service,
      status: 'active',
      currentStepId: 'matrix-login',
      data: {},
      error: null,
    };

    this.sessions.set(setupId, session);

    return {
      setupId,
      step: buildStep(session.currentStepId, service),
    };
  }

  submit(setupId: string, stepId: WizardStepId, data: Record<string, string>): SubmitResult {
    const session = this.sessions.get(setupId);
    if (!session) {
      return { done: false, error: 'Setup session not found' };
    }

    if (session.status === 'cancelled') {
      return { done: false, error: 'Setup session has been cancelled' };
    }

    if (session.status === 'completed') {
      return { done: true };
    }

    if (session.currentStepId !== stepId) {
      return {
        done: false,
        error: `Expected step ${session.currentStepId}, got ${stepId}`,
      };
    }

    const validationError = validateStep(stepId, data);
    if (validationError) {
      session.status = 'error';
      session.error = validationError;
      return { done: false, error: validationError };
    }

    Object.assign(session.data, data);
    session.error = null;

    const nextStepId = getNextStep(stepId, session.service);
    if (!nextStepId || nextStepId === 'complete') {
      session.status = 'completed';
      session.currentStepId = 'complete';
      return { done: true };
    }

    session.currentStepId = nextStepId;
    session.status = 'active';

    return {
      done: false,
      step: buildStep(nextStepId, session.service),
    };
  }

  cancel(setupId: string): { cancelled: boolean } {
    const session = this.sessions.get(setupId);
    if (!session) {
      return { cancelled: false };
    }

    session.status = 'cancelled';
    return { cancelled: true };
  }

  status(setupId: string): WizardSession | undefined {
    return this.sessions.get(setupId);
  }

  getSessions(): WizardSession[] {
    return Array.from(this.sessions.values());
  }
}

function validateStep(stepId: WizardStepId, data: Record<string, string>): string | undefined {
  switch (stepId) {
    case 'matrix-login': {
      if (!data.username?.trim()) {
        return 'Username is required';
      }
      if (!data.password) {
        return 'Password is required';
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

function getNextStep(stepId: WizardStepId, _service: ServiceType): WizardStepId | undefined {
  switch (stepId) {
    case 'matrix-login':
      return undefined;
    default:
      return undefined;
  }
}

function buildStep(stepId: WizardStepId, service: ServiceType): WizardStep {
  switch (stepId) {
    case 'matrix-login':
      return {
        stepId: 'matrix-login',
        title: service === 'matrix' ? 'Sign in to Beeper' : 'Sign in',
        description:
          'Enter your Beeper username and password. All your bridged chats will sync automatically.',
        fields: [
          {
            name: 'username',
            label: 'Username',
            type: 'text',
            placeholder: '@you:beeper.com',
          },
          { name: 'password', label: 'Password', type: 'password' },
        ],
      };
    default:
      return {
        stepId: 'complete',
        title: 'Complete',
        description: 'Your account is being connected.',
        fields: [],
      };
  }
}
