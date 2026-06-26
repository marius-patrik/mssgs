import { describe, expect, test } from 'vitest';
import { resolveSenderInitials, resolveSenderName } from '../resolveSender.js';

describe('resolveSender', () => {
  test('prefers display name when available', () => {
    expect(resolveSenderName('@alice:example.com', 'Alice Anderson')).toBe('Alice Anderson');
  });

  test('falls back to localpart from matrix id', () => {
    expect(resolveSenderName('@bob:example.com')).toBe('bob');
  });

  test('falls back to plain username', () => {
    expect(resolveSenderName('charlie')).toBe('charlie');
  });

  test('computes up to two initials', () => {
    expect(resolveSenderInitials('Alice Anderson')).toBe('AA');
    expect(resolveSenderInitials('Bob')).toBe('B');
  });
});
