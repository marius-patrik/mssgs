import { describe, expect, test } from 'vitest';
import { detectService } from '../detectService.js';
import type { MatrixRoomCandidate } from '../types.js';

function makeRoom(overrides: Partial<MatrixRoomCandidate> = {}): MatrixRoomCandidate {
  return {
    roomId: '!room:example.com',
    name: null,
    memberUserIds: [],
    homeserverUrl: 'https://example.com',
    ...overrides,
  };
}

describe('detectService', () => {
  test('detects WhatsApp from bridge bot membership', () => {
    const room = makeRoom({
      memberUserIds: ['@whatsappbot:example.com', '@user:example.com'],
    });

    expect(detectService(room)).toBe('whatsapp');
  });

  test('detects Telegram from bridge bot membership', () => {
    const room = makeRoom({
      memberUserIds: ['@telegrambot:example.com', '@user:example.com'],
    });

    expect(detectService(room)).toBe('telegram');
  });

  test('detects Instagram from bridge bot membership', () => {
    const room = makeRoom({
      memberUserIds: ['@instagrambot:example.com', '@user:example.com'],
    });

    expect(detectService(room)).toBe('instagram');
  });

  test('detects iMessage from bridge bot membership', () => {
    const room = makeRoom({
      memberUserIds: ['@imessagebot:example.com', '@user:example.com'],
    });

    expect(detectService(room)).toBe('imessage');
  });

  test('detects service from portal user ids', () => {
    const whatsapp = makeRoom({
      memberUserIds: ['@whatsapp_1234567890:example.com'],
    });
    expect(detectService(whatsapp)).toBe('whatsapp');

    const telegram = makeRoom({
      memberUserIds: ['@telegram_12345:example.com'],
    });
    expect(detectService(telegram)).toBe('telegram');
  });

  test('detects service from room name patterns', () => {
    const instagram = makeRoom({ name: 'Instagram: alice' });
    expect(detectService(instagram)).toBe('instagram');

    const imessage = makeRoom({ name: 'iMessage chat' });
    expect(detectService(imessage)).toBe('imessage');
  });

  test('falls back to matrix when no bridge signals are present', () => {
    const room = makeRoom({
      name: 'General chat',
      memberUserIds: ['@alice:example.com', '@bob:example.com'],
    });

    expect(detectService(room)).toBe('matrix');
  });

  test('uses provided fallback service', () => {
    const room = makeRoom({
      name: 'General chat',
      memberUserIds: ['@alice:example.com'],
    });

    expect(detectService(room, 'whatsapp')).toBe('whatsapp');
  });

  test('bridge bot membership takes precedence over room name', () => {
    const room = makeRoom({
      name: 'Telegram group',
      memberUserIds: ['@whatsappbot:example.com', '@user:example.com'],
    });

    expect(detectService(room)).toBe('whatsapp');
  });
});
