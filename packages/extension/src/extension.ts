import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { ConnectionManager } from './backend/ConnectionManager.js';
import { DefaultMatrixClientFactory } from './backend/matrixClient.js';
import type { MatrixMessageInfo, MatrixRoomInfo } from './backend/types.js';
import { SqliteCache } from './cache/index.js';
import { registerCommands } from './commands/index.js';
import { registerExtras } from './extras/index.js';
import { MessageBus } from './shared/messages.js';
import type { Account, Contact, Conversation, Message, ServiceType } from './shared/types.js';
import { MessengerViewProvider } from './webview/MessengerViewProvider.js';
import { WebviewManager } from './webview/WebviewManager.js';
import { AccountWizardEngine, registerAccountWizardHandlers } from './wizard/index.js';

function createAccount(service: ServiceType, username: string): Account {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    service,
    username,
    displayName: username,
    avatarUrl: null,
    status: 'connecting',
    createdAt: now,
    updatedAt: now,
  };
}

function stableUuid(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(1, 4)}-a${hex.slice(0, 3)}-${hex.repeat(2).slice(0, 12)}`;
}

function getHomeserverUrl(): string {
  return (
    vscode.workspace.getConfiguration('mssgs').get<string>('homeserverUrl') ??
    'https://matrix.beeper.com'
  );
}

function roomToConversation(
  account: Account,
  room: MatrixRoomInfo,
  contactId: string,
): Conversation {
  const now = new Date().toISOString();
  return {
    id: stableUuid(room.roomId),
    accountId: account.id,
    service: account.service,
    type: room.isDM ? 'direct' : 'group',
    title: room.name ?? 'Unknown',
    participantIds: [contactId],
    lastMessageId: null,
    unreadCount: 0,
    isArchived: false,
    isPinned: false,
    isFavorite: false,
    createdAt: now,
    updatedAt: room.lastEventTimestamp ? new Date(room.lastEventTimestamp).toISOString() : now,
  };
}

function senderToContact(account: Account, senderId: string): Contact {
  const now = new Date().toISOString();
  return {
    id: stableUuid(senderId),
    accountId: account.id,
    serviceContactId: senderId,
    displayName: senderId.split(':')[0].replace(/^@/, ''),
    username: senderId,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
  };
}

function matrixMessageToMessage(
  account: Account,
  conversationId: string,
  msg: MatrixMessageInfo,
): Message {
  return {
    id: stableUuid(msg.id),
    conversationId,
    accountId: account.id,
    senderId: stableUuid(msg.senderId),
    text: msg.text,
    status: msg.isFromMe ? 'sent' : 'delivered',
    isFromMe: msg.isFromMe,
    replyToId: null,
    reactions: [],
    attachments: [],
    createdAt: new Date(msg.timestamp).toISOString(),
    updatedAt: new Date(msg.timestamp).toISOString(),
  };
}

function createCache(context: vscode.ExtensionContext): SqliteCache | undefined {
  if (!context.globalStorageUri) {
    return undefined;
  }

  fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
  const dbPath = vscode.Uri.joinPath(context.globalStorageUri, 'mssgs.sqlite').fsPath;
  return new SqliteCache(dbPath);
}

export function activate(context: vscode.ExtensionContext): void {
  const manager = new WebviewManager(context.extensionUri);
  const bus = new MessageBus();
  const cache = createCache(context);

  const connectionManager = new ConnectionManager(new DefaultMatrixClientFactory(), {
    cryptoInitializer: async (client) => {
      const sdkClient = client as unknown as {
        initRustCrypto?(args?: { useIndexedDB?: boolean }): Promise<void>;
      };
      if (sdkClient.initRustCrypto) {
        await sdkClient.initRustCrypto({ useIndexedDB: false });
      }
    },
  });

  // Wire the typed message bus to the webview surface.
  manager.onDidReceiveRequest((request) => {
    void bus.handleRequest(request).then((response) => manager.postResponse(response));
  });

  // Register request handlers for the webview to call.
  bus.registerHandler('ping', () => ({ ok: true }));
  bus.registerHandler('getAccounts', () => ({ accounts: cache?.getAccounts() ?? [] }));
  bus.registerHandler('getConversations', () => ({
    conversations: cache?.getConversations() ?? [],
  }));
  bus.registerHandler('getMessages', ({ conversationId }) => ({
    messages: cache?.getMessagesForConversation(conversationId) ?? [],
  }));
  bus.registerHandler('archiveConversation', ({ conversationId }) => {
    const conversation = cache?.getConversation(conversationId);
    if (conversation) {
      cache?.syncConversation({ ...conversation, isArchived: true });
    }
    manager.postEvent({
      type: 'event',
      eventType: 'conversations',
      payload: cache?.getConversations() ?? [],
    });
    return { archived: Boolean(conversation) };
  });
  bus.registerHandler('markAllAsRead', () => ({ marked: 0 }));
  bus.registerHandler('searchMessages', ({ query }) => ({
    results: cache?.searchMessages(query) ?? [],
  }));

  // Register account setup wizard handlers.
  registerAccountWizardHandlers({
    bus,
    engine: new AccountWizardEngine(),
    getHomeserverUrl,
    onComplete: async (session) => {
      const username = session.data.username.trim();
      const password = session.data.password;
      const userId = username.startsWith('@') ? username : `@${username}:beeper.com`;
      const account = createAccount(session.service, userId);

      cache?.syncAccount(account);
      manager.postEvent({
        type: 'event',
        eventType: 'accounts',
        payload: cache?.getAccounts() ?? [account],
      });

      await connectionManager.addAccount({
        service: account.service,
        displayName: account.displayName,
        credentials: {
          homeserverUrl: getHomeserverUrl(),
          userId,
          password,
        },
      });

      void connectionManager.connect(account.id).catch(() => {
        // Errors are emitted as events below.
      });
    },
  });

  // Sync backend events into the cache and broadcast to the webview.
  connectionManager.on('statusChanged', ({ accountId, status, error }) => {
    const account = cache?.getAccount(accountId);
    if (!account) {
      return;
    }

    const updated: Account = {
      ...account,
      status,
      updatedAt: new Date().toISOString(),
    };
    cache?.syncAccount(updated);
    manager.postEvent({
      type: 'event',
      eventType: 'accounts',
      payload: cache?.getAccounts() ?? [updated],
    });

    if (error) {
      void vscode.window.showErrorMessage(`mssgs connection error: ${error}`);
    }
  });

  connectionManager.on('roomsChanged', ({ accountId, rooms }) => {
    const account = cache?.getAccount(accountId);
    if (!account) {
      return;
    }

    const contacts: Contact[] = [];
    const conversations: Conversation[] = [];

    for (const room of rooms) {
      const contactId = stableUuid(room.roomId);
      contacts.push({
        id: contactId,
        accountId: account.id,
        serviceContactId: room.roomId,
        displayName: room.name ?? 'Unknown',
        username: room.roomId,
        avatarUrl: room.avatarUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      conversations.push(roomToConversation(account, room, contactId));
    }

    cache?.syncContacts(contacts);
    cache?.syncConversations(conversations);
    manager.postEvent({
      type: 'event',
      eventType: 'conversations',
      payload: cache?.getConversations() ?? conversations,
    });
  });

  connectionManager.on('messagesChanged', ({ accountId, roomId, messages }) => {
    const account = cache?.getAccount(accountId);
    if (!account || messages.length === 0) {
      return;
    }

    const conversationId = stableUuid(roomId);
    const contacts = new Map<string, Contact>();
    const dbMessages: Message[] = [];

    for (const msg of messages) {
      if (!contacts.has(msg.senderId)) {
        contacts.set(msg.senderId, senderToContact(account, msg.senderId));
      }
      dbMessages.push(matrixMessageToMessage(account, conversationId, msg));
    }

    cache?.syncContacts(Array.from(contacts.values()));
    cache?.syncMessages(dbMessages);

    const conversation = cache?.getConversation(conversationId);
    const lastMessage = dbMessages[dbMessages.length - 1];
    if (conversation && lastMessage) {
      cache?.syncConversation({
        ...conversation,
        lastMessageId: lastMessage.id,
        updatedAt: lastMessage.createdAt,
      });
    }

    manager.postEvent({
      type: 'event',
      eventType: 'conversations',
      payload: cache?.getConversations() ?? [],
    });
    manager.postEvent({
      type: 'event',
      eventType: 'messages',
      payload: cache?.getMessagesForConversation(conversationId) ?? dbMessages,
    });
  });

  connectionManager.on('error', ({ error }) => {
    void vscode.window.showErrorMessage(`mssgs error: ${error}`);
  });

  // Register Beeper-like extras (shortcuts, palette, reminders, scheduling).
  const extrasDisposables = registerExtras({ bus, manager, cache });

  // Register the activity-bar webview view.
  const viewProvider = new MessengerViewProvider(manager);
  const viewRegistration = vscode.window.registerWebviewViewProvider(
    'mssgs.messenger',
    viewProvider,
    { webviewOptions: { retainContextWhenHidden: true } },
  );

  // Register command-palette commands.
  const commandDisposables = registerCommands(manager);

  // Send theme updates to the webview when VSCode theme changes.
  const themeChangeDisposable = vscode.window.onDidChangeActiveColorTheme(() => {
    manager.postThemeEvent();
  });

  context.subscriptions.push(
    viewRegistration,
    themeChangeDisposable,
    ...commandDisposables,
    ...extrasDisposables,
  );
}

export function deactivate(): void {
  // no-op
}
