import type { ServiceType } from '../shared/types.js';

export interface ServiceMetadata {
  label: string;
  color: string;
  textColor: string;
  icon: string;
}

const METADATA: Record<ServiceType, ServiceMetadata> = {
  whatsapp: {
    label: 'WhatsApp',
    color: '#25D366',
    textColor: '#FFFFFF',
    icon: 'MessageCircle',
  },
  telegram: {
    label: 'Telegram',
    color: '#0088CC',
    textColor: '#FFFFFF',
    icon: 'Send',
  },
  instagram: {
    label: 'Instagram',
    color: '#E1306C',
    textColor: '#FFFFFF',
    icon: 'Instagram',
  },
  imessage: {
    label: 'iMessage',
    color: '#34C759',
    textColor: '#FFFFFF',
    icon: 'MessageSquare',
  },
  matrix: {
    label: 'Matrix',
    color: '#000000',
    textColor: '#FFFFFF',
    icon: 'Grid',
  },
  sms: {
    label: 'SMS',
    color: '#007AFF',
    textColor: '#FFFFFF',
    icon: 'Smartphone',
  },
  messenger: {
    label: 'Messenger',
    color: '#0084FF',
    textColor: '#FFFFFF',
    icon: 'MessageCircle',
  },
  signal: {
    label: 'Signal',
    color: '#3A76F0',
    textColor: '#FFFFFF',
    icon: 'Shield',
  },
  discord: {
    label: 'Discord',
    color: '#5865F2',
    textColor: '#FFFFFF',
    icon: 'Gamepad2',
  },
  slack: {
    label: 'Slack',
    color: '#4A154B',
    textColor: '#FFFFFF',
    icon: 'Hash',
  },
};

export function getServiceMetadata(service: ServiceType): ServiceMetadata {
  return METADATA[service] ?? METADATA.matrix;
}

export function getServiceLabel(service: ServiceType): string {
  return getServiceMetadata(service).label;
}

export function getServiceColor(service: ServiceType): string {
  return getServiceMetadata(service).color;
}
