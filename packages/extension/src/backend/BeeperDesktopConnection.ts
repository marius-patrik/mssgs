import BeeperDesktop from '@beeper/desktop-api';
import type { Message as BeeperMessage, Chat } from '@beeper/desktop-api/resources/index.js';
import { TypedEmitter } from './TypedEmitter.js';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface BeeperRoomInfo {
  roomId: string;
  name: string | null;
  avatarUrl: string | null;
  isDM: boolean;
  memberCount: number;
  lastEventTimestamp: number | null;
  accountID: string;
}

export interface BeeperMessageInfo {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isFromMe: boolean;
}

export interface BeeperDesktopConnectionEvents {
  statusChanged: {
    accountId: string;
    status: ConnectionStatus;
    error?: string;
  };
  roomsChanged: {
    accountId: string;
    rooms: BeeperRoomInfo[];
  };
  messagesChanged: {
    accountId: string;
    roomId: string;
    messages: BeeperMessageInfo[];
  };
  error: {
    accountId: string;
    error: string;
  };
}

export interface BeeperDesktopCredentials {
  baseUrl: string;
  accessToken: string;
}

export class BeeperDesktopConnection extends TypedEmitter<BeeperDesktopConnectionEvents> {
  private _status: ConnectionStatus = 'disconnected';
  private client: InstanceType<typeof BeeperDesktop> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    public readonly accountId: string,
    private readonly credentials: BeeperDesktopCredentials,
  ) {
    super();
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  async connect(): Promise<void> {
    if (this._status === 'connected' || this._status === 'connecting') {
      return;
    }

    this.setStatus('connecting');

    try {
      this.client = new BeeperDesktop({
        baseURL: this.credentials.baseUrl,
        accessToken: this.credentials.accessToken,
      });

      // Verify the API is reachable by listing accounts.
      await this.client.accounts.list();
      this.setStatus('connected');
      await this.sync();

      // Poll every 10 seconds for updates.
      this.pollTimer = setInterval(() => {
        void this.sync().catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          this.emit('error', { accountId: this.accountId, error: message });
        });
      }, 10_000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.setStatus('error', message);
      this.emit('error', { accountId: this.accountId, error: message });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.client = null;
    this.setStatus('disconnected');
  }

  async sync(): Promise<void> {
    if (!this.client) {
      return;
    }

    const chats: Chat[] = [];
    for await (const chat of this.client.chats.list()) {
      chats.push(chat);
      if (chats.length >= 200) {
        break;
      }
    }

    const rooms: BeeperRoomInfo[] = chats.map((chat) => ({
      roomId: chat.id,
      name: chat.title ?? null,
      avatarUrl: chat.imgURL ?? null,
      isDM: chat.type === 'single',
      memberCount: chat.participants.total,
      lastEventTimestamp: chat.lastActivity ? new Date(chat.lastActivity).getTime() : null,
      accountID: chat.accountID,
    }));

    this.emit('roomsChanged', { accountId: this.accountId, rooms });

    for (const chat of chats) {
      await this.syncMessages(chat.id);
    }
  }

  private async syncMessages(chatID: string): Promise<void> {
    if (!this.client) {
      return;
    }

    const beeperMessages: BeeperMessage[] = [];
    for await (const msg of this.client.messages.list(chatID)) {
      beeperMessages.push(msg);
      if (beeperMessages.length >= 50) {
        break;
      }
    }

    const messages: BeeperMessageInfo[] = beeperMessages
      .filter((msg) => !msg.isDeleted && msg.text)
      .map((msg) => ({
        id: msg.id,
        roomId: chatID,
        senderId: msg.senderID,
        senderName: msg.senderName ?? msg.senderID,
        text: msg.text ?? '',
        timestamp: new Date(msg.timestamp).getTime(),
        isFromMe: msg.isSender ?? false,
      }));

    if (messages.length > 0) {
      this.emit('messagesChanged', { accountId: this.accountId, roomId: chatID, messages });
    }
  }

  private setStatus(status: ConnectionStatus, error?: string): void {
    this._status = status;
    this.emit('statusChanged', { accountId: this.accountId, status, error });
  }
}
