import { IgApiClient } from 'instagram-private-api';
import type { Logger } from '../../shared/logger.js';
import type {
  BridgeConnection,
  BridgeConnectionEvents,
  BridgeCredentials,
  BridgeMessageInfo,
  BridgeRoomInfo,
  BridgeStatus,
} from '../BridgeConnection.js';
import { TypedEmitter } from '../TypedEmitter.js';

export class InstagramConnection
  extends TypedEmitter<BridgeConnectionEvents>
  implements BridgeConnection
{
  readonly service = 'instagram';
  private _status: BridgeStatus = 'disconnected';
  private client: IgApiClient | null = null;
  private username = '';
  private password = '';
  private codeResolver: ((code: string) => void) | null = null;
  private readonly logger: Logger | undefined;
  private rooms = new Map<string, BridgeRoomInfo>();

  constructor(
    public readonly accountId: string,
    logger?: Logger,
  ) {
    super();
    this.logger = logger;
  }

  get status(): BridgeStatus {
    return this._status;
  }

  async connect(credentials: BridgeCredentials): Promise<void> {
    if (this._status === 'connected' || this._status === 'connecting') {
      return;
    }

    if (!credentials.username || !credentials.password) {
      throw new Error('Instagram requires username and password');
    }

    this.username = credentials.username;
    this.password = credentials.password;

    this.setStatus('connecting');

    try {
      this.client = new IgApiClient();
      this.client.state.generateDevice(this.username);

      const loggedIn = await this.client.account.login(this.username, this.password);
      if (!loggedIn) {
        throw new Error('Instagram login failed');
      }

      this.setStatus('connected');
      await this.syncInbox();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isChallenge = message.toLowerCase().includes('challenge') || message.toLowerCase().includes('checkpoint');
      const display = isChallenge
        ? `${message}. Complete the Instagram challenge in a browser, then try again.`
        : message;
      this.logger?.error(`[mssgs:instagram] connect error: ${display}`);
      this.setStatus('error', display);
      this.emit('error', { accountId: this.accountId, error: display });
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.setStatus('disconnected');
  }

  async logout(): Promise<void> {
    if (this.client) {
      try {
        await this.client.account.logout();
      } catch {
        // ignore
      }
      this.client = null;
    }
    this.username = '';
    this.password = '';
    this.rooms.clear();
    this.setStatus('disconnected');
  }

  getRooms(): BridgeRoomInfo[] {
    return Array.from(this.rooms.values());
  }

  async sendMessage(roomId: string, text: string): Promise<BridgeMessageInfo> {
    if (!this.client) {
      throw new Error('Instagram is not connected');
    }

    const result = (await this.client.entity.directThread(roomId).broadcastText(text)) as {
      item_id?: string;
      client_context?: string;
      timestamp?: number;
    };
    const me = await this.client.user.info(this.client.state.cookieUserId);
    const timestamp = result.timestamp ? Number(result.timestamp) : Date.now();

    return {
      id: result.item_id ?? result.client_context ?? `${roomId}-${timestamp}`,
      roomId,
      senderId: String(me.pk),
      senderName: me.username,
      text,
      timestamp,
      isFromMe: true,
    };
  }

  async submitCredentials(credentials: BridgeCredentials): Promise<void> {
    if (credentials.code && this.codeResolver) {
      this.codeResolver(credentials.code);
      this.codeResolver = null;
    }
  }

  private setStatus(status: BridgeStatus, error?: string): void {
    this._status = status;
    this.emit('statusChanged', { accountId: this.accountId, status, error });
  }

  private async syncInbox(): Promise<void> {
    if (!this.client) {
      return;
    }

    const inbox = this.client.feed.directInbox();
    const response = (await inbox.request()) as any;
    const threads: any[] = response.threads ?? [];
    const rooms: BridgeRoomInfo[] = [];

    for (const thread of threads) {
      const roomId = String(thread.thread_id);
      const users: any[] = thread.users ?? [];
      const title =
        thread.thread_title || users.map((u: any) => u.username).join(', ') || 'Unknown';

      rooms.push({
        roomId,
        name: title,
        avatarUrl: null,
        isDM: users.length <= 1,
        memberCount: users.length + 1,
        lastEventTimestamp: thread.last_activity_at ? Number(thread.last_activity_at) : null,
      });

      this.rooms.set(roomId, rooms[rooms.length - 1]);
    }

    this.emit('roomsChanged', { accountId: this.accountId, rooms });

    for (const thread of threads.slice(0, 20)) {
      await this.syncThread(String(thread.thread_id));
    }
  }

  private async syncThread(threadId: string): Promise<void> {
    if (!this.client) {
      return;
    }

    const threadFeed = this.client.feed.directThread({ thread_id: threadId } as any);
    const response = (await threadFeed.request()) as any;
    const items: Array<{ item_id: string; user_id: number; text: string; timestamp: number }> =
      response.items ?? [];

    const messages: BridgeMessageInfo[] = [];
    const me = await this.client.user.info(this.client.state.cookieUserId);

    for (const item of items) {
      if (!item.text) {
        continue;
      }

      const senderId = String(item.user_id);
      const isFromMe = item.user_id === Number(me.pk);

      messages.push({
        id: String(item.item_id),
        roomId: threadId,
        senderId,
        senderName: isFromMe ? me.username : senderId,
        text: item.text,
        timestamp: item.timestamp ? Number(item.timestamp) : Date.now(),
        isFromMe,
      });
    }

    if (messages.length > 0) {
      this.emit('messagesChanged', { accountId: this.accountId, roomId: threadId, messages });
    }
  }
}
