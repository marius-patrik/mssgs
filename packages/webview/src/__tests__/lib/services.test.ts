import { describe, expect, it } from 'vitest';
import { getServiceTheme, getSupportedServices } from '../../lib/services';

describe('services lib', () => {
  it('returns theme metadata for each service', () => {
    const whatsapp = getServiceTheme('whatsapp');
    expect(whatsapp.displayName).toBe('WhatsApp');
    expect(whatsapp.backgroundColor).toBe('bg-whatsapp');
    expect(whatsapp.color).toBe('text-whatsapp');

    const telegram = getServiceTheme('telegram');
    expect(telegram.displayName).toBe('Telegram');
    expect(telegram.backgroundColor).toBe('bg-telegram');
  });

  it('falls back to matrix theme for unknown services', () => {
    const theme = getServiceTheme('unknown' as never);
    expect(theme.service).toBe('matrix');
  });

  it('lists supported bridge services', () => {
    expect(getSupportedServices()).toEqual(['whatsapp', 'telegram', 'instagram', 'imessage']);
  });
});
