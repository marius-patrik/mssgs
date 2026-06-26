import type { ServiceAccountConfig, ServiceType } from './types.js';

export const SUPPORTED_SERVICES: ServiceAccountConfig[] = [
  {
    service: 'imessage',
    displayName: 'iMessage',
    bridgeBotLocalpart: 'imessagebot',
  },
  {
    service: 'telegram',
    displayName: 'Telegram',
    bridgeBotLocalpart: 'telegrambot',
  },
  {
    service: 'whatsapp',
    displayName: 'WhatsApp',
    bridgeBotLocalpart: 'whatsappbot',
  },
  {
    service: 'instagram',
    displayName: 'Instagram',
    bridgeBotLocalpart: 'instagrambot',
  },
];

export function getServiceConfig(service: ServiceType): ServiceAccountConfig | undefined {
  return SUPPORTED_SERVICES.find((preset) => preset.service === service);
}

export function getSupportedServiceTypes(): ServiceType[] {
  return SUPPORTED_SERVICES.map((preset) => preset.service);
}

export function createBridgeBotUserId(
  service: ServiceType,
  homeserverUrl: string,
): string | undefined {
  const config = getServiceConfig(service);
  if (!config) {
    return undefined;
  }

  const hostname = extractHomeserverHostname(homeserverUrl);
  return `@${config.bridgeBotLocalpart}:${hostname}`;
}

function extractHomeserverHostname(homeserverUrl: string): string {
  try {
    const url = new URL(homeserverUrl);
    return url.hostname;
  } catch {
    return homeserverUrl.replace(/^https?:\/\//, '').split('/')[0] ?? homeserverUrl;
  }
}
