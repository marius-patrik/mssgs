import { execFile } from 'node:child_process';
import * as path from 'node:path';
import { promisify } from 'node:util';
import type {
  BridgeConnection,
  BridgeConnectionEvents,
  BridgeMessageInfo,
  BridgeRoomInfo,
  BridgeStatus,
} from '../BridgeConnection.js';
import { TypedEmitter } from '../TypedEmitter.js';

const execFileAsync = promisify(execFile);

const CHAT_DB = path.join(process.env.HOME ?? '/Users/user', 'Library', 'Messages', 'chat.db');

// iMessage stores dates as nanoseconds since 2001-01-01 00:00:00 UTC.
function appleDateToTimestamp(appleDate: number | null | undefined): number {
  if (appleDate == null) {
    return Date.now();
  }
  return Math.round(appleDate / 1e6 + 978307200000);
}

interface ChatRow {
  chat_id: number;
  display_name: string | null;
  chat_identifier: string | null;
  msg_id: number;
  text: string | null;
  date: number;
  is_from_me: number;
  sender: string | null;
}

export class IMessageConnection
  extends TypedEmitter<BridgeConnectionEvents>
  implements BridgeConnection
{
  readonly service = 'imessage';
  private _status: BridgeStatus = 'disconnected';
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private rooms = new Map<string, BridgeRoomInfo>();

  constructor(public readonly accountId: string) {
    super();
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
      await this.sync();
      this.setStatus('connected');

      this.pollTimer = setInterval(() => {
        void this.sync().catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          console.error('[mssgs:iMessage] sync error:', message);
          this.emit('error', { accountId: this.accountId, error: message });
        });
      }, 15_000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[mssgs:iMessage] connect error:', message);
      this.setStatus('error', message);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.setStatus('disconnected');
  }

  getRooms(): BridgeRoomInfo[] {
    return Array.from(this.rooms.values());
  }

  async sendMessage(roomId: string, text: string): Promise<BridgeMessageInfo> {
    const script = `tell application "Messages" to send "${text.replace(/"/g, '\\"')}" to chat id "${roomId.replace(/"/g, '\\"')}"`;
    await execFileAsync('osascript', ['-e', script], { timeout: 10_000 });
    const timestamp = Date.now();

    return {
      id: `${roomId}-${timestamp}`,
      roomId,
      senderId: 'me',
      senderName: 'me',
      text,
      timestamp,
      isFromMe: true,
    };
  }

  private async sync(): Promise<void> {
    const { DatabaseSync } = process.getBuiltinModule('node:sqlite') as {
      DatabaseSync: new (
        path: string,
      ) => {
        prepare(query: string): {
          all(): unknown[];
          run(...params: unknown[]): void;
        };
        close(): void;
      };
    };

    let db: InstanceType<typeof DatabaseSync> | undefined;
    try {
      db = new DatabaseSync(CHAT_DB);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('unable to open database file')) {
        throw new Error(
          'mssgs needs Full Disk Access to read iMessage conversations. Grant it to Visual Studio Code in System Settings > Privacy & Security > Full Disk Access, then reload the window.',
        );
      }
      throw error;
    }

    try {
      const stmt = db.prepare(`
        WITH ranked AS (
          SELECT
            c.ROWID AS chat_id,
            c.display_name AS display_name,
            c.chat_identifier AS chat_identifier,
            m.ROWID AS msg_id,
            m.text AS text,
            m.date AS date,
            m.is_from_me AS is_from_me,
            h.id AS sender,
            ROW_NUMBER() OVER (PARTITION BY c.ROWID ORDER BY m.date DESC) AS rn
          FROM chat c
          JOIN chat_message_join cmj ON cmj.chat_id = c.ROWID
          JOIN message m ON m.ROWID = cmj.message_id
          LEFT JOIN handle h ON m.handle_id = h.ROWID
        )
        SELECT * FROM ranked WHERE rn <= 25 ORDER BY chat_id, date DESC
      `);

      const rows = stmt.all() as ChatRow[];
      this.ingestRows(rows);
    } finally {
      db.close();
    }
  }

  private ingestRows(rows: ChatRow[]): void {
    const roomMessages = new Map<string, BridgeMessageInfo[]>();

    for (const row of rows) {
      const roomId = String(row.chat_id);
      const roomName = row.display_name || row.chat_identifier || 'Unknown';
      const sender = row.is_from_me ? 'me' : row.sender ?? 'unknown';
      const timestamp = appleDateToTimestamp(row.date);

      this.rooms.set(roomId, {
        roomId,
        name: roomName,
        avatarUrl: null,
        isDM: true,
        memberCount: 2,
        lastEventTimestamp: timestamp,
      });

      const info: BridgeMessageInfo = {
        id: `${roomId}-${row.msg_id}`,
        roomId,
        senderId: sender,
        senderName: sender,
        text: row.text ?? '[attachment]',
        timestamp,
        isFromMe: Boolean(row.is_from_me),
      };

      if (!roomMessages.has(roomId)) {
        roomMessages.set(roomId, []);
      }
      roomMessages.get(roomId)?.push(info);
    }

    this.emit('roomsChanged', { accountId: this.accountId, rooms: this.getRooms() });

    for (const [roomId, messages] of roomMessages.entries()) {
      if (messages.length > 0) {
        this.emit('messagesChanged', { accountId: this.accountId, roomId, messages });
      }
    }
  }

  private setStatus(status: BridgeStatus, error?: string): void {
    this._status = status;
    this.emit('statusChanged', { accountId: this.accountId, status, error });
  }
}
