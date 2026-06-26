import { describe, expect, test } from 'vitest';
import {
  detectServiceTypeFromRoom,
  detectServiceTypeFromSender,
  normalizeServiceType,
} from '../detectService.js';

describe('detectService', () => {
  test('detects service from bridge bot sender id', () => {
    expect(detectServiceTypeFromSender('@whatsappbot:example.com')).toBe('whatsapp');
    expect(detectServiceTypeFromSender('@telegrambot:example.com')).toBe('telegram');
    expect(detectServiceTypeFromSender('@instagrambot:example.com')).toBe('instagram');
    expect(detectServiceTypeFromSender('@imessagebot:example.com')).toBe('imessage');
  });

  test('returns undefined for non-bridge senders', () => {
    expect(detectServiceTypeFromSender('@alice:example.com')).toBeUndefined();
    expect(detectServiceTypeFromSender('regular-user')).toBeUndefined();
  });

  test('detects service from room name suffix', () => {
    expect(detectServiceTypeFromRoom('Alice (WhatsApp)')).toBe('whatsapp');
    expect(detectServiceTypeFromRoom('Family chat (Telegram)')).toBe('telegram');
    expect(detectServiceTypeFromRoom(null)).toBeUndefined();
  });

  test('falls back to member ids when room name has no suffix', () => {
    expect(
      detectServiceTypeFromRoom('Unnamed room', ['@alice:example.com', '@whatsappbot:example.com']),
    ).toBe('whatsapp');
  });

  test('normalizes known services and defaults unknown to matrix', () => {
    expect(normalizeServiceType('whatsapp')).toBe('whatsapp');
    expect(normalizeServiceType('telegrambot')).toBe('telegram');
    expect(normalizeServiceType('unknown')).toBe('matrix');
  });
});
