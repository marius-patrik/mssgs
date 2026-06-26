import type { ServiceType } from '../shared/types.js';

export type SetupServiceType = 'whatsapp' | 'telegram' | 'instagram' | 'imessage';

export interface ServiceTheme {
  displayName: string;
  color: string;
  iconName: string;
}

export const SERVICE_THEME: Record<SetupServiceType, ServiceTheme> = {
  whatsapp: { displayName: 'WhatsApp', color: '#25D366', iconName: 'whatsapp' },
  telegram: { displayName: 'Telegram', color: '#0088cc', iconName: 'telegram' },
  instagram: { displayName: 'Instagram', color: '#E4405F', iconName: 'instagram' },
  imessage: { displayName: 'iMessage', color: '#34C759', iconName: 'imessage' },
};

export function getServiceTheme(service: ServiceType | SetupServiceType): ServiceTheme {
  return (
    SERVICE_THEME[service as SetupServiceType] ?? {
      displayName: service.charAt(0).toUpperCase() + service.slice(1),
      color: '#888888',
      iconName: 'matrix',
    }
  );
}

export function isSetupServiceType(service: string): service is SetupServiceType {
  return service in SERVICE_THEME;
}
