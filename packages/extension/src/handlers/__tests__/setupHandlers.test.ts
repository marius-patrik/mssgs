import { beforeEach, describe, expect, it } from 'vitest';
import { MessageBus } from '../../shared/messages.js';
import { SetupHandler } from '../setupHandlers.js';

describe('SetupHandler', () => {
  let bus: MessageBus;
  let handler: SetupHandler;

  beforeEach(() => {
    bus = new MessageBus();
    handler = new SetupHandler();
    handler.register(bus);
  });

  it('starts WhatsApp setup with QR step', async () => {
    const response = await bus.handleRequest({
      type: 'request',
      id: 'req-1',
      method: 'startAccountSetup',
      payload: { service: 'whatsapp' },
    });

    expect(response.type).toBe('response');
    if ('error' in response) {
      throw new Error(response.error);
    }

    const status = response.result as { service: string; step: string; qrData: string };
    expect(status.service).toBe('whatsapp');
    expect(status.step).toBe('qr');
    expect(status.qrData).toBeDefined();
  });

  it('starts Telegram setup with link step', async () => {
    const response = await bus.handleRequest({
      type: 'request',
      id: 'req-2',
      method: 'startAccountSetup',
      payload: { service: 'telegram' },
    });

    expect(response.type).toBe('response');
    if ('error' in response) {
      throw new Error(response.error);
    }

    const status = response.result as { service: string; step: string; linkUrl: string };
    expect(status.service).toBe('telegram');
    expect(status.step).toBe('link');
    expect(status.linkUrl).toBeDefined();
  });

  it('starts Instagram setup with credentials step', async () => {
    const response = await bus.handleRequest({
      type: 'request',
      id: 'req-3',
      method: 'startAccountSetup',
      payload: { service: 'instagram' },
    });

    expect(response.type).toBe('response');
    if ('error' in response) {
      throw new Error(response.error);
    }

    const status = response.result as { service: string; step: string };
    expect(status.service).toBe('instagram');
    expect(status.step).toBe('credentials');
  });

  it('advances Instagram setup to connecting when credentials are provided', async () => {
    const start = await bus.handleRequest({
      type: 'request',
      id: 'req-4',
      method: 'startAccountSetup',
      payload: { service: 'instagram' },
    });

    if ('error' in start) {
      throw new Error(start.error);
    }

    const { setupId } = start.result as { setupId: string };

    const submit = await bus.handleRequest({
      type: 'request',
      id: 'req-5',
      method: 'submitAccountCredentials',
      payload: {
        setupId,
        credentials: { username: 'alice', password: 'secret' },
      },
    });

    if ('error' in submit) {
      throw new Error(submit.error);
    }

    const status = submit.result as { step: string };
    expect(status.step).toBe('connecting');
  });

  it('returns error for Instagram when credentials are missing', async () => {
    const start = await bus.handleRequest({
      type: 'request',
      id: 'req-6',
      method: 'startAccountSetup',
      payload: { service: 'instagram' },
    });

    if ('error' in start) {
      throw new Error(start.error);
    }

    const { setupId } = start.result as { setupId: string };

    const submit = await bus.handleRequest({
      type: 'request',
      id: 'req-7',
      method: 'submitAccountCredentials',
      payload: { setupId, credentials: {} },
    });

    if ('error' in submit) {
      throw new Error(submit.error);
    }

    const status = submit.result as { step: string; error?: string };
    expect(status.step).toBe('error');
    expect(status.error).toContain('Username and password');
  });

  it('cancels an active setup session', async () => {
    const start = await bus.handleRequest({
      type: 'request',
      id: 'req-8',
      method: 'startAccountSetup',
      payload: { service: 'imessage' },
    });

    if ('error' in start) {
      throw new Error(start.error);
    }

    const { setupId } = start.result as { setupId: string };

    const cancel = await bus.handleRequest({
      type: 'request',
      id: 'req-9',
      method: 'cancelAccountSetup',
      payload: { setupId },
    });

    if ('error' in cancel) {
      throw new Error(cancel.error);
    }

    expect(cancel.result).toEqual({ cancelled: true });

    const status = await bus.handleRequest({
      type: 'request',
      id: 'req-10',
      method: 'getSetupStatus',
      payload: { setupId },
    });

    if ('error' in status) {
      throw new Error(status.error);
    }

    expect((status.result as { step: string }).step).toBe('error');
  });
});
