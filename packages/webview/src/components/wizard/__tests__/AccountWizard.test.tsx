import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountSetupResponse } from '../../../../../extension/src/shared/messages';
import type { MessengerClient } from '../../../messaging/client';
import { AccountWizard } from '../AccountWizard';

function createClient(
  response?: Partial<AccountSetupResponse>,
): MessengerClient & { request: ReturnType<typeof vi.fn> } {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    request: vi.fn().mockResolvedValue({
      sessionId: 'session-1',
      status: 'qr',
      instructions: 'Scan the QR code',
      qrData: 'whatsapp-qr-data',
      ...response,
    }),
    onEvent: vi.fn().mockReturnValue(() => {}),
  } as unknown as MessengerClient & { request: ReturnType<typeof vi.fn> };
}

describe('AccountWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the service selection grid when open', () => {
    const client = createClient();
    render(<AccountWizard client={client} open />);

    expect(screen.getByText('Add account')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Telegram')).toBeInTheDocument();
    expect(screen.getByText('Instagram')).toBeInTheDocument();
    expect(screen.getByText('iMessage')).toBeInTheDocument();
  });

  it('starts a WhatsApp setup and shows a QR placeholder', async () => {
    const client = createClient();
    render(<AccountWizard client={client} open />);

    await userEvent.click(screen.getByText('WhatsApp'));

    expect(client.request).toHaveBeenCalledWith('startAccountSetup', { service: 'whatsapp' });
    expect(await screen.findByText('Scan the QR code')).toBeInTheDocument();
    expect(screen.getByText('whatsapp-qr-data')).toBeInTheDocument();
  });

  it('starts a Telegram setup and shows a link', async () => {
    const client = createClient({
      status: 'link',
      instructions: 'Open the Telegram link',
      link: 'https://t.me/test',
      qrData: undefined,
    });
    render(<AccountWizard client={client} open />);

    await userEvent.click(screen.getByText('Telegram'));

    expect(await screen.findByText('Open the Telegram link')).toBeInTheDocument();
    expect(screen.getByText('https://t.me/test')).toBeInTheDocument();
  });

  it('closes when the cancel button is clicked', async () => {
    const client = createClient();
    const onOpenChange = vi.fn();
    render(<AccountWizard client={client} open onOpenChange={onOpenChange} />);

    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    await userEvent.click(closeButtons[0]);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
