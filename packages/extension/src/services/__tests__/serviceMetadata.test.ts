import { describe, expect, it } from 'vitest';
import { getServiceColor, getServiceLabel, getServiceMetadata } from '../serviceMetadata.js';

describe('getServiceMetadata', () => {
  it('returns metadata for WhatsApp', () => {
    const meta = getServiceMetadata('whatsapp');
    expect(meta.label).toBe('WhatsApp');
    expect(meta.color).toBe('#25D366');
  });

  it('returns metadata for Telegram', () => {
    const meta = getServiceMetadata('telegram');
    expect(meta.label).toBe('Telegram');
    expect(meta.icon).toBe('Send');
  });

  it('returns metadata for Instagram', () => {
    const meta = getServiceMetadata('instagram');
    expect(meta.label).toBe('Instagram');
  });

  it('returns metadata for iMessage', () => {
    const meta = getServiceMetadata('imessage');
    expect(meta.label).toBe('iMessage');
  });

  it('falls back to Matrix metadata for unknown services', () => {
    const meta = getServiceMetadata('matrix');
    expect(meta.label).toBe('Matrix');
  });
});

describe('getServiceLabel', () => {
  it('returns the human-readable label', () => {
    expect(getServiceLabel('whatsapp')).toBe('WhatsApp');
    expect(getServiceLabel('telegram')).toBe('Telegram');
  });
});

describe('getServiceColor', () => {
  it('returns the brand color', () => {
    expect(getServiceColor('whatsapp')).toBe('#25D366');
    expect(getServiceColor('telegram')).toBe('#0088CC');
  });
});
