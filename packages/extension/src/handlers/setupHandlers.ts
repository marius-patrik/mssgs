import type { MessageBus } from '../shared/messages.js';
import type { SetupServiceType, SetupStatus } from '../shared/messages.js';

interface SetupSession {
  setupId: string;
  service: SetupServiceType;
  status: SetupStatus;
}

export class SetupHandler {
  private sessions = new Map<string, SetupSession>();

  register(bus: MessageBus): void {
    bus.registerHandler('startAccountSetup', (payload) => this.startSetup(payload));
    bus.registerHandler('submitAccountCredentials', (payload) => this.submitCredentials(payload));
    bus.registerHandler('cancelAccountSetup', (payload) => this.cancelSetup(payload));
    bus.registerHandler('getSetupStatus', (payload) => this.getStatus(payload));
  }

  private startSetup(payload: { service: SetupServiceType }): SetupStatus {
    const setupId = crypto.randomUUID();
    const status = createInitialStatus(setupId, payload.service);
    this.sessions.set(setupId, { setupId, service: payload.service, status });
    return status;
  }

  private submitCredentials(payload: {
    setupId: string;
    credentials: Record<string, string>;
  }): SetupStatus {
    const session = this.sessions.get(payload.setupId);
    if (!session) {
      return {
        setupId: payload.setupId,
        service: 'whatsapp',
        step: 'error',
        error: 'Setup session not found',
      };
    }

    const next = advanceStatus(session.service, payload.credentials);
    session.status = { ...next, setupId: payload.setupId };
    this.sessions.set(payload.setupId, session);
    return session.status;
  }

  private cancelSetup(payload: { setupId: string }): { cancelled: boolean } {
    this.sessions.delete(payload.setupId);
    return { cancelled: true };
  }

  private getStatus(payload: { setupId: string }): SetupStatus {
    const session = this.sessions.get(payload.setupId);
    return (
      session?.status ?? {
        setupId: payload.setupId,
        service: 'whatsapp',
        step: 'error',
        error: 'Setup session not found',
      }
    );
  }
}

function createInitialStatus(setupId: string, service: SetupServiceType): SetupStatus {
  switch (service) {
    case 'whatsapp':
      return {
        setupId,
        service,
        step: 'qr',
        instruction: 'Open WhatsApp on your phone and scan the QR code.',
        qrData: 'https://wa.me/qr?example',
      };
    case 'telegram':
      return {
        setupId,
        service,
        step: 'link',
        instruction: 'Click the link below to authenticate with Telegram.',
        linkUrl: 'https://t.me/example',
      };
    case 'instagram':
      return {
        setupId,
        service,
        step: 'credentials',
        instruction: 'Enter your Instagram username and password.',
      };
    case 'imessage':
      return {
        setupId,
        service,
        step: 'pairing',
        instruction: 'Accept the pairing request on your Mac to enable iMessage.',
      };
    default:
      return {
        setupId,
        service,
        step: 'error',
        error: 'Unsupported service',
      };
  }
}

function advanceStatus(
  service: SetupServiceType,
  credentials: Record<string, string>,
): Omit<SetupStatus, 'setupId'> {
  if (service === 'instagram') {
    const username = credentials.username ?? '';
    const password = credentials.password ?? '';

    if (!username || !password) {
      return {
        service,
        step: 'error',
        error: 'Username and password are required',
      };
    }

    return {
      service,
      step: 'connecting',
      instruction: 'Connecting to Instagram…',
    };
  }

  return {
    service,
    step: 'connecting',
    instruction: 'Connecting to service…',
  };
}
