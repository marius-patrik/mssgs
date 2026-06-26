import { describe, expect, test } from 'vitest';
import { resolveAvatarUrl } from '../resolveAvatar.js';

describe('resolveAvatar', () => {
  test('converts mxc url to thumbnail url', () => {
    expect(resolveAvatarUrl('mxc://example.com/abc123', 'https://example.com', 64, 64)).toBe(
      'https://example.com/_matrix/media/v3/thumbnail/example.com/abc123?width=64&height=64&method=scale',
    );
  });

  test('returns null for missing avatar', () => {
    expect(resolveAvatarUrl(null, 'https://example.com')).toBeNull();
    expect(resolveAvatarUrl('mxc://example.com/abc123', '')).toBeNull();
  });

  test('passes through http urls', () => {
    expect(resolveAvatarUrl('https://cdn.example.com/avatar.png', 'https://example.com')).toBe(
      'https://cdn.example.com/avatar.png',
    );
  });

  test('returns null for unrecognized values', () => {
    expect(resolveAvatarUrl('not-a-url', 'https://example.com')).toBeNull();
  });
});
