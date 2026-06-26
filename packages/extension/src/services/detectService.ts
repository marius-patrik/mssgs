import type { ServiceType } from '../shared/types.js';
import { getBridgeBotLocalpart, getSupportedServiceTypes } from './serviceRegistry.js';
import type { MatrixRoomCandidate } from './types.js';

const ROOM_NAME_PATTERNS: Record<Exclude<ServiceType, 'matrix'>, RegExp> = {
  whatsapp: /whatsapp/i,
  telegram: /telegram/i,
  instagram: /instagram/i,
  imessage: /imessage|sms/i,
  sms: /sms/i,
  messenger: /messenger/i,
  signal: /signal/i,
  discord: /discord/i,
  slack: /slack/i,
};

const PORTAL_USER_ID_PATTERNS: Record<Exclude<ServiceType, 'matrix'>, RegExp> = {
  whatsapp: /^@whatsapp_\d+:|^@[\d]+@whatsapp:/i,
  telegram: /^@telegram_\d+:|^@[\w]+@telegram:/i,
  instagram: /^@instagram_\w+:|^@[\w]+@instagram:/i,
  imessage: /^@imessage_[\w\-]+:|^@[\w\-]+@imessage:/i,
  sms: /^@sms_\d+:|^@[\d]+@sms:/i,
  messenger: /^@messenger_\w+:|^@[\w]+@messenger:/i,
  signal: /^@signal_\d+:|^@[\d]+@signal:/i,
  discord: /^@discord_\d+:|^@[\w]+@discord:/i,
  slack: /^@slack_[\w\-]+:|^@[\w]+@slack:/i,
};

export function detectService(
  room: MatrixRoomCandidate,
  fallback: ServiceType = 'matrix',
): ServiceType {
  const fromMembers = detectFromBridgeBotMembership(room, getSupportedServiceTypes());
  if (fromMembers) {
    return fromMembers;
  }

  const fromUserIds = detectFromPortalUserIds(room);
  if (fromUserIds) {
    return fromUserIds;
  }

  const fromName = detectFromRoomName(room);
  if (fromName) {
    return fromName;
  }

  return fallback;
}

function detectFromBridgeBotMembership(
  room: MatrixRoomCandidate,
  supportedServices: ServiceType[],
): ServiceType | null {
  const hostname = extractHomeserverHostname(room.homeserverUrl);

  for (const service of supportedServices) {
    const localpart = getBridgeBotLocalpart(service);
    if (!localpart) {
      continue;
    }

    const bridgeBotUserId = `@${localpart}:${hostname}`;
    if (room.memberUserIds.includes(bridgeBotUserId)) {
      return service;
    }
  }

  return null;
}

function detectFromPortalUserIds(room: MatrixRoomCandidate): ServiceType | null {
  for (const userId of room.memberUserIds) {
    for (const [service, pattern] of Object.entries(PORTAL_USER_ID_PATTERNS)) {
      if (pattern.test(userId)) {
        return service as ServiceType;
      }
    }
  }

  return null;
}

function detectFromRoomName(room: MatrixRoomCandidate): ServiceType | null {
  if (!room.name) {
    return null;
  }

  for (const [service, pattern] of Object.entries(ROOM_NAME_PATTERNS)) {
    if (pattern.test(room.name)) {
      return service as ServiceType;
    }
  }

  return null;
}

function extractHomeserverHostname(homeserverUrl: string): string {
  try {
    const url = new URL(homeserverUrl);
    return url.hostname;
  } catch {
    return homeserverUrl.replace(/^https?:\/\//, '').split('/')[0] ?? homeserverUrl;
  }
}
