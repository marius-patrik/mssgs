import { SUPPORTED_SERVICES } from '../backend/servicePresets.js';
import type { ServiceType } from '../shared/types.js';
import type { SetupServiceType } from './constants.js';

const LOCALPART_TO_SERVICE = new Map<string, SetupServiceType>(
  SUPPORTED_SERVICES.map((config) => [
    config.bridgeBotLocalpart,
    config.service as SetupServiceType,
  ]),
);

function extractLocalpart(userId: string): string {
  const withoutLeadingAt = userId.startsWith('@') ? userId.slice(1) : userId;
  return withoutLeadingAt.split(':')[0] ?? withoutLeadingAt;
}

export function detectServiceTypeFromSender(senderId: string): SetupServiceType | undefined {
  return LOCALPART_TO_SERVICE.get(extractLocalpart(senderId));
}

export function detectServiceTypeFromRoom(
  roomName: string | null,
  memberIds: string[] = [],
): SetupServiceType | undefined {
  if (roomName) {
    const suffixMatch = roomName.match(/\((WhatsApp|Telegram|Instagram|iMessage)\)$/i);
    if (suffixMatch) {
      return suffixMatch[1].toLowerCase() as SetupServiceType;
    }
  }

  for (const memberId of memberIds) {
    const detected = detectServiceTypeFromSender(memberId);
    if (detected) {
      return detected;
    }
  }

  return undefined;
}

export function normalizeServiceType(service: string): ServiceType {
  if (/^(whatsapp|telegram|instagram|imessage)$/.test(service)) {
    return service as ServiceType;
  }

  const fromLocalpart = LOCALPART_TO_SERVICE.get(service);
  if (fromLocalpart) {
    return fromLocalpart as ServiceType;
  }

  return 'matrix';
}
