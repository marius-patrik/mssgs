import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  Browsers,
  DisconnectReason,
  type WAConnectionState,
  type WAMessage,
  type WASocket,
  makeWASocket,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import type { Logger } from '../../shared/logger.js';
import type {
  BridgeAuthPrompt,
  BridgeConnection,
  BridgeConnectionEvents,
  BridgeMessageInfo,
  BridgeRoomInfo,
  BridgeStatus,
} from '../BridgeConnection.js';
import { TypedEmitter } from '../TypedEmitter.js';

function getContent(message: WAMessage): string | undefined {
  const content = message.message;
  if (!content) {
    return undefined;
  }
  if (content.conversation) {
    return content.conversation;
  }
  if (content.extendedTextMessage?.text) {
    return content.extendedTextMessage.text;
  }
  if (content.imageMessage) {
    return content.imageMessage.caption ?? '[image]';
  }
  if (content.videoMessage) {
    return content.videoMessage.caption ?? '[video]';
  }
  if (content.audioMessage) {
    return '[audio]';
  }
  if (content.documentMessage) {
    return content.documentMessage.caption ?? '[document]';
  }
  return '[message]';
}

export class BaileysConnection
  extends TypedEmitter<BridgeConnectionEvents>
  implements BridgeConnection
{
  readonly service = 'whatsapp';
  private _status: BridgeStatus = 'disconnected';
  private socket: WASocket | null = null;
  private readonly authDir: string;
  private readonly logger: Logger | undefined;
  private rooms = new Map<string, BridgeRoomInfo>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private historyCheckTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    public readonly accountId: string,
    storageDir: string,
    logger?: Logger,
  ) {
    super();
    this.logger = logger;
    this.authDir = path.join(storageDir, `baileys-${accountId}`);
    fs.mkdirSync(this.authDir, { recursive: true });
  }

  get status(): BridgeStatus {
    return this._status;
  }

  async connect(): Promise<void> {
    if (this._status === 'connected' || this._status === 'connecting') {
      return;
    }

    this.setStatus('connecting');

    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
      this.socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.macOS('Chrome'),
      });

      this.socket.ev.on('creds.update', saveCreds);
      this.socket.ev.on('connection.update', (update) => this.handleConnectionUpdate(update));
      this.socket.ev.on('chats.upsert', (chats) => this.handleChats(chats));
      this.socket.ev.on('chats.update', () => this.emitRooms());
      this.socket.ev.on('messages.upsert', (data) => this.handleMessages(data.messages));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger?.error(`[mssgs:whatsapp] connect error: ${message}`);
      this.setStatus('error', message);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.historyCheckTimer) {
      clearTimeout(this.historyCheckTimer);
      this.historyCheckTimer = null;
    }
    if (this.socket) {
      this.socket.end(undefined);
      this.socket = null;
    }
    this.setStatus('disconnected');
  }

  getRooms(): BridgeRoomInfo[] {
    return Array.from(this.rooms.values());
  }

  async sendMessage(roomId: string, text: string): Promise<BridgeMessageInfo> {
    if (!this.socket) {
      throw new Error('WhatsApp is not connected');
    }

    const result = await this.socket.sendMessage(roomId, { text });
    const timestamp = Date.now();
    const userId = this.socket.user?.id ?? '';

    return {
      id: result?.key?.id ?? `${roomId}-${timestamp}`,
      roomId,
      senderId: userId,
      senderName: userId.split('@')[0],
      text,
      timestamp,
      isFromMe: true,
    };
  }

  private setStatus(status: BridgeStatus, error?: string): void {
    this._status = status;
    this.emit('statusChanged', { accountId: this.accountId, status, error });
  }

  private scheduleHistoryCheck(): void {
    // If WhatsApp does not send any chats shortly after connecting, the session's
    // history sync state is probably stale. Force a re-pair so the user can scan
    // the QR code again and receive a fresh history sync.
    this.historyCheckTimer = setTimeout(() => {
      if (this.status === 'connected' && this.rooms.size === 0) {
        this.logger?.log('[mssgs:whatsapp] no rooms received, forcing re-pair');
        void this.repair();
      }
    }, 45_000);
  }

  private async repair(): Promise<void> {
    try {
      await this.disconnect();
    } catch {
      // ignore
    }

    try {
      fs.rmSync(this.authDir, { recursive: true, force: true });
      fs.mkdirSync(this.authDir, { recursive: true });
      this.rooms.clear();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger?.error(`[mssgs:whatsapp] repair cleanup error: ${message}`);
    }

    this.setStatus('connecting');
    await this.connect();
  }

  private async handleConnectionUpdate(update: {
    connection?: WAConnectionState;
    lastDisconnect?: { error?: Error };
    qr?: string;
  }): Promise<void> {
    if (update.qr) {
      const dataUrl = await QRCode.toDataURL(update.qr, { width: 256, margin: 2 });
      const prompt: BridgeAuthPrompt = {
        type: 'qr',
        data: dataUrl,
        instruction:
          'Open WhatsApp on your phone, tap Menu → Linked Devices → Link a Device, and scan this QR code.',
      };
      this.emit('authPrompt', { accountId: this.accountId, prompt });
    }

    if (update.connection === 'open') {
      this.logger?.log(`[mssgs:whatsapp] connected, rooms: ${this.rooms.size}`);
      this.setStatus('connected');
      this.emitRooms();
      this.scheduleHistoryCheck();
    } else if (update.connection === 'close') {
      const reason = update.lastDisconnect?.error;
      const statusCode = reason
        ? (reason as unknown as { statusCode?: number }).statusCode
        : undefined;
      const shouldReconnect = statusCode !== (DisconnectReason.loggedOut as number);

      this.setStatus('disconnected');

      if (shouldReconnect) {
        this.reconnectTimer = setTimeout(() => {
          void this.connect();
        }, 3_000);
      }
    }
  }

  private handleChats(
    chats: Array<{ id?: string | null; name?: string | null; unreadCount?: number | null }>,
  ): void {
    for (const chat of chats) {
      if (!chat.id) {
        continue;
      }
      this.rooms.set(chat.id, {
        roomId: chat.id,
        name: chat.name ?? null,
        avatarUrl: null,
        isDM: !chat.id.endsWith('@g.us'),
        memberCount: chat.id.endsWith('@g.us') ? 0 : 2,
        lastEventTimestamp: null,
      });
    }
    this.emitRooms();
  }

  private emitRooms(): void {
    this.emit('roomsChanged', { accountId: this.accountId, rooms: this.getRooms() });
  }

  private handleMessages(messages: WAMessage[]): void {
    const byRoom = new Map<string, BridgeMessageInfo[]>();
    const userId = this.socket?.user?.id ?? '';

    for (const msg of messages) {
      const roomId = msg.key.remoteJid;
      if (!roomId) {
        continue;
      }

      const text = getContent(msg);
      if (!text) {
        continue;
      }

      const rawSenderId = msg.key.fromMe ? userId : msg.key.participant ?? msg.key.remoteJid;
      const senderId = rawSenderId ?? '';
      const senderName = senderId.split('@')[0];
      const isFromMe = msg.key.fromMe ?? false;
      const timestamp = msg.messageTimestamp
        ? typeof msg.messageTimestamp === 'number'
          ? msg.messageTimestamp * 1000
          : Number(msg.messageTimestamp) * 1000
        : Date.now();

      const info: BridgeMessageInfo = {
        id: msg.key.id ?? `${roomId}-${timestamp}`,
        roomId,
        senderId: senderId ?? '',
        senderName,
        text,
        timestamp,
        isFromMe,
      };

      if (!byRoom.has(roomId)) {
        byRoom.set(roomId, []);
      }
      byRoom.get(roomId)?.push(info);
    }

    for (const [roomId, roomMessages] of byRoom.entries()) {
      if (roomMessages.length > 0) {
        this.emit('messagesChanged', { accountId: this.accountId, roomId, messages: roomMessages });
      }
    }
  }
}
