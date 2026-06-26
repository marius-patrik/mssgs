import type {
  MssgsEvent,
  MssgsMessage,
  MssgsMethod,
  MssgsRequestMap,
  MssgsResponse,
} from '../../../extension/src/shared/messages';
import { onMessage, postMessage } from './vscodeApi';

let requestCounter = 0;

function generateRequestId(): string {
  requestCounter += 1;
  return `mssgs-req-${requestCounter}`;
}

export class MessengerClient {
  private pending = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: string) => void;
    }
  >();

  private eventListeners = new Set<(event: MssgsEvent) => void>();
  private unsubscribe: (() => void) | null = null;

  connect(): void {
    this.disconnect();
    this.unsubscribe = onMessage((event) => {
      this.handleMessage(event);
    });
  }

  disconnect(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  request<M extends MssgsMethod>(
    method: M,
    payload?: MssgsRequestMap[M]['payload'],
  ): Promise<MssgsRequestMap[M]['response']> {
    const id = generateRequestId();
    const request = { type: 'request' as const, id, method, payload };

    return new Promise<MssgsRequestMap[M]['response']>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      postMessage(request);
    });
  }

  onEvent(listener: (event: MssgsEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  private handleMessage(event: MessageEvent<unknown>): void {
    const message = event.data as MssgsMessage | undefined;

    if (!message || typeof message !== 'object' || !('type' in message)) {
      return;
    }

    if (message.type === 'response') {
      this.handleResponse(message);
    } else if (message.type === 'event') {
      this.dispatchEvent(message);
    }
  }

  private handleResponse(response: MssgsResponse): void {
    const pending = this.pending.get(response.id);
    if (!pending) {
      return;
    }

    this.pending.delete(response.id);

    if ('error' in response) {
      pending.reject(response.error);
    } else {
      pending.resolve(response.result);
    }
  }

  private dispatchEvent(event: MssgsEvent): void {
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }
}
