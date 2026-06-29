import { execFile } from 'node:child_process';
import * as path from 'node:path';
import { promisify } from 'node:util';
import Database from 'better-sqlite3';

type DatabaseInstance = InstanceType<typeof Database>;
import type { Logger } from '../../shared/logger.js';
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
  handle_count: number;
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

  async connect(): Promise<void> {
    if (this._status === 'connected' || this._status === 'connecting') {
      return;
    }

    if (process.platform !== 'darwin') {
      const message = 'iMessage is only available on macOS.';
      this.setStatus('error', message);
      this.emit('error', { accountId: this.accountId, error: message });
      throw new Error(message);
    }

    this.setStatus('connecting');

    try {
      await this.sync();
      this.setStatus('connected');

      this.pollTimer = setInterval(() => {
        void this.sync().catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          this.logger?.error(`[mssgs:iMessage] sync error: ${message}`);
          this.emit('error', { accountId: this.accountId, error: message });
        });
      }, 15_000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger?.error(`[mssgs:iMessage] connect error: ${message}`);
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

  async logout(): Promise<void> {
    await this.disconnect();
    this.rooms.clear();
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
    const db = await this.openDatabase();

    try {
      const stmt = db.prepare(`
        WITH chat_handles AS (
          SELECT chat_id, COUNT(DISTINCT handle_id) AS handle_count
          FROM chat_handle_join
          GROUP BY chat_id
        ),
        ranked AS (
          SELECT
            c.ROWID AS chat_id,
            c.display_name AS display_name,
            c.chat_identifier AS chat_identifier,
            ch.handle_count AS handle_count,
            m.ROWID AS msg_id,
            m.text AS text,
            m.date AS date,
            m.is_from_me AS is_from_me,
            h.id AS sender,
            ROW_NUMBER() OVER (PARTITION BY c.ROWID ORDER BY m.date DESC) AS rn
          FROM chat c
          JOIN chat_handles ch ON ch.chat_id = c.ROWID
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

  private async openDatabase(): Promise<DatabaseInstance> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        return new Database(CHAT_DB);
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('unable to open database file')) {
          throw new Error(
            'mssgs needs Full Disk Access to read iMessage conversations. Grant it to Visual Studio Code in System Settings > Privacy & Security > Full Disk Access, then reload the window.',
          );
        }
        if (message.includes('database is locked')) {
          this.logger?.log(`[mssgs:imessage] chat.db locked, retrying (${attempt}/5)...`);
          await new Promise((resolve) => setTimeout(resolve, attempt * 500));
          continue;
        }
        throw error;
      }
    }
    throw lastError ?? new Error('Failed to open iMessage database');
  }

  private ingestRows(rows: ChatRow[]): void {
    const roomMessages = new Map<string, BridgeMessageInfo[]>();

    for (const row of rows) {
      const roomId = String(row.chat_id);
      const roomName = row.display_name || row.chat_identifier || 'Unknown';
      const sender = row.is_from_me ? 'me' : row.sender ?? 'unknown';
      const timestamp = appleDateToTimestamp(row.date);

      const isDM = row.handle_count <= 1;
      this.rooms.set(roomId, {
        roomId,
        name: roomName,
        avatarUrl: null,
        isDM,
        memberCount: isDM ? 2 : row.handle_count + 1,
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
