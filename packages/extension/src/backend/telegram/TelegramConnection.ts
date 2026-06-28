import * as path from 'node:path';
import { TelegramClient } from 'telegram';
import type {
  BridgeAuthPrompt,
  BridgeConnection,
  BridgeConnectionEvents,
  BridgeCredentials,
  BridgeMessageInfo,
  BridgeRoomInfo,
  BridgeStatus,
} from '../BridgeConnection.js';
import { TypedEmitter } from '../TypedEmitter.js';

export class TelegramConnection
  extends TypedEmitter<BridgeConnectionEvents>
  implements BridgeConnection
{
  readonly service = 'telegram';
  private _status: BridgeStatus = 'disconnected';
  private client: TelegramClient | null = null;
  private phoneNumber = '';
  private apiId = 0;
  private apiHash = '';
  private codeResolver: ((code: string) => void) | null = null;
  private rooms = new Map<string, BridgeRoomInfo>();

  constructor(
    public readonly accountId: string,
    private readonly storageDir: string,
  ) {
    super();
  }

  get status(): BridgeStatus {
    return this._status;
  }

  async connect(credentials: BridgeCredentials): Promise<void> {
    if (this._status === 'connected' || this._status === 'connecting') {
      return;
    }

    if (!credentials.phoneNumber || !credentials.apiId || !credentials.apiHash) {
      throw new Error('Telegram requires phone number, API ID, and API hash');
    }

    this.phoneNumber = credentials.phoneNumber;
    this.apiId = Number(credentials.apiId);
    this.apiHash = credentials.apiHash;

    this.setStatus('connecting');

    try {
      const sessionPath = path.join(this.storageDir, `telegram-${this.accountId}`);
      this.client = new TelegramClient(sessionPath, this.apiId, this.apiHash, {
        connectionRetries: 5,
      });

      await this.client.start({
        phoneNumber: async () => this.phoneNumber,
        phoneCode: async () => this.waitForCode(),
        onError: (error: Error) => {
          this.emit('error', { accountId: this.accountId, error: error.message });
        },
      });

      this.setStatus('connected');
      await this.syncDialogs();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[mssgs:telegram] connect error:', message);
      this.setStatus('error', message);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
    this.setStatus('disconnected');
  }

  getRooms(): BridgeRoomInfo[] {
    return Array.from(this.rooms.values());
  }

  async sendMessage(roomId: string, text: string): Promise<BridgeMessageInfo> {
    if (!this.client) {
      throw new Error('Telegram is not connected');
    }

    const result = await this.client.sendMessage(roomId, { message: text });

    return {
      id: String(result.id),
      roomId,
      senderId: String(result.senderId ?? 'me'),
      senderName: 'me',
      text,
      timestamp: result.date ? Number(result.date) * 1000 : Date.now(),
      isFromMe: result.out ?? true,
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

  private waitForCode(): Promise<string> {
    const prompt: BridgeAuthPrompt = {
      type: 'code',
      instruction: 'Enter the Telegram login code sent to your Telegram app.',
    };
    this.emit('authPrompt', { accountId: this.accountId, prompt });

    return new Promise((resolve) => {
      this.codeResolver = resolve;
    });
  }

  private async syncDialogs(): Promise<void> {
    if (!this.client) {
      return;
    }

    console.log('[mssgs:telegram] syncing dialogs');
    const dialogs = await this.client.getDialogs({ limit: 200 });
    const rooms: BridgeRoomInfo[] = [];

    for (const dialog of dialogs) {
      const entity = dialog.entity;
      if (!entity) {
        continue;
      }

      const id = String(entity.id);
      const title =
        'title' in entity && entity.title
          ? String(entity.title)
          : 'firstName' in entity
            ? [entity.firstName, entity.lastName].filter(Boolean).join(' ')
            : id;

      rooms.push({
        roomId: id,
        name: title,
        avatarUrl: null,
        isDM: !dialog.isGroup && !dialog.isChannel,
        memberCount: dialog.isGroup
          ? 'participantsCount' in entity
            ? Number(entity.participantsCount ?? 0)
            : 0
          : 2,
        lastEventTimestamp: dialog.date ? Number(dialog.date) * 1000 : null,
      });

      this.rooms.set(id, rooms[rooms.length - 1]);
    }

    this.emit('roomsChanged', { accountId: this.accountId, rooms });

    for (const room of rooms.slice(0, 20)) {
      await this.syncMessages(room.roomId);
    }
  }

  private async syncMessages(roomId: string): Promise<void> {
    if (!this.client) {
      return;
    }

    const messages: BridgeMessageInfo[] = [];
    const iter = this.client.iterMessages(roomId, { limit: 50 });

    for await (const msg of iter) {
      if (!msg.message) {
        continue;
      }

      const sender = await msg.getSender();
      const senderName =
        sender && 'firstName' in sender
          ? [sender.firstName, sender.lastName].filter(Boolean).join(' ')
          : String(msg.senderId ?? 'unknown');

      messages.push({
        id: String(msg.id),
        roomId,
        senderId: String(msg.senderId ?? 'unknown'),
        senderName,
        text: msg.message,
        timestamp: msg.date ? Number(msg.date) * 1000 : Date.now(),
        isFromMe: msg.out ?? false,
      });
    }

    if (messages.length > 0) {
      this.emit('messagesChanged', { accountId: this.accountId, roomId, messages });
    }
  }
}
