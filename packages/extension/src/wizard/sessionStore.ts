import type { SetupServiceType } from '../services/constants.js';
import type { AccountSetupSession, AccountSetupStatus } from './types.js';

const SESSION_TTL_MS = 30 * 60 * 1000;

function now(): number {
  return Date.now();
}

function createId(): string {
  return crypto.randomUUID();
}

function instructionsForService(service: SetupServiceType): string {
  const instructions: Record<SetupServiceType, string> = {
    whatsapp:
      'Open WhatsApp on your phone, tap the menu, select Linked Devices, then scan the QR code shown here.',
    telegram:
      'Click the link to start the Telegram bridge bot, then return here and confirm the connection.',
    instagram:
      'Enter your Instagram two-factor confirmation code or session token to finish pairing.',
    imessage:
      'On this Mac, open the iMessage bridge helper and enter the pairing code shown below.',
  };

  return instructions[service];
}

function initialStatusForService(service: SetupServiceType): AccountSetupStatus {
  if (service === 'whatsapp') {
    return 'qr';
  }

  if (service === 'telegram') {
    return 'link';
  }

  return 'awaiting_input';
}

export class AccountSetupSessionStore {
  private sessions = new Map<string, AccountSetupSession>();

  create(service: SetupServiceType): AccountSetupSession {
    this.pruneExpired();

    const session: AccountSetupSession = {
      id: createId(),
      service,
      status: initialStatusForService(service),
      instructions: instructionsForService(service),
      qrData: service === 'whatsapp' ? `mssgs://setup/whatsapp/${crypto.randomUUID()}` : undefined,
      link:
        service === 'telegram' ? `https://t.me/mssgs_bridge_bot?start=${createId()}` : undefined,
      createdAt: now(),
      updatedAt: now(),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  get(sessionId: string): AccountSetupSession | undefined {
    this.pruneExpired();
    return this.sessions.get(sessionId);
  }

  update(
    sessionId: string,
    updates: Partial<Omit<AccountSetupSession, 'id' | 'service' | 'createdAt'>>,
  ): AccountSetupSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return undefined;
    }

    const updated: AccountSetupSession = {
      ...session,
      ...updates,
      updatedAt: now(),
    };

    this.sessions.set(sessionId, updated);
    return updated;
  }

  cancel(sessionId: string): boolean {
    this.pruneExpired();
    return this.sessions.delete(sessionId);
  }

  private pruneExpired(): void {
    const cutoff = now() - SESSION_TTL_MS;
    for (const [id, session] of this.sessions) {
      if (session.updatedAt < cutoff) {
        this.sessions.delete(id);
      }
    }
  }
}
