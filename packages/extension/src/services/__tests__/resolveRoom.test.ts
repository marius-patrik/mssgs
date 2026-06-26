import { describe, expect, test } from 'vitest';
import { resolveRoomDisplayName, stripServiceSuffix } from '../resolveRoom.js';

describe('resolveRoom', () => {
  test('strips service suffix from room names', () => {
    expect(stripServiceSuffix('Alice (WhatsApp)')).toBe('Alice');
    expect(stripServiceSuffix('Group (Telegram)')).toBe('Group');
    expect(stripServiceSuffix('Plain room')).toBe('Plain room');
    expect(stripServiceSuffix(null)).toBeNull();
  });

  test('resolves display name from cleaned room name', () => {
    const room = { name: 'Bob (Instagram)', isDM: true, memberCount: 2 };
    expect(resolveRoomDisplayName(room, 'instagram')).toBe('Bob');
  });

  test('falls back to member name for unnamed DM', () => {
    const room = { name: null, isDM: true, memberCount: 2, memberNames: ['Charlie'] };
    expect(resolveRoomDisplayName(room)).toBe('Charlie');
  });

  test('falls back to group label for unnamed group', () => {
    const room = { name: null, isDM: false, memberCount: 5 };
    expect(resolveRoomDisplayName(room)).toBe('Group (5)');
  });
});
