import Database from 'better-sqlite3';
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
  private readonly db: Database.Database;

  constructor(dbPath: string, options: SqliteCacheOptions = {}) {
    this.db = new Database(dbPath);

    if (options.enableWal !== false && dbPath !== ':memory:') {
      this.db.pragma('journal_mode = WAL');
    }

    this.db.pragma('foreign_keys = ON');
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
    const txn = this.db.transaction((items: Account[]) => {
      for (const account of items) {
        this.syncAccount(account);
      }
    });
    txn(accounts);
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
    const txn = this.db.transaction((items: Contact[]) => {
      for (const contact of items) {
        this.syncContact(contact);
      }
    });
    txn(contacts);
  }

  syncConversation(conversation: Conversation): void {
    const parsed = ConversationSchema.parse(conversation);
    const stmt = this.db.prepare(
      `INSERT INTO conversations (id, account_id, type, title, participant_ids, last_message_id, unread_count, is_archived, is_pinned, is_favorite, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         account_id=excluded.account_id,
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
    const txn = this.db.transaction((items: Conversation[]) => {
      for (const conversation of items) {
        this.syncConversation(conversation);
      }
    });
    txn(conversations);
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
    const txn = this.db.transaction((items: Message[]) => {
      for (const message of items) {
        this.syncMessage(message);
      }
    });
    txn(messages);
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
    const row = this.db
      .prepare<[string], AccountRow>('SELECT * FROM accounts WHERE id = ?')
      .get(id);
    return row ? this.accountFromRow(row) : undefined;
  }

  getAccounts(): Account[] {
    const rows = this.db
      .prepare<[], AccountRow>('SELECT * FROM accounts ORDER BY display_name')
      .all();
    return rows.map((row) => this.accountFromRow(row));
  }

  getContact(id: string): Contact | undefined {
    const row = this.db
      .prepare<[string], ContactRow>('SELECT * FROM contacts WHERE id = ?')
      .get(id);
    return row ? this.contactFromRow(row) : undefined;
  }

  getContacts(): Contact[] {
    const rows = this.db
      .prepare<[], ContactRow>('SELECT * FROM contacts ORDER BY display_name')
      .all();
    return rows.map((row) => this.contactFromRow(row));
  }

  getConversation(id: string): Conversation | undefined {
    const row = this.db
      .prepare<[string], ConversationRow>('SELECT * FROM conversations WHERE id = ?')
      .get(id);
    return row ? this.conversationFromRow(row) : undefined;
  }

  getConversations(): Conversation[] {
    const rows = this.db
      .prepare<[], ConversationRow>('SELECT * FROM conversations ORDER BY updated_at DESC')
      .all();
    return rows.map((row) => this.conversationFromRow(row));
  }

  getMessage(id: string): Message | undefined {
    const row = this.db
      .prepare<[string], MessageRow>('SELECT * FROM messages WHERE id = ?')
      .get(id);
    return row ? this.messageFromRow(row) : undefined;
  }

  getMessagesForConversation(conversationId: string, limit = 200): Message[] {
    const rows = this.db
      .prepare<[string, number], MessageRow>(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?',
      )
      .all(conversationId, limit);
    return rows.map((row) => this.messageFromRow(row));
  }

  getAllMessages(): Message[] {
    const rows = this.db
      .prepare<[], MessageRow>('SELECT * FROM messages ORDER BY created_at ASC')
      .all();
    return rows.map((row) => this.messageFromRow(row));
  }

  getReadState(conversationId: string): ReadState | undefined {
    const row = this.db
      .prepare<[string], ReadStateRow>('SELECT * FROM read_state WHERE conversation_id = ?')
      .get(conversationId);
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
      .prepare<[string, number], MessageSearchResult>(
        `SELECT m.id AS messageId, m.conversation_id AS conversationId, m.text, rank
         FROM messages_fts fts
         JOIN messages m ON m.rowid = fts.rowid
         WHERE messages_fts MATCH ?
         ORDER BY rank
         LIMIT ?`,
      )
      .all(ftsQuery, limit);

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

    const txn = this.db.transaction(() => {
      this.clear();

      this.syncAccounts(Object.values(parsed.accounts));
      this.syncContacts(Object.values(parsed.contacts));
      this.syncConversations(Object.values(parsed.conversations));
      this.syncMessages(Object.values(parsed.messages));
    });

    txn();
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
}
