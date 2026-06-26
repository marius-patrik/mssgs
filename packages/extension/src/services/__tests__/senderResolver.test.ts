import { describe, expect, it } from 'vitest';
import {
  extractRealSenderFromBridgeBody,
  isBridgeBot,
  resolveRoomDisplayName,
  resolveSenderName,
} from '../senderResolver.js';

describe('resolveSenderName', () => {
  it('resolves a known member', () => {
    const result = resolveSenderName('@alice:example.com', [
      { userId: '@alice:example.com', displayName: 'Alice' },
    ]);
    expect(result).toEqual({
      userId: '@alice:example.com',
      displayName: 'Alice',
      avatarUrl: null,
    });
  });

  it('falls back to user ID when display name is missing', () => {
    const result = resolveSenderName('@bob:example.com', [], 'Unknown');
    expect(result.displayName).toBe('Unknown');
  });

  it('uses the provided fallback', () => {
    const result = resolveSenderName('@bob:example.com', [], 'Mystery sender');
    expect(result.displayName).toBe('Mystery sender');
  });
});

describe('isBridgeBot', () => {
  it('recognizes WhatsApp bridge bot', () => {
    expect(isBridgeBot('@whatsappbot:example.com', 'whatsapp')).toBe(true);
  });

  it('rejects mismatching bridge bots', () => {
    expect(isBridgeBot('@telegrambot:example.com', 'whatsapp')).toBe(false);
  });

  it('recognizes localpart without server', () => {
    expect(isBridgeBot('whatsappbot', 'whatsapp')).toBe(true);
  });
});

describe('extractRealSenderFromBridgeBody', () => {
  it('extracts sender and text for WhatsApp-style bodies', () => {
    const result = extractRealSenderFromBridgeBody('Alice: Hello there', 'whatsapp');
    expect(result).toEqual({ displayName: 'Alice', text: 'Hello there' });
  });

  it('extracts sender and text for Telegram-style bodies', () => {
    const result = extractRealSenderFromBridgeBody('Bob: How are you?', 'telegram');
    expect(result).toEqual({ displayName: 'Bob', text: 'How are you?' });
  });

  it('extracts sender and text for iMessage-style bodies', () => {
    const result = extractRealSenderFromBridgeBody('Carol: Good morning', 'imessage');
    expect(result).toEqual({ displayName: 'Carol', text: 'Good morning' });
  });

  it('returns undefined for malformed bodies', () => {
    expect(extractRealSenderFromBridgeBody('Just text', 'whatsapp')).toBeUndefined();
  });

  it('returns undefined for empty bodies', () => {
    expect(extractRealSenderFromBridgeBody('', 'whatsapp')).toBeUndefined();
  });
});

describe('resolveRoomDisplayName', () => {
  it('uses the room name when available', () => {
    expect(
      resolveRoomDisplayName('Family chat', [{ userId: '@alice:example.com' }], '@me:example.com'),
    ).toBe('Family chat');
  });

  it('builds a name from other members', () => {
    expect(
      resolveRoomDisplayName(
        null,
        [
          { userId: '@me:example.com', displayName: 'Me' },
          { userId: '@alice:example.com', displayName: 'Alice' },
        ],
        '@me:example.com',
      ),
    ).toBe('Alice');
  });

  it('truncates long member lists', () => {
    expect(
      resolveRoomDisplayName(
        null,
        [
          { userId: '@me:example.com', displayName: 'Me' },
          { userId: '@a:example.com', displayName: 'A' },
          { userId: '@b:example.com', displayName: 'B' },
          { userId: '@c:example.com', displayName: 'C' },
        ],
        '@me:example.com',
      ),
    ).toBe('A and 2 others');
  });

  it('falls back to user ID for unnamed members', () => {
    expect(
      resolveRoomDisplayName(null, [{ userId: '@alice:example.com' }], '@me:example.com'),
    ).toBe('@alice:example.com');
  });

  it('handles empty rooms', () => {
    expect(resolveRoomDisplayName(null, [], '@me:example.com')).toBe('Empty room');
  });
});
