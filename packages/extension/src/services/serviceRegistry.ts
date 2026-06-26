import type { ServiceType } from '../shared/types.js';
import type { ServiceProfile } from './types.js';

const SERVICE_PROFILES: ServiceProfile[] = [
  {
    service: 'whatsapp',
    displayName: 'WhatsApp',
    iconName: 'whatsapp',
    color: '#25D366',
    bridgeBotLocalpart: 'whatsappbot',
  },
  {
    service: 'telegram',
    displayName: 'Telegram',
    iconName: 'telegram',
    color: '#0088cc',
    bridgeBotLocalpart: 'telegrambot',
  },
  {
    service: 'instagram',
    displayName: 'Instagram',
    iconName: 'instagram',
    color: '#E4405F',
    bridgeBotLocalpart: 'instagrambot',
  },
  {
    service: 'imessage',
    displayName: 'iMessage',
    iconName: 'imessage',
    color: '#34C759',
    bridgeBotLocalpart: 'imessagebot',
  },
  {
    service: 'matrix',
    displayName: 'Matrix',
    iconName: 'matrix',
    color: '#0DBD8B',
    bridgeBotLocalpart: null,
  },
];

const PROFILE_MAP = new Map<ServiceType, ServiceProfile>(
  SERVICE_PROFILES.map((profile) => [profile.service, profile]),
);

const FALLBACK_PROFILE: ServiceProfile = {
  service: 'matrix',
  displayName: 'Matrix',
  iconName: 'matrix',
  color: '#0DBD8B',
  bridgeBotLocalpart: null,
};

export function getServiceProfile(service: ServiceType): ServiceProfile {
  return PROFILE_MAP.get(service) ?? FALLBACK_PROFILE;
}

export function getSupportedServiceTypes(): ServiceType[] {
  return SERVICE_PROFILES.filter((profile) => profile.service !== 'matrix').map(
    (profile) => profile.service,
  );
}

export function getBridgeBotLocalpart(service: ServiceType): string | null {
  return getServiceProfile(service).bridgeBotLocalpart;
}

export function createBridgeBotUserId(
  service: ServiceType,
  homeserverUrl: string,
): string | undefined {
  const localpart = getBridgeBotLocalpart(service);
  if (!localpart) {
    return undefined;
  }

  const hostname = extractHomeserverHostname(homeserverUrl);
  return `@${localpart}:${hostname}`;
}

function extractHomeserverHostname(homeserverUrl: string): string {
  try {
    const url = new URL(homeserverUrl);
    return url.hostname;
  } catch {
    return homeserverUrl.replace(/^https?:\/\//, '').split('/')[0] ?? homeserverUrl;
  }
}
