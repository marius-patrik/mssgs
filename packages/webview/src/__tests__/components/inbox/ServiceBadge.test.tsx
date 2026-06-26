import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ServiceBadge } from '../../../components/inbox/ServiceBadge';

describe('ServiceBadge', () => {
  it('renders WhatsApp badge', () => {
    render(<ServiceBadge service="whatsapp" />);
    expect(screen.getByText('WA')).toBeInTheDocument();
  });

  it('renders Telegram badge', () => {
    render(<ServiceBadge service="telegram" />);
    expect(screen.getByText('TG')).toBeInTheDocument();
  });

  it('renders icon mode', () => {
    render(<ServiceBadge service="imessage" showIcon />);
    expect(screen.getByLabelText('imessage')).toBeInTheDocument();
  });

  it('falls back to matrix style for undefined service', () => {
    render(<ServiceBadge service={undefined} />);
    expect(screen.getByText('MX')).toBeInTheDocument();
  });
});
