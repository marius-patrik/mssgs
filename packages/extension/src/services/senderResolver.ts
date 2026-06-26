import type { ServiceType } from '../shared/types.js';

export interface RoomMember {
  userId: string;
  displayName?: string;
  avatarUrl?: string | null;
}

export interface SenderInfo {
  displayName: string;
  avatarUrl: string | null;
  userId: string;
}

export function resolveSenderName(
  senderId: string,
  members: RoomMember[],
  fallback = 'Unknown',
): SenderInfo {
  const member = members.find((m) => m.userId === senderId);

  return {
    userId: senderId,
    displayName: member?.displayName?.trim() || fallback,
    avatarUrl: member?.avatarUrl ?? null,
  };
}

export function isBridgeBot(userId: string, service: ServiceType): boolean {
  const localpart = userId.startsWith('@') ? userId.slice(1).split(':')[0] : userId;
  const expected = `${service.toLowerCase()}bot`;
  return localpart.toLowerCase() === expected;
}

export function extractRealSenderFromBridgeBody(
  body: string,
  service: ServiceType,
): { displayName: string; text: string } | undefined {
  if (!body) {
    return undefined;
  }

  switch (service) {
    case 'whatsapp':
    case 'telegram':
    case 'instagram': {
      const match = body.match(/^([^:]+):\s*([\s\S]*)$/);
      if (match?.[1] && match[2]) {
        return { displayName: match[1].trim(), text: match[2].trim() };
      }
      return undefined;
    }
    case 'imessage': {
      const match = body.match(/^([^:]+):\s*([\s\S]*)$/);
      if (match?.[1] && match[2]) {
        return { displayName: match[1].trim(), text: match[2].trim() };
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

export function resolveRoomDisplayName(
  roomName: string | null,
  members: RoomMember[],
  ownUserId: string,
): string {
  if (roomName?.trim()) {
    return roomName.trim();
  }

  const others = members.filter((m) => m.userId !== ownUserId);
  if (others.length === 0) {
    return 'Empty room';
  }

  const names = others.map((m) => m.displayName?.trim() || m.userId);
  if (names.length <= 2) {
    return names.join(', ');
  }

  return `${names[0]} and ${others.length - 1} others`;
}
