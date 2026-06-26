import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WizardStepForm } from '../../../components/wizard/WizardStepForm';

describe('WizardStepForm', () => {
  const step = {
    stepId: 'matrix-login' as const,
    title: 'Matrix login',
    description: 'Enter credentials',
    fields: [
      { name: 'homeserverUrl', label: 'Homeserver URL', type: 'text' as const },
      { name: 'userId', label: 'User ID', type: 'text' as const },
      { name: 'password', label: 'Password', type: 'password' as const },
    ],
  };

  it('renders step fields', () => {
    render(<WizardStepForm step={step} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText('Homeserver URL')).toBeInTheDocument();
    expect(screen.getByLabelText('User ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('submits form data', async () => {
    const onSubmit = vi.fn();
    render(<WizardStepForm step={step} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Homeserver URL'), 'https://matrix.example.com');
    await userEvent.type(screen.getByLabelText('User ID'), '@user:example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret');
    await userEvent.click(screen.getByText('Continue'));

    expect(onSubmit).toHaveBeenCalledWith({
      homeserverUrl: 'https://matrix.example.com',
      userId: '@user:example.com',
      password: 'secret',
    });
  });

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
});
