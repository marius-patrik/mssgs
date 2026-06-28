import type { ServiceType } from '../shared/types.js';

export type WizardStepId =
  | 'phone-number'
  | 'verify-code'
  | 'qr-code'
  | 'credentials'
  | 'pairing'
  | 'complete';

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
    const firstStep = getInitialStep(service);
    const session: WizardSession = {
      setupId,
      service,
      status: 'active',
      currentStepId: firstStep,
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

function getInitialStep(service: ServiceType): WizardStepId {
  switch (service) {
    case 'whatsapp':
      return 'qr-code';
    case 'telegram':
      return 'phone-number';
    case 'instagram':
      return 'credentials';
    case 'imessage':
      return 'pairing';
    default:
      return 'credentials';
  }
}

function validateStep(stepId: WizardStepId, data: Record<string, string>): string | undefined {
  switch (stepId) {
    case 'phone-number': {
      if (!data.phoneNumber?.trim()) {
        return 'Phone number is required';
      }
      if (!data.apiId?.trim()) {
        return 'API ID is required';
      }
      if (!data.apiHash?.trim()) {
        return 'API hash is required';
      }
      return undefined;
    }
    case 'verify-code': {
      if (!data.code?.trim()) {
        return 'Verification code is required';
      }
      return undefined;
    }
    case 'qr-code':
      return undefined;
    case 'credentials': {
      if (!data.username?.trim()) {
        return 'Username is required';
      }
      if (!data.password) {
        return 'Password is required';
      }
      return undefined;
    }
    case 'pairing': {
      return undefined;
    }
    default:
      return undefined;
  }
}

function getNextStep(stepId: WizardStepId, service: ServiceType): WizardStepId | undefined {
  switch (stepId) {
    case 'phone-number':
      return service === 'telegram' ? 'verify-code' : undefined;
    case 'verify-code':
    case 'qr-code':
    case 'credentials':
    case 'pairing':
      return undefined;
    default:
      return undefined;
  }
}

function buildStep(stepId: WizardStepId, service: ServiceType): WizardStep {
  switch (stepId) {
    case 'phone-number':
      return {
        stepId: 'phone-number',
        title: 'Telegram login',
        description: 'Enter your Telegram phone number and API credentials from my.telegram.org.',
        fields: [
          {
            name: 'phoneNumber',
            label: 'Phone number',
            type: 'tel',
            placeholder: '+1 234 567 890',
          },
          { name: 'apiId', label: 'API ID', type: 'text' },
          { name: 'apiHash', label: 'API hash', type: 'password' },
        ],
      };
    case 'verify-code':
      return {
        stepId: 'verify-code',
        title: 'Verification code',
        description: 'Enter the code sent to your Telegram app.',
        fields: [
          {
            name: 'code',
            label: 'Verification code',
            type: 'text',
            placeholder: '123456',
          },
        ],
      };
    case 'qr-code':
      return {
        stepId: 'qr-code',
        title: 'Scan QR code',
        description:
          'Open WhatsApp on your phone → Menu → Linked Devices → Link a Device, then scan the QR code when it appears here.',
        fields: [
          {
            name: 'qrCode',
            label: 'QR code',
            type: 'qr',
            value: 'pending',
          },
        ],
      };
    case 'credentials':
      return {
        stepId: 'credentials',
        title: `${service} credentials`,
        description: `Enter your ${service} username and password.`,
        fields: [
          { name: 'username', label: 'Username', type: 'text' },
          { name: 'password', label: 'Password', type: 'password' },
        ],
      };
    case 'pairing':
      return {
        stepId: 'pairing',
        title: 'iMessage',
        description:
          'Make sure you are signed into iMessage on this Mac. Click Connect to start syncing.',
        fields: [],
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
