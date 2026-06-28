import { describe, expect, it } from 'vitest';
import { AccountWizardEngine } from '../AccountWizardEngine.js';

describe('AccountWizardEngine', () => {
  it('starts WhatsApp setup with a QR code step', () => {
    const engine = new AccountWizardEngine();
    const result = engine.start('whatsapp');

    expect(result.setupId).toBeDefined();
    expect(result.step.stepId).toBe('qr-code');
  });

  it('starts Telegram setup with a phone number step', () => {
    const engine = new AccountWizardEngine();
    const result = engine.start('telegram');

    expect(result.step.stepId).toBe('phone-number');
  });

  it('requires Telegram API credentials', () => {
    const engine = new AccountWizardEngine();
    const { setupId } = engine.start('telegram');

    const result = engine.submit(setupId, 'phone-number', {
      phoneNumber: '',
      apiId: '',
      apiHash: '',
    });

    expect(result.done).toBe(false);
    expect(result.error).toContain('Phone number');
  });

  it('moves Telegram from phone number to verification code', () => {
    const engine = new AccountWizardEngine();
    const { setupId } = engine.start('telegram');

    const result = engine.submit(setupId, 'phone-number', {
      phoneNumber: '+1234567890',
      apiId: '12345',
      apiHash: 'abc',
    });

    expect(result.done).toBe(false);
    expect(result.step?.stepId).toBe('verify-code');
  });

  it('requires Instagram credentials', () => {
    const engine = new AccountWizardEngine();
    const { setupId } = engine.start('instagram');

    const result = engine.submit(setupId, 'credentials', {
      username: '',
      password: '',
    });

    expect(result.done).toBe(false);
    expect(result.error).toContain('Username');
  });

  it('completes Instagram setup with valid credentials', () => {
    const engine = new AccountWizardEngine();
    const { setupId } = engine.start('instagram');

    const result = engine.submit(setupId, 'credentials', {
      username: 'user',
      password: 'pass',
    });

    expect(result.done).toBe(true);
    expect(engine.status(setupId)?.status).toBe('completed');
  });

  it('completes iMessage setup from pairing step', () => {
    const engine = new AccountWizardEngine();
    const { setupId } = engine.start('imessage');

    const result = engine.submit(setupId, 'pairing', {});

    expect(result.done).toBe(true);
  });

  it('rejects submissions for non-existent sessions', () => {
    const engine = new AccountWizardEngine();
    const result = engine.submit('unknown-id', 'phone-number', {});

    expect(result.error).toBe('Setup session not found');
  });

  it('rejects submissions for wrong step', () => {
    const engine = new AccountWizardEngine();
    const { setupId } = engine.start('telegram');

    const result = engine.submit(setupId, 'complete', {});

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
