import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessengerClient } from '../../messaging/client';
import * as vscodeApi from '../../messaging/vscodeApi';

vi.mock('../../messaging/vscodeApi', () => ({
  postMessage: vi.fn(),
  onMessage: vi.fn(),
}));

describe('MessengerClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves a request when a matching response arrives', async () => {
    let handler: ((event: MessageEvent<unknown>) => void) | undefined;
    const posted: unknown[] = [];

    vi.mocked(vscodeApi.onMessage).mockImplementation((callback) => {
      handler = callback;
      return () => {
        handler = undefined;
      };
    });

    vi.mocked(vscodeApi.postMessage).mockImplementation((message) => {
      posted.push(message);
    });

    const client = new MessengerClient();
    client.connect();

    const promise = client.request('ping');

    expect(posted).toHaveLength(1);
    const request = posted[0] as { type: 'request'; id: string; method: 'ping' };
    expect(request.method).toBe('ping');

    handler?.(
      new MessageEvent('message', {
        data: { type: 'response', id: request.id, result: { ok: true } },
      }),
    );

    await expect(promise).resolves.toEqual({ ok: true });
  });

  it('rejects a request when an error response arrives', async () => {
    let handler: ((event: MessageEvent<unknown>) => void) | undefined;
    const posted: unknown[] = [];

    vi.mocked(vscodeApi.onMessage).mockImplementation((callback) => {
      handler = callback;
      return () => {
        handler = undefined;
      };
    });

    vi.mocked(vscodeApi.postMessage).mockImplementation((message) => {
      posted.push(message);
    });

    const client = new MessengerClient();
    client.connect();

    const promise = client.request('getAccounts');

    const request = posted[0] as { type: 'request'; id: string; method: 'getAccounts' };
    expect(request.method).toBe('getAccounts');

    handler?.(
      new MessageEvent('message', {
        data: { type: 'response', id: request.id, error: 'Something went wrong' },
      }),
    );

    await expect(promise).rejects.toBe('Something went wrong');
  });

  it('dispatches events to registered listeners', () => {
    let handler: ((event: MessageEvent<unknown>) => void) | undefined;

    vi.mocked(vscodeApi.onMessage).mockImplementation((callback) => {
      handler = callback;
      return () => {
        handler = undefined;
      };
    });

    const client = new MessengerClient();
    client.connect();

    const listener = vi.fn();
    client.onEvent(listener);

    handler?.(
      new MessageEvent('message', {
        data: { type: 'event', eventType: 'accounts', payload: [] },
      }),
    );

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      type: 'event',
      eventType: 'accounts',
      payload: [],
    });
  });

  it('ignores messages without a recognized type', () => {
    let handler: ((event: MessageEvent<unknown>) => void) | undefined;

    vi.mocked(vscodeApi.onMessage).mockImplementation((callback) => {
      handler = callback;
      return () => {
        handler = undefined;
      };
    });

    const client = new MessengerClient();
    client.connect();

    const listener = vi.fn();
    client.onEvent(listener);

    handler?.(new MessageEvent('message', { data: { hello: 'world' } }));
    handler?.(new MessageEvent('message', { data: undefined }));

    expect(listener).not.toHaveBeenCalled();
  });
});
