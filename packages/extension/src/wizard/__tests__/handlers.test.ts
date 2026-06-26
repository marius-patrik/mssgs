import { beforeEach, describe, expect, it } from 'vitest';
import { MessageBus } from '../../shared/messages.js';
import { registerAccountSetupHandlers } from '../handlers.js';
import { AccountSetupSessionStore } from '../sessionStore.js';

describe('registerAccountSetupHandlers', () => {
  let bus: MessageBus;
  let store: AccountSetupSessionStore;

  beforeEach(() => {
    bus = new MessageBus();
    store = new AccountSetupSessionStore();
    registerAccountSetupHandlers(bus, { store });
  });

  it('starts a WhatsApp setup session with a QR payload', async () => {
    const response = await bus.handleRequest({
      type: 'request',
      id: 'req-1',
      method: 'startAccountSetup',
      payload: { service: 'whatsapp' },
    });

    expect(response.type).toBe('response');
    if (response.type !== 'response' || 'error' in response) {
      throw new Error('Expected successful response');
    }

    const result = response.result as {
      sessionId: string;
      status: string;
      qrData: string;
      instructions: string;
    };
    expect(result.status).toBe('qr');
    expect(result.qrData).toMatch(/^mssgs:\/\/setup\/whatsapp\//);
    expect(result.instructions).toContain('QR code');
  });

  it('starts a Telegram setup session with a link payload', async () => {
    const response = await bus.handleRequest({
      type: 'request',
      id: 'req-2',
      method: 'startAccountSetup',
      payload: { service: 'telegram' },
    });

    if (response.type !== 'response' || 'error' in response) {
      throw new Error('Expected successful response');
    }

    const result = response.result as { status: string; link: string };
    expect(result.status).toBe('link');
    expect(result.link).toMatch(/^https:\/\/t\.me\//);
  });

  it('reports setup status for an existing session', async () => {
    const start = await bus.handleRequest({
      type: 'request',
      id: 'req-3',
      method: 'startAccountSetup',
      payload: { service: 'instagram' },
    });

    if (start.type !== 'response' || 'error' in start) {
      throw new Error('Expected successful response');
    }

    const { sessionId } = start.result as { sessionId: string };

    const status = await bus.handleRequest({
      type: 'request',
      id: 'req-4',
      method: 'getAccountSetupStatus',
      payload: { sessionId },
    });

    if (status.type !== 'response' || 'error' in status) {
      throw new Error('Expected successful response');
    }

    expect(status.result).toMatchObject({ sessionId, status: 'awaiting_input' });
  });

  it('completes a session and returns a placeholder account id', async () => {
    const start = await bus.handleRequest({
      type: 'request',
      id: 'req-5',
      method: 'startAccountSetup',
      payload: { service: 'imessage' },
    });

    if (start.type !== 'response' || 'error' in start) {
      throw new Error('Expected successful response');
    }

    const { sessionId } = start.result as { sessionId: string };

    const complete = await bus.handleRequest({
      type: 'request',
      id: 'req-6',
      method: 'completeAccountSetup',
      payload: { sessionId, code: '123456' },
    });

    if (complete.type !== 'response' || 'error' in complete) {
      throw new Error('Expected successful response');
    }

    expect(complete.result).toMatchObject({ success: true, accountId: sessionId });
  });

  it('rejects completion when a code is required but missing', async () => {
    const start = await bus.handleRequest({
      type: 'request',
      id: 'req-7',
      method: 'startAccountSetup',
      payload: { service: 'instagram' },
    });

    if (start.type !== 'response' || 'error' in start) {
      throw new Error('Expected successful response');
    }

    const { sessionId } = start.result as { sessionId: string };

    const complete = await bus.handleRequest({
      type: 'request',
      id: 'req-8',
      method: 'completeAccountSetup',
      payload: { sessionId },
    });

    if (complete.type !== 'response' || 'error' in complete) {
      throw new Error('Expected successful response');
    }

    expect(complete.result).toMatchObject({ success: false });
  });

  it('cancels a session', async () => {
    const start = await bus.handleRequest({
      type: 'request',
      id: 'req-9',
      method: 'startAccountSetup',
      payload: { service: 'telegram' },
    });

    if (start.type !== 'response' || 'error' in start) {
      throw new Error('Expected successful response');
    }

    const { sessionId } = start.result as { sessionId: string };

    const cancel = await bus.handleRequest({
      type: 'request',
      id: 'req-10',
      method: 'cancelAccountSetup',
      payload: { sessionId },
    });

    if (cancel.type !== 'response' || 'error' in cancel) {
      throw new Error('Expected successful response');
    }

    expect(cancel.result).toEqual({ cancelled: true });
  });

  it('returns an error for unsupported services', async () => {
    const response = await bus.handleRequest({
      type: 'request',
      id: 'req-11',
      method: 'startAccountSetup',
      payload: { service: 'matrix' as unknown as 'whatsapp' },
    });

    expect(response.type).toBe('response');
    expect('error' in response && response.error).toContain('Unsupported service');
  });
});
