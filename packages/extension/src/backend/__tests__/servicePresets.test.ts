import { describe, expect, test } from 'vitest';
import {
  SUPPORTED_SERVICES,
  createBridgeBotUserId,
  getServiceConfig,
  getSupportedServiceTypes,
} from '../servicePresets.js';

describe('servicePresets', () => {
  test('lists supported services without Matrix terminology', () => {
    const services = getSupportedServiceTypes();
    expect(services).toEqual(['imessage', 'telegram', 'whatsapp', 'instagram']);

    for (const config of SUPPORTED_SERVICES) {
      expect(config.displayName).not.toContain('Matrix');
      expect(config.bridgeBotLocalpart).toMatch(/bot$/);
    }
  });

  test('returns service config by service type', () => {
    expect(getServiceConfig('telegram')?.displayName).toBe('Telegram');
    expect(getServiceConfig('whatsapp')?.displayName).toBe('WhatsApp');
    expect(getServiceConfig('matrix')).toBeUndefined();
  });

  test('creates bridge bot user id from homeserver url', () => {
    expect(createBridgeBotUserId('telegram', 'https://example.com')).toBe(
      '@telegrambot:example.com',
    );
    expect(createBridgeBotUserId('whatsapp', 'https://matrix.example.org:8443')).toBe(
      '@whatsappbot:matrix.example.org',
    );
    expect(createBridgeBotUserId('matrix', 'https://example.com')).toBeUndefined();
  });

  test('handles homeserver urls without protocol', () => {
    expect(createBridgeBotUserId('imessage', 'example.com')).toBe('@imessagebot:example.com');
  });
});
