import { FileText, Image, Music, Video, X } from 'lucide-react';
import type { JSX } from 'react';
import type { Attachment } from '../../../../extension/src/shared/types';
import { Button } from '../ui/button';

export interface AttachmentPreviewProps {
  attachment: Attachment;
  onRemove: () => void;
}

function AttachmentIcon({ type }: { type: Attachment['type'] }): JSX.Element {
  switch (type) {
    case 'image':
      return <Image className="h-4 w-4" />;
    case 'video':
      return <Video className="h-4 w-4" />;
    case 'audio':
      return <Music className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

export function AttachmentPreview({ attachment, onRemove }: AttachmentPreviewProps): JSX.Element {
  const isImage = attachment.type === 'image' && attachment.url;

  return (
    <div className="group relative flex items-center gap-2 rounded-lg border bg-card p-2 pr-8">
      {isImage ? (
        <img
          src={attachment.url ?? undefined}
          alt={attachment.name ?? 'Attachment preview'}
          className="h-10 w-10 rounded object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-muted-foreground">
          <AttachmentIcon type={attachment.type} />
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <span className="truncate text-xs font-medium">{attachment.name ?? 'Attachment'}</span>
        {attachment.size !== null && (
          <span className="text-[10px] text-muted-foreground">{formatBytes(attachment.size)}</span>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1 h-5 w-5"
        aria-label="Remove attachment"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
