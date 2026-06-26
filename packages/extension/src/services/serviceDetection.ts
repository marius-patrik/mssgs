import { SUPPORTED_SERVICES, getServiceConfig } from '../backend/servicePresets.js';
import type { ServiceType } from '../shared/types.js';

export type DetectionConfidence = 'high' | 'medium' | 'low';

export interface DetectedService {
  service: ServiceType;
  confidence: DetectionConfidence;
  reason: string;
}

const ROOM_NAME_PATTERNS: Array<{
  service: ServiceType;
  pattern: RegExp;
  confidence: DetectionConfidence;
  reason: string;
}> = [
  {
    service: 'whatsapp',
    pattern: /^\s*whatsapp\s*[:\-]?\s*/i,
    confidence: 'high',
    reason: 'Room name starts with WhatsApp prefix',
  },
  {
    service: 'telegram',
    pattern: /^\s*telegram\s*[:\-]?\s*/i,
    confidence: 'high',
    reason: 'Room name starts with Telegram prefix',
  },
  {
    service: 'instagram',
    pattern: /^\s*instagram\s*[:\-]?\s*/i,
    confidence: 'high',
    reason: 'Room name starts with Instagram prefix',
  },
  {
    service: 'imessage',
    pattern: /^\s*imessage\s*[:\-]?\s*/i,
    confidence: 'high',
    reason: 'Room name starts with iMessage prefix',
  },
  {
    service: 'whatsapp',
    pattern: /^\+?[1-9]\d{7,14}$/,
    confidence: 'medium',
    reason: 'Room name looks like a phone number used by WhatsApp',
  },
];

export function detectServiceFromBridgeBot(userId: string): DetectedService | undefined {
  if (!userId.startsWith('@') || !userId.includes(':')) {
    return undefined;
  }

  const localpart = userId.slice(1).split(':')[0];
  if (!localpart) {
    return undefined;
  }

  for (const config of SUPPORTED_SERVICES) {
    if (localpart.toLowerCase() === config.bridgeBotLocalpart.toLowerCase()) {
      return {
        service: config.service,
        confidence: 'high',
        reason: `Bridge bot localpart matches ${config.bridgeBotLocalpart}`,
      };
    }
  }

  return undefined;
}

export function detectServiceFromRoomName(roomName: string | null): DetectedService | undefined {
  if (!roomName) {
    return undefined;
  }

  for (const rule of ROOM_NAME_PATTERNS) {
    if (rule.pattern.test(roomName)) {
      return {
        service: rule.service,
        confidence: rule.confidence,
        reason: rule.reason,
      };
    }
  }

  return undefined;
}

export function detectServiceFromRoom(
  roomName: string | null,
  memberUserIds: string[],
): DetectedService | undefined {
  for (const userId of memberUserIds) {
    const detected = detectServiceFromBridgeBot(userId);
    if (detected) {
      return detected;
    }
  }

  const fromName = detectServiceFromRoomName(roomName);
  if (fromName) {
    return fromName;
  }

  return undefined;
}

export function detectServicesFromMembers(
  memberUserIds: string[],
): Array<DetectedService & { userId: string }> {
  const results: Array<DetectedService & { userId: string }> = [];
  const seen = new Set<ServiceType>();

  for (const userId of memberUserIds) {
    const detected = detectServiceFromBridgeBot(userId);
    if (detected && !seen.has(detected.service)) {
      seen.add(detected.service);
      results.push({ ...detected, userId });
    }
  }

  return results;
}

export function getBridgeBotUserIdForService(
  service: ServiceType,
  homeserverUrl: string,
): string | undefined {
  const config = getServiceConfig(service);
  if (!config) {
    return undefined;
  }

  return `@${config.bridgeBotLocalpart}:${extractHomeserverHostname(homeserverUrl)}`;
}

function extractHomeserverHostname(homeserverUrl: string): string {
  try {
    return new URL(homeserverUrl).hostname;
  } catch {
    return homeserverUrl.replace(/^https?:\/\//, '').split('/')[0] ?? homeserverUrl;
  }
}
