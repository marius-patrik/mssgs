import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WizardStepForm } from '../../../components/wizard/WizardStepForm';

describe('WizardStepForm', () => {
  const step = {
    stepId: 'phone-number' as const,
    title: 'Telegram login',
    description: 'Enter your phone number and API credentials.',
    fields: [
      { name: 'phoneNumber', label: 'Phone number', type: 'tel' as const },
      { name: 'apiId', label: 'API ID', type: 'text' as const },
      { name: 'apiHash', label: 'API hash', type: 'password' as const },
    ],
  };

  it('renders step fields', () => {
    render(<WizardStepForm step={step} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText('Phone number')).toBeInTheDocument();
    expect(screen.getByLabelText('API ID')).toBeInTheDocument();
    expect(screen.getByLabelText('API hash')).toBeInTheDocument();
  });

  it('submits form data', async () => {
    const onSubmit = vi.fn();
    render(<WizardStepForm step={step} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Phone number'), '+1234567890');
    await userEvent.type(screen.getByLabelText('API ID'), '12345');
    await userEvent.type(screen.getByLabelText('API hash'), 'abc');
    await userEvent.click(screen.getByText('Continue'));

    expect(onSubmit).toHaveBeenCalledWith({
      phoneNumber: '+1234567890',
      apiId: '12345',
      apiHash: 'abc',
    });
  }, 20000);

  it('calls onCancel when cancel is clicked', async () => {
    const onCancel = vi.fn();
    render(<WizardStepForm step={step} onSubmit={vi.fn()} onCancel={onCancel} />);

    await userEvent.click(screen.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalled();
  });

  it('displays error message', () => {
    render(
      <WizardStepForm
        step={step}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        error="Invalid credentials"
      />,
    );

    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('renders a QR code image when value is a data URL', () => {
    const qrStep = {
      stepId: 'qr-code' as const,
      title: 'Scan QR code',
      description: 'Scan this QR code with WhatsApp.',
      fields: [
        {
          name: 'qrCode',
          label: 'QR code',
          type: 'qr' as const,
          value: 'data:image/png;base64,abcd',
        },
      ],
    };

    render(<WizardStepForm step={qrStep} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByAltText('QR code')).toBeInTheDocument();
  });
});
