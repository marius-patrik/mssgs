import { describe, expect, it } from 'vitest';
import { AccountWizardEngine } from '../AccountWizardEngine.js';

describe('AccountWizardEngine', () => {
  it('starts Beeper/Matrix setup with a login step', () => {
    const engine = new AccountWizardEngine();
    const result = engine.start('matrix');

    expect(result.setupId).toBeDefined();
    expect(result.step.stepId).toBe('matrix-login');
  });

  it('requires username and password', () => {
    const engine = new AccountWizardEngine();
    const { setupId } = engine.start('matrix');

    const result = engine.submit(setupId, 'matrix-login', {
      username: '',
      password: '',
    });

    expect(result.done).toBe(false);
    expect(result.error).toContain('Username');
  });

  it('completes after valid credentials', () => {
    const engine = new AccountWizardEngine();
    const { setupId } = engine.start('matrix');

    const result = engine.submit(setupId, 'matrix-login', {
      username: '@user:beeper.com',
      password: 'secret',
    });

    expect(result.done).toBe(true);
    expect(engine.status(setupId)?.status).toBe('completed');
  });

  it('rejects submissions for non-existent sessions', () => {
    const engine = new AccountWizardEngine();
    const result = engine.submit('unknown-id', 'matrix-login', {});

    expect(result.error).toBe('Setup session not found');
  });

  it('rejects submissions for wrong step', () => {
    const engine = new AccountWizardEngine();
    const { setupId } = engine.start('matrix');

    const result = engine.submit(setupId, 'complete', {});

    expect(result.error).toContain('Expected step matrix-login');
  });

  it('cancels an active session', () => {
    const engine = new AccountWizardEngine();
    const { setupId } = engine.start('matrix');

    expect(engine.cancel(setupId)).toEqual({ cancelled: true });
    expect(engine.status(setupId)?.status).toBe('cancelled');
  });

  it('returns cancelled false for unknown session', () => {
    const engine = new AccountWizardEngine();
    expect(engine.cancel('unknown-id')).toEqual({ cancelled: false });
  });
});
