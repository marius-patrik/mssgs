import { describe, expect, test } from 'vitest';
import {
  createBridgeBotUserId,
  getBridgeBotLocalpart,
  getServiceProfile,
  getSupportedServiceTypes,
} from '../serviceRegistry.js';

describe('serviceRegistry', () => {
  test('returns service profiles for supported services', () => {
    const whatsapp = getServiceProfile('whatsapp');
    expect(whatsapp.displayName).toBe('WhatsApp');
    expect(whatsapp.iconName).toBe('whatsapp');
    expect(whatsapp.color).toBe('#25D366');
    expect(whatsapp.bridgeBotLocalpart).toBe('whatsappbot');

    const telegram = getServiceProfile('telegram');
    expect(telegram.displayName).toBe('Telegram');
    expect(telegram.color).toBe('#0088cc');
  });

  test('lists supported service types excluding Matrix fallback', () => {
    expect(getSupportedServiceTypes()).toEqual(['whatsapp', 'telegram', 'instagram', 'imessage']);
  });

  test('returns bridge bot localpart for supported services', () => {
    expect(getBridgeBotLocalpart('instagram')).toBe('instagrambot');
    expect(getBridgeBotLocalpart('imessage')).toBe('imessagebot');
    expect(getBridgeBotLocalpart('matrix')).toBeNull();
  });

  test('creates bridge bot user id from homeserver url', () => {
    expect(createBridgeBotUserId('whatsapp', 'https://example.com')).toBe(
      '@whatsappbot:example.com',
    );
    expect(createBridgeBotUserId('telegram', 'https://matrix.example.org:8443')).toBe(
      '@telegrambot:matrix.example.org',
    );
    expect(createBridgeBotUserId('matrix', 'https://example.com')).toBeUndefined();
  });

  test('handles homeserver urls without protocol', () => {
    expect(createBridgeBotUserId('imessage', 'example.com')).toBe('@imessagebot:example.com');
  });
});
