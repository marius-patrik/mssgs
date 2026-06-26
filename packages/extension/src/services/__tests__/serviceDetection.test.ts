import { describe, expect, it } from 'vitest';
import {
  detectServiceFromBridgeBot,
  detectServiceFromRoom,
  detectServiceFromRoomName,
  detectServicesFromMembers,
  getBridgeBotUserIdForService,
} from '../serviceDetection.js';

describe('detectServiceFromBridgeBot', () => {
  it('detects WhatsApp bridge bot', () => {
    const result = detectServiceFromBridgeBot('@whatsappbot:example.com');
    expect(result).toEqual({
      service: 'whatsapp',
      confidence: 'high',
      reason: 'Bridge bot localpart matches whatsappbot',
    });
  });

  it('detects Telegram bridge bot', () => {
    const result = detectServiceFromBridgeBot('@telegrambot:example.com');
    expect(result?.service).toBe('telegram');
  });

  it('detects Instagram bridge bot', () => {
    const result = detectServiceFromBridgeBot('@instagrambot:example.com');
    expect(result?.service).toBe('instagram');
  });

  it('detects iMessage bridge bot', () => {
    const result = detectServiceFromBridgeBot('@imessagebot:example.com');
    expect(result?.service).toBe('imessage');
  });

  it('returns undefined for regular users', () => {
    expect(detectServiceFromBridgeBot('@alice:example.com')).toBeUndefined();
  });

  it('returns undefined for invalid user IDs', () => {
    expect(detectServiceFromBridgeBot('not-a-user-id')).toBeUndefined();
  });
});

describe('detectServiceFromRoomName', () => {
  it('detects WhatsApp from room name prefix', () => {
    const result = detectServiceFromRoomName('WhatsApp: Alice');
    expect(result?.service).toBe('whatsapp');
    expect(result?.confidence).toBe('high');
  });

  it('detects Telegram from room name prefix', () => {
    const result = detectServiceFromRoomName('Telegram - Bob');
    expect(result?.service).toBe('telegram');
  });

  it('detects Instagram from room name prefix', () => {
    const result = detectServiceFromRoomName('Instagram: Carol');
    expect(result?.service).toBe('instagram');
  });

  it('detects iMessage from room name prefix', () => {
    const result = detectServiceFromRoomName('iMessage: Dave');
    expect(result?.service).toBe('imessage');
  });

  it('detects WhatsApp from phone number', () => {
    const result = detectServiceFromRoomName('+1234567890');
    expect(result?.service).toBe('whatsapp');
    expect(result?.confidence).toBe('medium');
  });

  it('returns undefined for unrelated names', () => {
    expect(detectServiceFromRoomName('Random chat')).toBeUndefined();
  });

  it('returns undefined for null names', () => {
    expect(detectServiceFromRoomName(null)).toBeUndefined();
  });
});

describe('detectServiceFromRoom', () => {
  it('prefers bridge bot detection over room name', () => {
    const result = detectServiceFromRoom('Random chat', [
      '@telegrambot:example.com',
      '@alice:example.com',
    ]);
    expect(result?.service).toBe('telegram');
  });

  it('falls back to room name when no bridge bot is present', () => {
    const result = detectServiceFromRoom('WhatsApp: Alice', ['@alice:example.com']);
    expect(result?.service).toBe('whatsapp');
  });

  it('returns undefined when nothing matches', () => {
    expect(detectServiceFromRoom('Random chat', ['@alice:example.com'])).toBeUndefined();
  });
});

describe('detectServicesFromMembers', () => {
  it('returns unique detected services across members', () => {
    const result = detectServicesFromMembers([
      '@whatsappbot:example.com',
      '@telegrambot:example.com',
      '@whatsappbot:backup.example.com',
      '@alice:example.com',
    ]);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.service).sort()).toEqual(['telegram', 'whatsapp']);
  });

  it('returns empty array when no bridge bots are present', () => {
    expect(detectServicesFromMembers(['@alice:example.com', '@bob:example.com'])).toHaveLength(0);
  });
});

describe('getBridgeBotUserIdForService', () => {
  it('builds WhatsApp bridge bot user ID', () => {
    expect(getBridgeBotUserIdForService('whatsapp', 'https://matrix.example.com')).toBe(
      '@whatsappbot:matrix.example.com',
    );
  });

  it('builds Telegram bridge bot user ID', () => {
    expect(getBridgeBotUserIdForService('telegram', 'https://matrix.example.com')).toBe(
      '@telegrambot:matrix.example.com',
    );
  });

  it('returns undefined for unsupported services', () => {
    expect(getBridgeBotUserIdForService('discord', 'https://matrix.example.com')).toBeUndefined();
  });

  it('handles bare hostnames', () => {
    expect(getBridgeBotUserIdForService('imessage', 'matrix.example.com')).toBe(
      '@imessagebot:matrix.example.com',
    );
  });
});
