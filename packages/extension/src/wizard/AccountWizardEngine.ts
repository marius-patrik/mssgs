import type { ServiceType } from '../shared/types.js';

export type WizardStepId =
  | 'matrix-login'
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
      if (!data.homeserverUrl?.trim()) {
        return 'Homeserver URL is required';
      }
      if (!data.userId?.trim()) {
        return 'User ID is required';
      }
      if (!data.password) {
        return 'Password is required';
      }
      return undefined;
    }
    case 'phone-number': {
      if (!data.phoneNumber?.trim()) {
        return 'Phone number is required';
      }
      return undefined;
    }
    case 'verify-code': {
      if (!data.code?.trim()) {
        return 'Verification code is required';
      }
      return undefined;
    }
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
      if (!data.pairingCode?.trim()) {
        return 'Pairing code is required';
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

function getNextStep(stepId: WizardStepId, service: ServiceType): WizardStepId | undefined {
  switch (stepId) {
    case 'matrix-login':
      if (service === 'whatsapp' || service === 'telegram') {
        return 'phone-number';
      }
      if (service === 'instagram') {
        return 'credentials';
      }
      if (service === 'imessage') {
        return 'pairing';
      }
      return undefined;
    case 'phone-number':
      return service === 'telegram' ? 'verify-code' : 'qr-code';
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
    case 'matrix-login':
      return {
        stepId: 'matrix-login',
        title: 'Matrix login',
        description: 'Enter your Matrix homeserver credentials to host the bridge.',
        fields: [
          {
            name: 'homeserverUrl',
            label: 'Homeserver URL',
            type: 'text',
            placeholder: 'https://matrix.example.com',
          },
          { name: 'userId', label: 'User ID', type: 'text', placeholder: '@user:example.com' },
          { name: 'password', label: 'Password', type: 'password' },
        ],
      };
    case 'phone-number':
      return {
        stepId: 'phone-number',
        title: 'Phone number',
        description: `Enter the phone number for your ${service} account.`,
        fields: [
          {
            name: 'phoneNumber',
            label: 'Phone number',
            type: 'tel',
            placeholder: '+1 234 567 890',
          },
        ],
      };
    case 'verify-code':
      return {
        stepId: 'verify-code',
        title: 'Verification code',
        description: 'Enter the code sent to your phone by the bridge bot.',
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
        description: 'Scan the QR code with WhatsApp on your phone, then confirm below.',
        fields: [
          {
            name: 'qrCode',
            label: 'QR code data',
            type: 'qr',
            value: `mssgs://whatsapp/login?token=${crypto.randomUUID()}`,
          },
        ],
      };
    case 'credentials':
      return {
        stepId: 'credentials',
        title: 'Instagram credentials',
        description: 'Enter your Instagram username and password.',
        fields: [
          { name: 'username', label: 'Username', type: 'text' },
          { name: 'password', label: 'Password', type: 'password' },
        ],
      };
    case 'pairing':
      return {
        stepId: 'pairing',
        title: 'iMessage pairing',
        description: 'Enter the pairing code shown in Messages on your Mac.',
        fields: [
          {
            name: 'pairingCode',
            label: 'Pairing code',
            type: 'text',
            placeholder: '000-000',
          },
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
