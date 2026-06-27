import { DatabaseSync } from 'node:sqlite';
import {
  AccountSchema,
  ContactSchema,
  ConversationSchema,
  MessageSchema,
  NormalizedStateSchema,
} from '../shared/schemas.js';
import type { Account, Contact, Conversation, Message, NormalizedState } from '../shared/types.js';
import { runMigrations } from './migrations.js';
import type {
  AccountRow,
  ContactRow,
  ConversationRow,
  MessageRow,
  MessageSearchResult,
  ReadStateRow,
} from './types.js';

export interface ReadState {
  conversationId: string;
  lastReadMessageId: string | null;
  lastReadAt: string | null;
  unreadCount: number;
}

export interface SqliteCacheOptions {
  enableWal?: boolean;
}

const booleanToInt = (value: boolean): 0 | 1 => (value ? 1 : 0);
const intToBoolean = (value: 0 | 1 | number): boolean => value === 1;

export class SqliteCache {
  private readonly db: DatabaseSync;

  constructor(dbPath: string, options: SqliteCacheOptions = {}) {
    this.db = new DatabaseSync(dbPath);

    if (options.enableWal !== false && dbPath !== ':memory:') {
      this.db.exec('PRAGMA journal_mode = WAL');
    }

    this.db.exec('PRAGMA foreign_keys = ON');
    runMigrations(this.db);
  }

  close(): void {
    this.db.close();
  }

  // ---------------------------------------------------------------------------
  // Sync (upsert) methods
  // ---------------------------------------------------------------------------

  syncAccount(account: Account): void {
    const parsed = AccountSchema.parse(account);
    const stmt = this.db.prepare(
      `INSERT INTO accounts (id, service, username, display_name, avatar_url, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         service=excluded.service,
         username=excluded.username,
         display_name=excluded.display_name,
         avatar_url=excluded.avatar_url,
         status=excluded.status,
         created_at=excluded.created_at,
         updated_at=excluded.updated_at`,
    );
    stmt.run(
      parsed.id,
      parsed.service,
      parsed.username,
      parsed.displayName,
      parsed.avatarUrl,
      parsed.status,
      parsed.createdAt,
      parsed.updatedAt,
    );
  }

  syncAccounts(accounts: Account[]): void {
    this.runInTransaction(() => {
      for (const account of accounts) {
        this.syncAccount(account);
      }
    });
  }

  syncContact(contact: Contact): void {
    const parsed = ContactSchema.parse(contact);
    const stmt = this.db.prepare(
      `INSERT INTO contacts (id, account_id, service_contact_id, display_name, username, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         account_id=excluded.account_id,
         service_contact_id=excluded.service_contact_id,
         display_name=excluded.display_name,
         username=excluded.username,
         avatar_url=excluded.avatar_url,
         created_at=excluded.created_at,
         updated_at=excluded.updated_at`,
    );
    stmt.run(
      parsed.id,
      parsed.accountId,
      parsed.serviceContactId,
      parsed.displayName,
      parsed.username,
      parsed.avatarUrl,
      parsed.createdAt,
      parsed.updatedAt,
    );
  }

  syncContacts(contacts: Contact[]): void {
    this.runInTransaction(() => {
      for (const contact of contacts) {
        this.syncContact(contact);
      }
    });
  }

  syncConversation(conversation: Conversation): void {
    const parsed = ConversationSchema.parse(conversation);
    const stmt = this.db.prepare(
      `INSERT INTO conversations (id, account_id, service, type, title, participant_ids, last_message_id, unread_count, is_archived, is_pinned, is_favorite, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         account_id=excluded.account_id,
         service=excluded.service,
         type=excluded.type,
         title=excluded.title,
         participant_ids=excluded.participant_ids,
         last_message_id=excluded.last_message_id,
         unread_count=excluded.unread_count,
         is_archived=excluded.is_archived,
         is_pinned=excluded.is_pinned,
         is_favorite=excluded.is_favorite,
         created_at=excluded.created_at,
         updated_at=excluded.updated_at`,
    );
    stmt.run(
      parsed.id,
      parsed.accountId,
      parsed.service,
      parsed.type,
      parsed.title,
      JSON.stringify(parsed.participantIds),
      parsed.lastMessageId,
      parsed.unreadCount,
      booleanToInt(parsed.isArchived),
      booleanToInt(parsed.isPinned),
      booleanToInt(parsed.isFavorite),
      parsed.createdAt,
      parsed.updatedAt,
    );
  }

  syncConversations(conversations: Conversation[]): void {
    this.runInTransaction(() => {
      for (const conversation of conversations) {
        this.syncConversation(conversation);
      }
    });
  }

  syncMessage(message: Message): void {
    const parsed = MessageSchema.parse(message);
    const stmt = this.db.prepare(
      `INSERT INTO messages (id, conversation_id, account_id, sender_id, text, status, is_from_me, reply_to_id, reactions, attachments, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         conversation_id=excluded.conversation_id,
         account_id=excluded.account_id,
         sender_id=excluded.sender_id,
         text=excluded.text,
         status=excluded.status,
         is_from_me=excluded.is_from_me,
         reply_to_id=excluded.reply_to_id,
         reactions=excluded.reactions,
         attachments=excluded.attachments,
         created_at=excluded.created_at,
         updated_at=excluded.updated_at`,
    );
    stmt.run(
      parsed.id,
      parsed.conversationId,
      parsed.accountId,
      parsed.senderId,
      parsed.text,
      parsed.status,
      booleanToInt(parsed.isFromMe),
      parsed.replyToId,
      JSON.stringify(parsed.reactions),
      JSON.stringify(parsed.attachments),
      parsed.createdAt,
      parsed.updatedAt,
    );
  }

  syncMessages(messages: Message[]): void {
    this.runInTransaction(() => {
      for (const message of messages) {
        this.syncMessage(message);
      }
    });
  }

  syncReadState(
    conversationId: string,
    readState: Partial<Omit<ReadState, 'conversationId'>>,
  ): void {
    const existing = this.getReadState(conversationId);
    const next: ReadState = {
      conversationId,
      lastReadMessageId:
        'lastReadMessageId' in readState
          ? readState.lastReadMessageId ?? null
          : existing?.lastReadMessageId ?? null,
      lastReadAt:
        'lastReadAt' in readState ? readState.lastReadAt ?? null : existing?.lastReadAt ?? null,
      unreadCount:
        'unreadCount' in readState ? readState.unreadCount ?? 0 : existing?.unreadCount ?? 0,
    };

    const stmt = this.db.prepare(
      `INSERT INTO read_state (conversation_id, last_read_message_id, last_read_at, unread_count)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(conversation_id) DO UPDATE SET
         last_read_message_id=excluded.last_read_message_id,
         last_read_at=excluded.last_read_at,
         unread_count=excluded.unread_count`,
    );
    stmt.run(next.conversationId, next.lastReadMessageId, next.lastReadAt, next.unreadCount);
  }

  // ---------------------------------------------------------------------------
  // Read methods
  // ---------------------------------------------------------------------------

  getAccount(id: string): Account | undefined {
    const row = this.db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as
      | AccountRow
      | undefined;
    return row ? this.accountFromRow(row) : undefined;
  }

  getAccounts(): Account[] {
    const rows = this.db
      .prepare('SELECT * FROM accounts ORDER BY display_name')
      .all() as unknown as AccountRow[];
    return rows.map((row) => this.accountFromRow(row));
  }

  getContact(id: string): Contact | undefined {
    const row = this.db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as
      | ContactRow
      | undefined;
    return row ? this.contactFromRow(row) : undefined;
  }

  getContacts(): Contact[] {
    const rows = this.db
      .prepare('SELECT * FROM contacts ORDER BY display_name')
      .all() as unknown as ContactRow[];
    return rows.map((row) => this.contactFromRow(row));
  }

  getConversation(id: string): Conversation | undefined {
    const row = this.db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as
      | ConversationRow
      | undefined;
    return row ? this.conversationFromRow(row) : undefined;
  }

  getConversations(): Conversation[] {
    const rows = this.db
      .prepare('SELECT * FROM conversations ORDER BY updated_at DESC')
      .all() as unknown as ConversationRow[];
    return rows.map((row) => this.conversationFromRow(row));
  }

  getMessage(id: string): Message | undefined {
    const row = this.db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as
      | MessageRow
      | undefined;
    return row ? this.messageFromRow(row) : undefined;
  }

  getMessagesForConversation(conversationId: string, limit = 200): Message[] {
    const rows = this.db
      .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?')
      .all(conversationId, limit) as unknown as MessageRow[];
    return rows.map((row) => this.messageFromRow(row));
  }

  getAllMessages(): Message[] {
    const rows = this.db
      .prepare('SELECT * FROM messages ORDER BY created_at ASC')
      .all() as unknown as MessageRow[];
    return rows.map((row) => this.messageFromRow(row));
  }

  getReadState(conversationId: string): ReadState | undefined {
    const row = this.db
      .prepare('SELECT * FROM read_state WHERE conversation_id = ?')
      .get(conversationId) as ReadStateRow | undefined;
    return row ? this.readStateFromRow(row) : undefined;
  }

  // ---------------------------------------------------------------------------
  // Full-text search
  // ---------------------------------------------------------------------------

  searchMessages(query: string, limit = 50): MessageSearchResult[] {
    const ftsQuery = this.buildFtsQuery(query);
    if (!ftsQuery) {
      return [];
    }

    const rows = this.db
      .prepare(
        `SELECT m.id AS messageId, m.conversation_id AS conversationId, m.text, rank
         FROM messages_fts fts
         JOIN messages m ON m.rowid = fts.rowid
         WHERE messages_fts MATCH ?
         ORDER BY rank
         LIMIT ?`,
      )
      .all(ftsQuery, limit) as unknown as MessageSearchResult[];

    return rows;
  }

  // ---------------------------------------------------------------------------
  // Bulk import/export
  // ---------------------------------------------------------------------------

  snapshot(): NormalizedState {
    const accounts = this.getAccounts();
    const contacts = this.getContacts();
    const conversations = this.getConversations();
    const messages = this.getAllMessages();

    return NormalizedStateSchema.parse({
      accounts: Object.fromEntries(accounts.map((account) => [account.id, account])),
      contacts: Object.fromEntries(contacts.map((contact) => [contact.id, contact])),
      conversations: Object.fromEntries(
        conversations.map((conversation) => [conversation.id, conversation]),
      ),
      messages: Object.fromEntries(messages.map((message) => [message.id, message])),
      activeConversationId: null,
    });
  }

  hydrate(state: NormalizedState): void {
    const parsed = NormalizedStateSchema.parse(state);

    this.runInTransaction(() => {
      this.clear();

      this.syncAccounts(Object.values(parsed.accounts));
      this.syncContacts(Object.values(parsed.contacts));
      this.syncConversations(Object.values(parsed.conversations));
      this.syncMessages(Object.values(parsed.messages));
    });
  }

  clear(): void {
    this.db.exec(`
      DELETE FROM messages;
      DELETE FROM read_state;
      DELETE FROM conversations;
      DELETE FROM contacts;
      DELETE FROM accounts;
    `);
  }

  // ---------------------------------------------------------------------------
  // Mappers
  // ---------------------------------------------------------------------------

  private accountFromRow(row: AccountRow): Account {
    return AccountSchema.parse({
      id: row.id,
      service: row.service,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  private contactFromRow(row: ContactRow): Contact {
    return ContactSchema.parse({
      id: row.id,
      accountId: row.account_id,
      serviceContactId: row.service_contact_id,
      displayName: row.display_name,
      username: row.username,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  private conversationFromRow(row: ConversationRow): Conversation {
    return ConversationSchema.parse({
      id: row.id,
      accountId: row.account_id,
      service: row.service,
      type: row.type,
      title: row.title,
      participantIds: JSON.parse(row.participant_ids) as string[],
      lastMessageId: row.last_message_id,
      unreadCount: row.unread_count,
      isArchived: intToBoolean(row.is_archived),
      isPinned: intToBoolean(row.is_pinned),
      isFavorite: intToBoolean(row.is_favorite),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  private messageFromRow(row: MessageRow): Message {
    return MessageSchema.parse({
      id: row.id,
      conversationId: row.conversation_id,
      accountId: row.account_id,
      senderId: row.sender_id,
      text: row.text,
      status: row.status,
      isFromMe: intToBoolean(row.is_from_me),
      replyToId: row.reply_to_id,
      reactions: JSON.parse(row.reactions) as Message['reactions'],
      attachments: JSON.parse(row.attachments) as Message['attachments'],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  private readStateFromRow(row: ReadStateRow): ReadState {
    return {
      conversationId: row.conversation_id,
      lastReadMessageId: row.last_read_message_id,
      lastReadAt: row.last_read_at,
      unreadCount: row.unread_count,
    };
  }

  private buildFtsQuery(query: string): string | undefined {
    const terms = query
      .trim()
      .split(/\s+/)
      .filter((term) => term.length > 0);

    if (terms.length === 0) {
      return undefined;
    }

    return terms
      .map((term) => {
        const escaped = term.replace(/"/g, '""');
        return `"${escaped}"*`;
      })
      .join(' ');
  }

  private runInTransaction(fn: () => void): void {
    this.db.exec('BEGIN');
    try {
      fn();
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }
}
