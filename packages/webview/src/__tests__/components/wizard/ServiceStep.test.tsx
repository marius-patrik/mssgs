import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ServiceStep } from '../../../components/wizard/ServiceStep';

describe('ServiceStep', () => {
  it('renders all service options', () => {
    render(<ServiceStep onSelect={vi.fn()} />);

    expect(screen.getByLabelText('Connect WhatsApp')).toBeInTheDocument();
    expect(screen.getByLabelText('Connect Telegram')).toBeInTheDocument();
    expect(screen.getByLabelText('Connect Instagram')).toBeInTheDocument();
    expect(screen.getByLabelText('Connect iMessage')).toBeInTheDocument();
  });

  it('calls onSelect with the chosen service', async () => {
    const onSelect = vi.fn();
    render(<ServiceStep onSelect={onSelect} />);

    await userEvent.click(screen.getByLabelText('Connect Telegram'));

    expect(onSelect).toHaveBeenCalledWith('telegram');
  });
});
