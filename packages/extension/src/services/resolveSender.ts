import type { ServiceType } from '../shared/types.js';
import { getServiceProfile } from './serviceRegistry.js';
import type { ResolvedSender, SenderInfo } from './types.js';

const BRIDGE_SUFFIX_PATTERN = /\s*\((?:WhatsApp|Telegram|Instagram|iMessage|Matrix|SMS|Signal)\)$/i;

export function resolveSender(
  sender: SenderInfo,
  conversationService: ServiceType,
): ResolvedSender {
  const service = detectSenderService(sender.userId, conversationService);
  const displayName = cleanBridgeSuffix(sender.displayName);

  return {
    userId: sender.userId,
    displayName: displayName || sender.userId,
    avatarUrl: sender.avatarUrl,
    service,
  };
}

export function cleanBridgeSuffix(displayName: string): string {
  return displayName.replace(BRIDGE_SUFFIX_PATTERN, '').trim();
}

export function detectSenderService(userId: string, conversationService: ServiceType): ServiceType {
  const localpart = userId.startsWith('@') ? userId.slice(1).split(':')[0] : userId;

  if (localpart.endsWith('bot') && !conversationService.endsWith('bot')) {
    for (const service of getSupportedBridgeServices()) {
      const profile = getServiceProfile(service);
      if (profile.bridgeBotLocalpart && localpart === profile.bridgeBotLocalpart) {
        return 'matrix';
      }
    }
  }

  if (localpart.startsWith('matrix_') || localpart === 'matrix') {
    return 'matrix';
  }

  return conversationService;
}

function getSupportedBridgeServices(): ServiceType[] {
  return ['whatsapp', 'telegram', 'instagram', 'imessage'];
}
