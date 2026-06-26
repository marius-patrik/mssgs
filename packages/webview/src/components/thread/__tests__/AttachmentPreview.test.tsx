import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AttachmentPreview } from '../AttachmentPreview';
import { now } from './helpers';

describe('AttachmentPreview', () => {
  it('renders an image attachment preview', () => {
    const attachment = {
      id: 'att-1',
      type: 'image' as const,
      url: 'data:image/png;base64,abc',
      name: 'photo.png',
      mimeType: 'image/png',
      size: 1024,
      createdAt: now,
    };

    render(<AttachmentPreview attachment={attachment} onRemove={vi.fn()} />);

    expect(screen.getByAltText('photo.png')).toBeInTheDocument();
    expect(screen.getByText('1.0 KB')).toBeInTheDocument();
  });

  it('calls onRemove when the remove button is clicked', async () => {
    const onRemove = vi.fn();
    const attachment = {
      id: 'att-2',
      type: 'file' as const,
      url: null,
      name: 'doc.pdf',
      mimeType: 'application/pdf',
      size: 2048,
      createdAt: now,
    };

    render(<AttachmentPreview attachment={attachment} onRemove={onRemove} />);

    await userEvent.click(screen.getByLabelText('Remove attachment'));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
