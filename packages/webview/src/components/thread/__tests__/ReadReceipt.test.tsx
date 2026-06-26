import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReadReceipt } from '../ReadReceipt';

describe('ReadReceipt', () => {
  it.each([
    ['sending', 'Sending'],
    ['sent', 'Sent'],
    ['delivered', 'Delivered'],
    ['read', 'Read'],
    ['failed', 'Failed'],
  ] as const)('renders %s status with accessible label', (status, label) => {
    render(<ReadReceipt status={status} />);

    expect(screen.getByLabelText(label)).toBeInTheDocument();
  });
});
