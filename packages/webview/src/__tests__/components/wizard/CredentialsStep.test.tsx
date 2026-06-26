import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CredentialsStep } from '../../../components/wizard/CredentialsStep';

describe('CredentialsStep', () => {
  it('submits credentials', async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(<CredentialsStep service="instagram" onSubmit={onSubmit} onCancel={onCancel} />);

    await userEvent.type(screen.getByLabelText('Username'), 'alice');
    await userEvent.type(screen.getByLabelText('Password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onSubmit).toHaveBeenCalledWith({ username: 'alice', password: 'secret' });
  });

  it('calls onCancel when cancel is clicked', async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(<CredentialsStep service="instagram" onSubmit={onSubmit} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
  });
});
