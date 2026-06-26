import { describe, expect, test } from 'vitest';
import { getServiceTheme, isSetupServiceType } from '../constants.js';

describe('service constants', () => {
  test('returns theme for supported services', () => {
    expect(getServiceTheme('whatsapp').displayName).toBe('WhatsApp');
    expect(getServiceTheme('telegram').displayName).toBe('Telegram');
    expect(getServiceTheme('instagram').displayName).toBe('Instagram');
    expect(getServiceTheme('imessage').displayName).toBe('iMessage');
  });

  test('returns generic theme for unsupported service', () => {
    const theme = getServiceTheme('matrix');
    expect(theme.displayName).toBe('Matrix');
    expect(theme.color).toBe('#888888');
  });

  test('validates setup service types', () => {
    expect(isSetupServiceType('whatsapp')).toBe(true);
    expect(isSetupServiceType('matrix')).toBe(false);
  });
});
