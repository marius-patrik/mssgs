import { describe, expect, it } from 'vitest';
import { AccountWizardEngine } from '../AccountWizardEngine.js';

describe('AccountWizardEngine', () => {
  it('starts WhatsApp setup with phone-number step', () => {
    const engine = new AccountWizardEngine();
    const result = engine.start('whatsapp');

    expect(result.setupId).toBeDefined();
    expect(result.step.stepId).toBe('phone-number');
  });

  it('starts Telegram setup with phone-number step', () => {
    const engine = new AccountWizardEngine();
    const result = engine.start('telegram');

    expect(result.step.stepId).toBe('phone-number');
  });

  it('starts Instagram setup with credentials step', () => {
    const engine = new AccountWizardEngine();
    const result = engine.start('instagram');

    expect(result.step.stepId).toBe('credentials');
  });

  it('starts iMessage setup with pairing step', () => {
    const engine = new AccountWizardEngine();
    const result = engine.start('imessage');

    expect(result.step.stepId).toBe('pairing');
  });

  it('advances WhatsApp from phone-number to qr-code', () => {
    const engine = new AccountWizardEngine();
    const { setupId } = engine.start('whatsapp');

    const result = engine.submit(setupId, 'phone-number', { phoneNumber: '+1234567890' });

    expect(result.done).toBe(false);
    expect(result.step?.stepId).toBe('qr-code');
    expect(result.error).toBeUndefined();
  });

  it('advances Telegram from phone-number to verify-code', () => {
    const engine = new AccountWizardEngine();
    const { setupId } = engine.start('telegram');

    const result = engine.submit(setupId, 'phone-number', { phoneNumber: '+1234567890' });

    expect(result.step?.stepId).toBe('verify-code');
  });

  it('completes Instagram setup after credentials', () => {
    const engine = new AccountWizardEngine();
    const { setupId } = engine.start('instagram');

    const result = engine.submit(setupId, 'credentials', {
      username: 'instauser',
      password: 'secret',
    });

    expect(result.done).toBe(true);
    expect(engine.status(setupId)?.status).toBe('completed');
  });

  it('completes iMessage setup after pairing code', () => {
    const engine = new AccountWizardEngine();
    const { setupId } = engine.start('imessage');

    const result = engine.submit(setupId, 'pairing', { pairingCode: '123-456' });

    expect(result.done).toBe(true);
  });

  it('returns validation errors for missing fields', () => {
    const engine = new AccountWizardEngine();
    const { setupId } = engine.start('whatsapp');

    const result = engine.submit(setupId, 'phone-number', { phoneNumber: '' });

    expect(result.done).toBe(false);
    expect(result.error).toContain('Phone number');
    expect(engine.status(setupId)?.status).toBe('error');
  });

  it('rejects submissions for non-existent sessions', () => {
    const engine = new AccountWizardEngine();
    const result = engine.submit('unknown-id', 'phone-number', {});

    expect(result.error).toBe('Setup session not found');
  });

  it('rejects submissions for wrong step', () => {
    const engine = new AccountWizardEngine();
    const { setupId } = engine.start('whatsapp');

    const result = engine.submit(setupId, 'credentials', { username: 'x', password: 'y' });

    expect(result.error).toContain('Expected step phone-number');
  });

  it('cancels an active session', () => {
    const engine = new AccountWizardEngine();
    const { setupId } = engine.start('whatsapp');

    expect(engine.cancel(setupId)).toEqual({ cancelled: true });
    expect(engine.status(setupId)?.status).toBe('cancelled');
  });

  it('returns cancelled false for unknown session', () => {
    const engine = new AccountWizardEngine();
    expect(engine.cancel('unknown-id')).toEqual({ cancelled: false });
  });
});
