import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  BaileysConnection,
  type BridgeConnection,
  type BridgeCredentials,
  type BridgeMessageInfo,
  type BridgeRoomInfo,
  IMessageConnection,
  InstagramConnection,
  TelegramConnection,
} from './backend/index.js';
import { SqliteCache } from './cache/index.js';
import { registerCommands } from './commands/index.js';
import { registerExtras } from './extras/index.js';
import { MessageBus } from './shared/messages.js';
import type { Account, Contact, Conversation, Message, ServiceType } from './shared/types.js';
import { MessengerViewProvider } from './webview/MessengerViewProvider.js';
import { WebviewManager } from './webview/WebviewManager.js';
import { AccountWizardEngine, type WizardSession, type WizardStepId } from './wizard/index.js';

const WIZARD_SERVICES = [
  {
    service: 'whatsapp' as ServiceType,
    displayName: 'WhatsApp',
    requiresPhone: false,
    requiresMatrixLogin: false,
  },
  {
    service: 'telegram' as ServiceType,
    displayName: 'Telegram',
    requiresPhone: true,
    requiresMatrixLogin: false,
  },
  {
    service: 'instagram' as ServiceType,
    displayName: 'Instagram',
    requiresPhone: false,
    requiresMatrixLogin: false,
  },
  {
    service: 'imessage' as ServiceType,
    displayName: 'iMessage',
    requiresPhone: false,
    requiresMatrixLogin: false,
  },
];

function createAccount(id: string, service: ServiceType, username: string): Account {
  const now = new Date().toISOString();
  const displayName = username;

  return {
    id,
    service,
    username,
    displayName,
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

function roomToConversation(account: Account, room: BridgeRoomInfo): Conversation {
  const now = new Date().toISOString();
  return {
    id: stableUuid(room.roomId),
    accountId: account.id,
    service: account.service,
    type: room.isDM ? 'direct' : 'group',
    title: room.name ?? 'Unknown',
    participantIds: [stableUuid(room.roomId)],
    lastMessageId: null,
    unreadCount: 0,
    isArchived: false,
    isPinned: false,
    isFavorite: false,
    createdAt: now,
    updatedAt: room.lastEventTimestamp ? new Date(room.lastEventTimestamp).toISOString() : now,
  };
}

function senderToContact(account: Account, senderId: string, senderName: string): Contact {
  const now = new Date().toISOString();
  return {
    id: stableUuid(senderId),
    accountId: account.id,
    serviceContactId: senderId,
    displayName: senderName || senderId.split(':')[0].replace(/^@/, ''),
    username: senderId,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
  };
}

function bridgeMessageToMessage(
  account: Account,
  conversationId: string,
  msg: BridgeMessageInfo,
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

function createBridgeConnection(
  service: ServiceType,
  accountId: string,
  storageDir: string,
): BridgeConnection {
  switch (service) {
    case 'whatsapp':
      return new BaileysConnection(accountId, storageDir);
    case 'telegram':
      return new TelegramConnection(accountId, storageDir);
    case 'instagram':
      return new InstagramConnection(accountId);
    case 'imessage':
      return new IMessageConnection(accountId);
    default:
      throw new Error(`Service ${service} is not supported by a direct bridge yet`);
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const manager = new WebviewManager(context.extensionUri);
  const bus = new MessageBus();
  const cache = createCache(context);
  const connections = new Map<string, BridgeConnection>();
  const pendingConnections = new Map<string, BridgeConnection>();
  const wizardEngine = new AccountWizardEngine();

  const globalStorageDir = context.globalStorageUri?.fsPath ?? context.extensionPath;
  const conversationToRoom = new Map<string, string>();

  // Wire the typed message bus to the webview surface.
  manager.onDidReceiveRequest((request) => {
    void bus.handleRequest(request).then((response) => manager.postResponse(response));
  });

  // Register request handlers for the webview to call.
  bus.registerHandler('ping', () => ({ ok: true }));
  bus.registerHandler('getAccounts', () => ({ accounts: cache?.getAccounts() ?? [] }));
  bus.registerHandler('removeAccount', ({ accountId }) => {
    const connection = connections.get(accountId);
    void connection?.disconnect();
    connections.delete(accountId);

    const account = cache?.getAccount(accountId);
    if (account) {
      if (account.service === 'whatsapp') {
        fs.rmSync(path.join(globalStorageDir, `baileys-${accountId}`), {
          recursive: true,
          force: true,
        });
      } else if (account.service === 'telegram') {
        fs.rmSync(path.join(globalStorageDir, `telegram-${accountId}`), {
          recursive: true,
          force: true,
        });
      }
      cache?.deleteAccount(accountId);
    }

    manager.postEvent({
      type: 'event',
      eventType: 'accounts',
      payload: cache?.getAccounts() ?? [],
    });
    manager.postEvent({
      type: 'event',
      eventType: 'conversations',
      payload: cache?.getConversations() ?? [],
    });
    return { removed: true };
  });
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

  bus.registerHandler('sendMessage', async ({ conversationId, text }) => {
    const conversation = cache?.getConversation(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const connection = connections.get(conversation.accountId);
    if (!connection) {
      throw new Error('Account not connected');
    }

    const roomId = conversationToRoom.get(conversationId);
    if (!roomId) {
      throw new Error('Room mapping not found');
    }

    const info = await connection.sendMessage(roomId, text);
    ingestMessages(conversation.accountId, roomId, [info]);

    return { message: info };
  });

  function syncAccountStatus(accountId: string, status: Account['status'], error?: string): void {
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
  }

  function ingestMessages(accountId: string, roomId: string, messages: BridgeMessageInfo[]): void {
    const account = cache?.getAccount(accountId);
    if (!account || messages.length === 0) {
      return;
    }

    const conversationId = stableUuid(roomId);
    conversationToRoom.set(conversationId, roomId);
    const contacts = new Map<string, Contact>();
    const dbMessages: Message[] = [];

    for (const msg of messages) {
      if (!contacts.has(msg.senderId)) {
        contacts.set(msg.senderId, senderToContact(account, msg.senderId, msg.senderName));
      }
      dbMessages.push(bridgeMessageToMessage(account, conversationId, msg));
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
  }

  function wireBridgeEvents(connection: BridgeConnection): void {
    connection.on('statusChanged', ({ accountId, status, error }) => {
      console.log(`[mssgs:${connection.service}] status ${status}`, error ?? '');
      syncAccountStatus(accountId, status, error);
    });

    connection.on('authPrompt', ({ accountId, prompt }) => {
      // Find the setup session that owns this pending connection.
      for (const [setupId, pending] of pendingConnections.entries()) {
        if (pending.accountId === accountId) {
          manager.postEvent({
            type: 'event',
            eventType: 'wizardAuthPrompt',
            payload: { setupId, prompt },
          });
          return;
        }
      }
    });

    connection.on('roomsChanged', ({ accountId, rooms }) => {
      const account = cache?.getAccount(accountId);
      if (!account) {
        return;
      }

      const conversations = rooms.map((room) => {
        const conversation = roomToConversation(account, room);
        conversationToRoom.set(conversation.id, room.roomId);
        return conversation;
      });
      const contacts = rooms.map((room) =>
        senderToContact(account, room.roomId, room.name ?? 'Unknown'),
      );

      cache?.syncContacts(contacts);
      cache?.syncConversations(conversations);
      manager.postEvent({
        type: 'event',
        eventType: 'conversations',
        payload: cache?.getConversations() ?? conversations,
      });
    });

    connection.on('messagesChanged', ({ accountId, roomId, messages }) => {
      ingestMessages(accountId, roomId, messages);
    });

    connection.on('error', ({ accountId, error }) => {
      console.error(`[mssgs:${connection.service}] error:`, error);
      void vscode.window.showErrorMessage(`mssgs error: ${error}`);
      syncAccountStatus(accountId, 'error', error);
    });
  }

  function getAccountUsername(session: WizardSession): string {
    switch (session.service) {
      case 'telegram':
        return session.data.phoneNumber?.trim() || 'Telegram';
      case 'instagram':
        return session.data.username?.trim() || 'Instagram';
      case 'imessage':
        return 'iMessage';
      default:
        return 'WhatsApp';
    }
  }

  function finalizeAccount(session: WizardSession, connection: BridgeConnection): void {
    const account = createAccount(session.setupId, session.service, getAccountUsername(session));
    cache?.syncAccount(account);
    connections.set(session.setupId, connection);
    pendingConnections.delete(session.setupId);
    manager.postEvent({
      type: 'event',
      eventType: 'accounts',
      payload: cache?.getAccounts() ?? [account],
    });
  }

  // Account setup wizard handlers.
  bus.registerHandler('getSupportedServices', () => ({ services: WIZARD_SERVICES }));

  bus.registerHandler('startAccountSetup', ({ service }) => {
    const result = wizardEngine.start(service as ServiceType);
    const connection = createBridgeConnection(
      service as ServiceType,
      result.setupId,
      globalStorageDir,
    );
    wireBridgeEvents(connection);
    pendingConnections.set(result.setupId, connection);

    // Services that do not need upfront credentials can start pairing immediately.
    if (service === 'whatsapp' || service === 'imessage') {
      void connection.connect().catch(() => {
        // Errors are emitted as events above.
      });
    }

    return { setupId: result.setupId, step: result.step };
  });

  bus.registerHandler('submitAccountSetupStep', ({ setupId, stepId, data }) => {
    const connection = pendingConnections.get(setupId);
    const credentials: BridgeCredentials = data ?? {};

    if (connection) {
      if (stepId === 'phone-number') {
        void connection.connect(credentials).catch(() => {
          // Errors are emitted as events above.
        });
      } else if (stepId === 'credentials') {
        void connection.connect(credentials).catch(() => {
          // Errors are emitted as events above.
        });
      } else if (stepId === 'verify-code' && connection.submitCredentials) {
        void connection.submitCredentials(credentials).catch(() => {
          // Errors are emitted as events above.
        });
      }
    }

    const result = wizardEngine.submit(setupId, stepId as WizardStepId, data ?? {});

    if (result.done && connection) {
      const session = wizardEngine.status(setupId);
      if (session) {
        finalizeAccount(session, connection);
      }
    }

    return result;
  });

  bus.registerHandler('cancelAccountSetup', ({ setupId }) => {
    const connection = pendingConnections.get(setupId);
    void connection?.disconnect();
    pendingConnections.delete(setupId);
    return wizardEngine.cancel(setupId);
  });

  bus.registerHandler('getAccountSetupStatus', ({ setupId }) => {
    const session = wizardEngine.status(setupId);
    if (!session) {
      return {
        setupId,
        service: 'whatsapp' as ServiceType,
        status: 'error' as const,
        step: undefined,
        error: 'Setup session not found',
      };
    }

    return {
      setupId,
      service: session.service,
      status: session.status,
      step:
        session.status === 'active'
          ? {
              stepId: session.currentStepId,
              title: '',
              description: '',
              fields: [],
            }
          : undefined,
      error: session.error,
    };
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
