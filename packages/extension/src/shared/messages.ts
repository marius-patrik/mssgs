export type SetupServiceType = 'whatsapp' | 'telegram' | 'instagram' | 'imessage';

export interface SetupStatus {
  setupId: string;
  service: SetupServiceType;
  step: 'select' | 'credentials' | 'qr' | 'link' | 'pairing' | 'connecting' | 'connected' | 'error';
  instruction?: string;
  qrData?: string;
  linkUrl?: string;
  error?: string;
}

export interface MssgsRequestMap {
  ping: { payload?: undefined; response: { ok: true } };
  getAccounts: { payload?: undefined; response: { accounts: unknown[] } };
  getConversations: { payload?: undefined; response: { conversations: unknown[] } };
  archiveConversation: { payload: { conversationId: string }; response: { archived: boolean } };
  markAllAsRead: { payload?: undefined; response: { marked: number } };
  searchMessages: { payload: { query: string }; response: { results: unknown[] } };
  startAccountSetup: { payload: { service: SetupServiceType }; response: SetupStatus };
  submitAccountCredentials: {
    payload: { setupId: string; credentials: Record<string, string> };
    response: SetupStatus;
  };
  cancelAccountSetup: { payload: { setupId: string }; response: { cancelled: boolean } };
  getSetupStatus: { payload: { setupId: string }; response: SetupStatus };
}

export type MssgsMethod = keyof MssgsRequestMap;

export type MssgsRequest<M extends MssgsMethod = MssgsMethod> = {
  type: 'request';
  id: string;
  method: M;
  payload: MssgsRequestMap[M]['payload'];
};

export type MssgsResponse =
  | { type: 'response'; id: string; result: unknown }
  | { type: 'response'; id: string; error: string };

export type MssgsEventType = 'accounts' | 'conversations' | 'messages' | 'theme';

export type MssgsEvent =
  | { type: 'event'; eventType: 'accounts'; payload: unknown[] }
  | { type: 'event'; eventType: 'conversations'; payload: unknown[] }
  | { type: 'event'; eventType: 'messages'; payload: unknown[] }
  | {
      type: 'event';
      eventType: 'theme';
      payload: { kind: 'dark' | 'light' | 'highContrast' };
    };

export type MssgsMessage = MssgsRequest | MssgsResponse | MssgsEvent;

export type RequestHandler<M extends MssgsMethod = MssgsMethod> = (
  payload: MssgsRequestMap[M]['payload'],
) => MssgsRequestMap[M]['response'] | Promise<MssgsRequestMap[M]['response']>;

export class MessageBus {
  private handlers = new Map<MssgsMethod, RequestHandler<MssgsMethod>>();

  registerHandler<M extends MssgsMethod>(method: M, handler: RequestHandler<M>): void {
    this.handlers.set(method, handler as unknown as RequestHandler<MssgsMethod>);
  }

  async handleRequest(request: MssgsRequest): Promise<MssgsResponse> {
    const handler = this.handlers.get(request.method);
    if (!handler) {
      return {
        type: 'response',
        id: request.id,
        error: `No handler registered for method: ${request.method}`,
      };
    }

    try {
      const result = await handler(request.payload);
      return { type: 'response', id: request.id, result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { type: 'response', id: request.id, error: message };
    }
  }
}
