import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AccountSetupResponse,
  SetupServiceType,
} from '../../../../../extension/src/shared/messages';
import type { MessengerClient } from '../../../messaging/client';
import { useAccountWizard } from '../useAccountWizard';

function createClient(
  response?: Partial<AccountSetupResponse>,
): MessengerClient & { request: ReturnType<typeof vi.fn> } {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    request: vi.fn().mockResolvedValue({
      sessionId: 'session-1',
      status: 'qr',
      instructions: 'Scan the code',
      qrData: 'qr-data',
      ...response,
    }),
    onEvent: vi.fn().mockReturnValue(() => {}),
  } as unknown as MessengerClient & { request: ReturnType<typeof vi.fn> };
}

describe('useAccountWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts closed and can be opened', () => {
    const client = createClient();
    const { result } = renderHook(() => useAccountWizard(client));

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('starts a setup session for the selected service', async () => {
    const client = createClient();
    const { result } = renderHook(() => useAccountWizard(client));

    act(() => {
      result.current.open();
    });

    await act(async () => {
      await result.current.selectService('whatsapp');
    });

    await waitFor(() => {
      expect(result.current.selectedService).toBe('whatsapp');
      expect(result.current.setup?.status).toBe('qr');
      expect(result.current.setup?.qrData).toBe('qr-data');
    });

    expect(client.request).toHaveBeenCalledWith('startAccountSetup', { service: 'whatsapp' });
  });

  it('completes a setup session and closes the wizard', async () => {
    const client = createClient({ status: 'awaiting_input' });
    client.request.mockResolvedValueOnce({
      sessionId: 'session-1',
      status: 'awaiting_input',
      instructions: 'Enter code',
    });
    client.request.mockResolvedValueOnce({
      success: true,
      accountId: 'session-1',
    });

    const { result } = renderHook(() => useAccountWizard(client));

    act(() => {
      result.current.open();
    });

    await act(async () => {
      await result.current.selectService('instagram');
    });

    await act(async () => {
      await result.current.complete('123456');
    });

    expect(client.request).toHaveBeenLastCalledWith('completeAccountSetup', {
      sessionId: 'session-1',
      code: '123456',
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('reports an error when starting fails', async () => {
    const client = createClient();
    client.request.mockRejectedValueOnce('Network error');

    const { result } = renderHook(() => useAccountWizard(client));

    await act(async () => {
      await result.current.selectService('telegram' as SetupServiceType);
    });

    expect(result.current.error).toBe('Network error');
  });

  it('supports controlled open state', () => {
    const client = createClient();
    const onOpenChange = vi.fn();
    const { result } = renderHook(() => useAccountWizard(client, { open: true, onOpenChange }));

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
