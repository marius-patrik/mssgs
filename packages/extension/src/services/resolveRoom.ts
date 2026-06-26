import type { SetupServiceType } from './constants.js';

export function stripServiceSuffix(name: string | null): string | null {
  if (!name) {
    return null;
  }

  const stripped = name.replace(/\s*\((WhatsApp|Telegram|Instagram|iMessage)\)$/i, '').trim();
  return stripped || null;
}

export interface RoomResolutionInput {
  name: string | null;
  isDM: boolean;
  memberCount: number;
  memberNames?: string[];
}

export function resolveRoomDisplayName(
  room: RoomResolutionInput,
  detectedService?: SetupServiceType,
): string {
  if (room.name) {
    const stripped = stripServiceSuffix(room.name);
    if (stripped) {
      return stripped;
    }
  }

  if (room.isDM && room.memberNames && room.memberNames.length > 0) {
    return room.memberNames[0];
  }

  if (detectedService) {
    return room.isDM ? `${detectedService} direct message` : `${detectedService} group`;
  }

  return room.isDM ? 'Direct message' : `Group (${room.memberCount})`;
}
