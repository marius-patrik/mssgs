import { Instagram, type LucideIcon, MessageCircle, Send, Smartphone } from 'lucide-react';
import type { SetupServiceType } from '../../../../extension/src/shared/messages';

export interface WizardServiceMeta {
  label: string;
  description: string;
  Icon: LucideIcon;
  colorClass: string;
  bgClass: string;
}

export const WIZARD_SERVICE_REGISTRY: Record<SetupServiceType, WizardServiceMeta> = {
  whatsapp: {
    label: 'WhatsApp',
    description: 'Scan a QR code with your phone to link the bridge.',
    Icon: MessageCircle,
    colorClass: 'text-whatsapp',
    bgClass: 'bg-whatsapp',
  },
  telegram: {
    label: 'Telegram',
    description: 'Start the bridge bot via a Telegram link.',
    Icon: Send,
    colorClass: 'text-telegram',
    bgClass: 'bg-telegram',
  },
  instagram: {
    label: 'Instagram',
    description: 'Enter your session confirmation code.',
    Icon: Instagram,
    colorClass: 'text-instagram',
    bgClass: 'bg-instagram',
  },
  imessage: {
    label: 'iMessage',
    description: 'Pair this Mac with the iMessage bridge.',
    Icon: Smartphone,
    colorClass: 'text-imessage',
    bgClass: 'bg-imessage',
  },
};

export function getWizardServiceMeta(service: SetupServiceType): WizardServiceMeta {
  return WIZARD_SERVICE_REGISTRY[service];
}
