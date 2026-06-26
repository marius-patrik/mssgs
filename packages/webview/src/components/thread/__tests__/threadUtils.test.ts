import { describe, expect, it } from 'vitest';
import { formatMessageTime, getAttachmentType } from '../../../lib/threadUtils';

describe('threadUtils', () => {
  describe('getAttachmentType', () => {
    it.each([
      ['image/png', 'image'],
      ['video/mp4', 'video'],
      ['audio/mpeg', 'audio'],
      ['application/pdf', 'file'],
      ['text/vcard', 'contact'],
    ] as const)('maps %s to %s', (mimeType, expected) => {
      expect(getAttachmentType(mimeType)).toBe(expected);
    });
  });

  describe('formatMessageTime', () => {
    it('formats an ISO timestamp as a time string', () => {
      const formatted = formatMessageTime('2024-01-01T14:30:00Z');
      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
    });
  });
});
