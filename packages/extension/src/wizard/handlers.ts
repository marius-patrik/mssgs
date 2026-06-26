import { isSetupServiceType } from '../services/constants.js';
import type { AccountSetupResponse, MessageBus } from '../shared/messages.js';
import { AccountSetupSessionStore } from './sessionStore.js';
import type { AccountSetupSession, AccountSetupStatus } from './types.js';

function toResponse(session: AccountSetupSession): AccountSetupResponse {
  return {
    sessionId: session.id,
    status: session.status,
    instructions: session.instructions,
    qrData: session.qrData,
    link: session.link,
    error: session.error,
  };
}

export interface RegisterAccountSetupHandlersOptions {
  store?: AccountSetupSessionStore;
}

export function registerAccountSetupHandlers(
  bus: MessageBus,
  options: RegisterAccountSetupHandlersOptions = {},
): void {
  const store = options.store ?? new AccountSetupSessionStore();

  bus.registerHandler('startAccountSetup', ({ service }) => {
    if (!isSetupServiceType(service)) {
      throw new Error(`Unsupported service: ${service}`);
    }

    const session = store.create(service);
    return toResponse(session);
  });

  bus.registerHandler('getAccountSetupStatus', ({ sessionId }) => {
    const session = store.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return toResponse(session);
  });

  bus.registerHandler('cancelAccountSetup', ({ sessionId }) => {
    const cancelled = store.cancel(sessionId);
    return { cancelled };
  });

  bus.registerHandler('completeAccountSetup', ({ sessionId, code }) => {
    const session = store.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status === 'done') {
      return { success: true, accountId: session.id };
    }

    if (session.status === 'error') {
      return { success: false, error: session.error ?? 'Setup failed' };
    }

    if (session.status === 'awaiting_input' && !code) {
      const error = 'A confirmation code is required to complete this setup';
      store.update(sessionId, { status: 'error', error });
      return { success: false, error };
    }

    const nextStatus: AccountSetupStatus = 'done';
    store.update(sessionId, { status: nextStatus });
    return { success: true, accountId: session.id };
  });
}
