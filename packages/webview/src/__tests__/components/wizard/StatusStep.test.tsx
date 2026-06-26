import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StatusStep } from '../../../components/wizard/StatusStep';

describe('StatusStep', () => {
  it('renders QR step with data', () => {
    render(
      <StatusStep
        service="whatsapp"
        step="qr"
        instruction="Scan the QR code"
        qrData="https://wa.me/qr"
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Scan the QR code')).toBeInTheDocument();
    expect(screen.getByText('https://wa.me/qr')).toBeInTheDocument();
  });

  it('renders link step with anchor', () => {
    render(
      <StatusStep
        service="telegram"
        step="link"
        instruction="Open the link"
        linkUrl="https://t.me/example"
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('link', { name: 'Open Telegram' })).toHaveAttribute(
      'href',
      'https://t.me/example',
    );
  });

  it('renders error step with retry', async () => {
    const onRetry = vi.fn();
    const onCancel = vi.fn();
    render(
      <StatusStep
        service="instagram"
        step="error"
        error="Login failed"
        onRetry={onRetry}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText('Login failed')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
