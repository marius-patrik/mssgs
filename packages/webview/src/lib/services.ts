import type { ServiceType } from '../../../extension/src/shared/types';

export interface ServiceTheme {
  service: ServiceType;
  displayName: string;
  iconName: string;
  color: string;
  backgroundColor: string;
}

const SERVICE_THEMES: Record<ServiceType, ServiceTheme> = {
  whatsapp: {
    service: 'whatsapp',
    displayName: 'WhatsApp',
    iconName: 'whatsapp',
    color: 'text-whatsapp',
    backgroundColor: 'bg-whatsapp',
  },
  telegram: {
    service: 'telegram',
    displayName: 'Telegram',
    iconName: 'telegram',
    color: 'text-telegram',
    backgroundColor: 'bg-telegram',
  },
  instagram: {
    service: 'instagram',
    displayName: 'Instagram',
    iconName: 'instagram',
    color: 'text-instagram',
    backgroundColor: 'bg-instagram',
  },
  imessage: {
    service: 'imessage',
    displayName: 'iMessage',
    iconName: 'imessage',
    color: 'text-imessage',
    backgroundColor: 'bg-imessage',
  },
  matrix: {
    service: 'matrix',
    displayName: 'Matrix',
    iconName: 'matrix',
    color: 'text-emerald-500',
    backgroundColor: 'bg-emerald-500',
  },
  sms: {
    service: 'sms',
    displayName: 'SMS',
    iconName: 'sms',
    color: 'text-blue-500',
    backgroundColor: 'bg-blue-500',
  },
  messenger: {
    service: 'messenger',
    displayName: 'Messenger',
    iconName: 'messenger',
    color: 'text-violet-500',
    backgroundColor: 'bg-violet-500',
  },
  signal: {
    service: 'signal',
    displayName: 'Signal',
    iconName: 'signal',
    color: 'text-indigo-500',
    backgroundColor: 'bg-indigo-500',
  },
  discord: {
    service: 'discord',
    displayName: 'Discord',
    iconName: 'discord',
    color: 'text-slate-400',
    backgroundColor: 'bg-slate-400',
  },
  slack: {
    service: 'slack',
    displayName: 'Slack',
    iconName: 'slack',
    color: 'text-amber-500',
    backgroundColor: 'bg-amber-500',
  },
};

export function getServiceTheme(service: ServiceType): ServiceTheme {
  return SERVICE_THEMES[service] ?? SERVICE_THEMES.matrix;
}

export function getSupportedServices(): ServiceType[] {
  return ['whatsapp', 'telegram', 'instagram', 'imessage'];
}
