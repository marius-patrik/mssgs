import {
  AtSign,
  Instagram,
  type LucideIcon,
  MessageCircle,
  MessageSquare,
  Phone,
  Send,
  Slack,
  Smartphone,
} from 'lucide-react';
import type { ServiceType } from '../../../../extension/src/shared/types';

export interface ServiceMeta {
  label: string;
  Icon: LucideIcon;
  colorClass: string;
  bgClass: string;
}

export const SERVICE_REGISTRY: Record<ServiceType, ServiceMeta> = {
  whatsapp: {
    label: 'WhatsApp',
    Icon: MessageCircle,
    colorClass: 'text-whatsapp',
    bgClass: 'bg-whatsapp',
  },
  telegram: {
    label: 'Telegram',
    Icon: Send,
    colorClass: 'text-telegram',
    bgClass: 'bg-telegram',
  },
  instagram: {
    label: 'Instagram',
    Icon: Instagram,
    colorClass: 'text-instagram',
    bgClass: 'bg-instagram',
  },
  imessage: {
    label: 'iMessage',
    Icon: Smartphone,
    colorClass: 'text-imessage',
    bgClass: 'bg-imessage',
  },
  matrix: {
    label: 'Matrix',
    Icon: AtSign,
    colorClass: 'text-matrix',
    bgClass: 'bg-matrix',
  },
  sms: {
    label: 'SMS',
    Icon: MessageSquare,
    colorClass: 'text-sms',
    bgClass: 'bg-sms',
  },
  messenger: {
    label: 'Messenger',
    Icon: MessageCircle,
    colorClass: 'text-messenger',
    bgClass: 'bg-messenger',
  },
  signal: {
    label: 'Signal',
    Icon: Phone,
    colorClass: 'text-signal',
    bgClass: 'bg-signal',
  },
  discord: {
    label: 'Discord',
    Icon: MessageSquare,
    colorClass: 'text-discord',
    bgClass: 'bg-discord',
  },
  slack: {
    label: 'Slack',
    Icon: Slack,
    colorClass: 'text-slack',
    bgClass: 'bg-slack',
  },
};

export function getServiceMeta(service: ServiceType): ServiceMeta {
  return SERVICE_REGISTRY[service] ?? SERVICE_REGISTRY.matrix;
}
