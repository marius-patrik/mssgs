import type { AttachmentType } from '../../../extension/src/shared/types';

export function getAttachmentType(mimeType: string): AttachmentType {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('contact') || mimeType === 'text/vcard' || mimeType === 'text/x-vcard')
    return 'contact';
  if (mimeType.includes('location')) return 'location';
  if (mimeType.includes('sticker')) return 'sticker';
  return 'file';
}

export function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
