import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ServiceSelector } from '../../../components/wizard/ServiceSelector';

describe('ServiceSelector', () => {
  it('renders all supported services', () => {
    render(<ServiceSelector onSelect={vi.fn()} />);

    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Telegram')).toBeInTheDocument();
    expect(screen.getByText('Instagram')).toBeInTheDocument();
    expect(screen.getByText('iMessage')).toBeInTheDocument();
  });

  it('calls onSelect when a service is clicked', async () => {
    const onSelect = vi.fn();
    render(<ServiceSelector onSelect={onSelect} />);

    await userEvent.click(screen.getByText('Telegram'));

    expect(onSelect).toHaveBeenCalledWith('telegram');
  }, 10000);
});
