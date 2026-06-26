import { describe, expect, it } from 'vitest';
import { SERVICE_REGISTRY, getServiceMeta } from '../serviceRegistry';

describe('serviceRegistry', () => {
  it('provides metadata for supported messaging services', () => {
    expect(SERVICE_REGISTRY.whatsapp.label).toBe('WhatsApp');
    expect(SERVICE_REGISTRY.telegram.label).toBe('Telegram');
    expect(SERVICE_REGISTRY.instagram.label).toBe('Instagram');
    expect(SERVICE_REGISTRY.imessage.label).toBe('iMessage');
  });

  it('falls back to Matrix for unknown services', () => {
    const meta = getServiceMeta('matrix');
    expect(meta.label).toBe('Matrix');
  });
});
