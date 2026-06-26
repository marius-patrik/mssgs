import { beforeEach, describe, expect, it } from 'vitest';
import { MessageBus } from '../../shared/messages.js';
import { AccountWizardEngine } from '../AccountWizardEngine.js';
import { registerAccountWizardHandlers } from '../AccountWizardHandlers.js';

function getResult<T>(
  response:
    | { type: 'response'; id: string; result: unknown }
    | { type: 'response'; id: string; error: string },
): T {
  if ('error' in response) {
    throw new Error(response.error);
  }
  return response.result as T;
}

describe('registerAccountWizardHandlers', () => {
  let bus: MessageBus;
  let engine: AccountWizardEngine;

  beforeEach(() => {
    bus = new MessageBus();
    engine = new AccountWizardEngine();
    registerAccountWizardHandlers({ bus, engine });
  });

  it('handles getSupportedServices', async () => {
    const response = await bus.handleRequest({
      type: 'request',
      id: 'req-1',
      method: 'getSupportedServices',
      payload: undefined,
    });

    expect(response.type).toBe('response');
    const result = getResult<{ services: Array<{ service: string }> }>(response);
    expect(result.services).toHaveLength(4);
    expect(result.services.map((s) => s.service).sort()).toEqual([
      'imessage',
      'instagram',
      'telegram',
      'whatsapp',
    ]);
  });

  it('handles startAccountSetup', async () => {
    const response = await bus.handleRequest({
      type: 'request',
      id: 'req-2',
      method: 'startAccountSetup',
      payload: { service: 'telegram' },
    });

    expect(response.type).toBe('response');
    const result = getResult<{ setupId: string; step: { stepId: string } }>(response);
    expect(result.setupId).toBeDefined();
    expect(result.step.stepId).toBe('matrix-login');
  });

  it('handles submitAccountSetupStep', async () => {
    const start = await bus.handleRequest({
      type: 'request',
      id: 'req-3',
      method: 'startAccountSetup',
      payload: { service: 'telegram' },
    });
    const { setupId } = getResult<{ setupId: string }>(start);

    const response = await bus.handleRequest({
      type: 'request',
      id: 'req-4',
      method: 'submitAccountSetupStep',
      payload: {
        setupId,
        stepId: 'matrix-login',
        data: {
          homeserverUrl: 'https://matrix.example.com',
          userId: '@user:example.com',
          password: 'secret',
        },
      },
    });

    expect(response.type).toBe('response');
    const result = getResult<{ done: boolean; step?: { stepId: string } }>(response);
    expect(result.done).toBe(false);
    expect(result.step?.stepId).toBe('phone-number');
  });

  it('handles cancelAccountSetup', async () => {
    const start = await bus.handleRequest({
      type: 'request',
      id: 'req-5',
      method: 'startAccountSetup',
      payload: { service: 'whatsapp' },
    });
    const { setupId } = getResult<{ setupId: string }>(start);

    const response = await bus.handleRequest({
      type: 'request',
      id: 'req-6',
      method: 'cancelAccountSetup',
      payload: { setupId },
    });

    expect(getResult(response)).toEqual({ cancelled: true });
  });

  it('handles getAccountSetupStatus', async () => {
    const start = await bus.handleRequest({
      type: 'request',
      id: 'req-7',
      method: 'startAccountSetup',
      payload: { service: 'instagram' },
    });
    const { setupId } = getResult<{ setupId: string }>(start);

    const response = await bus.handleRequest({
      type: 'request',
      id: 'req-8',
      method: 'getAccountSetupStatus',
      payload: { setupId },
    });

    const result = getResult<{ setupId: string; status: string }>(response);
    expect(result.setupId).toBe(setupId);
    expect(result.status).toBe('active');
  });

  it('returns error for unknown setup status', async () => {
    const response = await bus.handleRequest({
      type: 'request',
      id: 'req-9',
      method: 'getAccountSetupStatus',
      payload: { setupId: 'unknown-id' },
    });

    const result = getResult<{ status: string; error: string }>(response);
    expect(result.status).toBe('error');
    expect(result.error).toContain('not found');
  });
});
