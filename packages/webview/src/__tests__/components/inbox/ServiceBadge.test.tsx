import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ServiceBadge } from '../../../components/inbox/ServiceBadge';

describe('ServiceBadge', () => {
  it('renders the service display name', () => {
    render(<ServiceBadge service="whatsapp" />);
    expect(screen.getByLabelText('WhatsApp')).toHaveTextContent('WhatsApp');
  });

  it('renders Instagram badge', () => {
    render(<ServiceBadge service="instagram" />);
    expect(screen.getByLabelText('Instagram')).toBeInTheDocument();
  });
});
