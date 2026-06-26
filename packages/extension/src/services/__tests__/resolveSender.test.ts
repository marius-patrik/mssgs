import { describe, expect, test } from 'vitest';
import { cleanBridgeSuffix, detectSenderService, resolveSender } from '../resolveSender.js';
import type { SenderInfo } from '../types.js';

describe('resolveSender', () => {
  test('cleans bridge suffixes from display names', () => {
    expect(cleanBridgeSuffix('Alice (WhatsApp)')).toBe('Alice');
    expect(cleanBridgeSuffix('Bob (Telegram)')).toBe('Bob');
    expect(cleanBridgeSuffix('Charlie')).toBe('Charlie');
  });

  test('resolves sender with cleaned name and conversation service', () => {
    const sender: SenderInfo = {
      userId: '@whatsapp_123:example.com',
      displayName: 'Alice (WhatsApp)',
      avatarUrl: 'https://example.com/alice.png',
    };

    const resolved = resolveSender(sender, 'whatsapp');

    expect(resolved.userId).toBe('@whatsapp_123:example.com');
    expect(resolved.displayName).toBe('Alice');
    expect(resolved.avatarUrl).toBe('https://example.com/alice.png');
    expect(resolved.service).toBe('whatsapp');
  });

  test('falls back to user id when display name is empty after cleaning', () => {
    const sender: SenderInfo = {
      userId: '@user:example.com',
      displayName: '(WhatsApp)',
      avatarUrl: null,
    };

    const resolved = resolveSender(sender, 'telegram');
    expect(resolved.displayName).toBe('@user:example.com');
  });

  test('hides bridge bots by mapping them to matrix service', () => {
    const sender: SenderInfo = {
      userId: '@whatsappbot:example.com',
      displayName: 'WhatsApp Bridge Bot',
      avatarUrl: null,
    };

    const resolved = resolveSender(sender, 'whatsapp');
    expect(resolved.service).toBe('matrix');
  });

  test('detects sender service from conversation service for regular users', () => {
    const sender: SenderInfo = {
      userId: '@user:example.com',
      displayName: 'User',
      avatarUrl: null,
    };

    expect(detectSenderService(sender.userId, 'instagram')).toBe('instagram');
    expect(detectSenderService(sender.userId, 'imessage')).toBe('imessage');
  });
});
