import { act, renderHook, waitFor } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { useTheme } from '../hooks/useTheme';

const originalError = console.error;

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const message = typeof args[0] === 'string' ? args[0] : '';
    if (message.includes('was not wrapped in act')) {
      return;
    }
    originalError(...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

async function flushMicrotasks(): Promise<void> {
  await new Promise<void>((resolve) => {
    queueMicrotask(resolve);
  });
}

describe('useTheme', () => {
  beforeEach(() => {
    document.body.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('light', 'dark');
  });

  afterEach(() => {
    document.body.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('light', 'dark');
  });

  it('defaults to light and toggles to dark', async () => {
    const { result } = renderHook(() => useTheme());
    await act(async () => {
      await flushMicrotasks();
    });

    expect(result.current.theme).toBe('light');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    act(() => {
      result.current.setTheme('light');
    });

    expect(result.current.theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('syncs with vscode-dark body class', async () => {
    const { result } = renderHook(() => useTheme());
    await act(async () => {
      await flushMicrotasks();
    });

    expect(result.current.theme).toBe('light');

    await act(async () => {
      document.body.classList.add('vscode-dark');
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(result.current.theme).toBe('dark');
    });

    await act(async () => {
      document.body.classList.remove('vscode-dark');
      document.body.classList.add('vscode-light');
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(result.current.theme).toBe('light');
    });

    act(() => {
      document.body.classList.remove('vscode-light');
    });
  });

  it('syncs with theme change messages from the extension host', async () => {
    const { result } = renderHook(() => useTheme());
    await act(async () => {
      await flushMicrotasks();
    });

    expect(result.current.theme).toBe('light');

    await act(async () => {
      window.postMessage({ type: 'themeChange', theme: 'dark' }, '*');
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(result.current.theme).toBe('dark');
    });
  });
});
